"""
Provider-Independent LLM & Vision Client for MediLens AI.
Supports Google Gemini, Anthropic Claude, and OpenAI via unified interface.
Provides deterministic grounded fallback when external API keys are not supplied.
Generates plain-language medical explanations in simple English and Hindi.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import logger
from app.services.rag import medical_rag


class LLMAuthenticationError(Exception):
    """Raised when the LLM provider rejects the API key or authentication credentials."""
    pass


SYSTEM_MEDICAL_PROMPT = """You are MediLens AI — an educational, patient-friendly medical explanation assistant.
CRITICAL SAFETY BOUNDARIES:
1. NEVER diagnose a medical condition or confirm a diagnosis.
2. NEVER prescribe drugs, recommend dose changes, or tell a patient to start or stop medication.
3. ALWAYS remind the user to consult their licensed doctor or healthcare team.
4. Translate complex medical terms and lab metrics into clear, gentle English or Hindi.
5. Emphasize printed reference ranges provided on the report.
6. If emergency warning signs are present, prioritize immediate emergency medical care.
7. Connect explanations to the patient's existing health history where relevant in an educational manner.
"""


class BaseLLMAdapter(ABC):
    @abstractmethod
    async def generate_explanation(self, prompt: str, context: str | None = None) -> str:
        pass


class GeminiAdapter(BaseLLMAdapter):
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.model = settings.PRIMARY_MODEL

    async def generate_explanation(self, prompt: str, context: str | None = None) -> str:
        if not self.api_key:
            return ""
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{SYSTEM_MEDICAL_PROMPT}\n\nContext:\n{context or ''}\n\nPatient Query/Report:\n{prompt}"}]}
            ]
        }
        max_retries = 3
        timeout = httpx.Timeout(15.0, connect=5.0)

        for attempt in range(max_retries):
            try:
                async with httpx.AsyncClient(timeout=timeout) as client:
                    resp = await client.post(url, json=payload)

                    # 1. Check for Authentication / Bad Key errors
                    if resp.status_code in (400, 401, 403):
                        err_text = resp.text.lower()
                        if "api_key_invalid" in err_text or "invalid_argument" in err_text or "unregistered" in err_text or resp.status_code in (401, 403):
                            logger.error("Gemini API authentication failed: invalid API key (HTTP %s): %s", resp.status_code, resp.text)
                            raise LLMAuthenticationError("Invalid AI provider API key. Please verify your GEMINI_API_KEY configuration.")
                        logger.warning("Gemini API returned status %s: %s", resp.status_code, resp.text)
                        return ""

                    # 2. Check for Success
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates and candidates[0].get("content", {}).get("parts"):
                            return candidates[0]["content"]["parts"][0]["text"]
                        return ""

                    # 3. Check for Transient / Rate Limit errors (429, 500, 502, 503, 504) -> Backoff retry
                    if resp.status_code in (429, 500, 502, 503, 504):
                        if attempt < max_retries - 1:
                            delay = 0.5 * (2 ** attempt)
                            logger.info("Transient Gemini error %s. Retrying in %ss (attempt %s/%s)...", resp.status_code, delay, attempt + 1, max_retries)
                            await asyncio.sleep(delay)
                            continue
                        logger.warning("Gemini API failed after %s retries with status %s", max_retries, resp.status_code)
                        return ""

                    logger.warning("Gemini API returned status %s: %s", resp.status_code, resp.text)
                    return ""

            except (httpx.TimeoutException, httpx.NetworkError) as net_err:
                if attempt < max_retries - 1:
                    delay = 0.5 * (2 ** attempt)
                    logger.info("Network timeout/error during LLM call (%s). Retrying in %ss...", net_err, delay)
                    await asyncio.sleep(delay)
                    continue
                logger.warning("LLM call timed out after %s retries: %s", max_retries, str(net_err))
                return ""
            except LLMAuthenticationError:
                raise
            except Exception as exc:
                logger.warning("Unexpected LLM error: %s", str(exc))
                return ""
        return ""


class LLMClient:
    def __init__(self):
        self.provider = settings.LLM_PROVIDER.lower()
        self.gemini_key = settings.GEMINI_API_KEY
        self.claude_key = settings.ANTHROPIC_API_KEY
        self.openai_key = settings.OPENAI_API_KEY

        if self.provider == "gemini" and self.gemini_key:
            self.adapter: BaseLLMAdapter | None = GeminiAdapter(self.gemini_key)
        else:
            self.adapter = None

    async def explain_report(
        self,
        title: str,
        findings: list[dict[str, Any]],
        medicines: list[dict[str, Any]] | None = None,
        language: str = "en",
        user_conditions: list[str] | None = None,
    ) -> str:
        """
        Generates simple plain-language summary for the patient in English or Hindi.
        """
        en_summary, hi_summary = await self.explain_report_bilingual(
            title=title,
            findings=findings,
            medicines=medicines,
            user_conditions=user_conditions,
        )
        return hi_summary if language == "hi" else en_summary

    async def explain_report_bilingual(
        self,
        title: str,
        findings: list[dict[str, Any]],
        medicines: list[dict[str, Any]] | None = None,
        user_conditions: list[str] | None = None,
    ) -> tuple[str, str]:
        """
        Generates both English and Hindi plain-language summaries for seamless instant switching.
        """
        medicines = medicines or []
        conditions_list = user_conditions or []

        # Try external AI if configured
        ai_en = ""
        ai_hi = ""
        auth_warning_en = ""
        auth_warning_hi = ""
        if self.adapter:
            try:
                context_str = "Findings:\n" + "\n".join(
                    [f"- {f.get('testName')}: {f.get('value')} {f.get('unit')} (Ref: {f.get('referenceRange')})" for f in findings]
                )
                if medicines:
                    context_str += "\nPrescribed Medicines:\n" + "\n".join(
                        [f"- {m.get('name')} {m.get('strength')}: {m.get('frequency')} ({m.get('withFood')})" for m in medicines]
                    )
                if conditions_list:
                    context_str += f"\nPatient Medical History: {', '.join(conditions_list)}"

                ai_en = await self.adapter.generate_explanation(
                    f"Explain '{title}' in simple, patient-friendly English without jargon.",
                    context=context_str,
                )
                ai_hi = await self.adapter.generate_explanation(
                    f"Explain '{title}' in simple, gentle conversational Hindi (Devanagari script).",
                    context=context_str,
                )
            except LLMAuthenticationError as auth_err:
                logger.error("External AI Provider authentication failure: %s", str(auth_err))
                auth_warning_en = (
                    "⚠️ Notice: The configured AI provider API key is invalid or unauthorized. "
                    "MediLens AI has protected your workflow and safely generated explanations using grounded clinical reference knowledge."
                )
                auth_warning_hi = (
                    "⚠️ सूचना: AI प्रोवाइडर API कुंजी अमान्य है। "
                    "MediLens AI ने आपके सत्र को सुरक्षित रखते हुए प्रमाणित क्लिनिकल ज्ञान के आधार पर विश्लेषण प्रस्तुत किया है।"
                )
            except Exception as e:
                logger.warning(f"External LLM call failed, falling back to grounded RAG: {str(e)}")

        # Build Grounded RAG English Summary
        en_blocks: list[str] = []
        hi_blocks: list[str] = []

        # 1. Biomarkers / Lab Findings — parallel RAG lookups for speed
        if findings:
            en_biomarkers: list[str] = []
            hi_biomarkers: list[str] = []
            names = [f.get("testName", "") for f in findings]
            rag_results = await asyncio.gather(
                *[medical_rag.get_grounded_explanation(n) for n in names]
            )
            for f, rag_info in zip(findings, rag_results):
                name = f.get("testName", "")
                val = f.get("value", "")
                unit = f.get("unit", "")
                status = f.get("status", "normal")
                ref_range = f.get("referenceRange", "")

                name_hi = rag_info.get("name_hi") or name
                exp_en = rag_info.get("plain_explanation", "")
                exp_hi = rag_info.get("plain_explanation_hi", exp_en)

                if status in ("high", "elevated"):
                    en_biomarkers.append(
                        f"• {name} ({val} {unit}): Your reading is slightly above the reference range ({ref_range}). {exp_en}"
                    )
                    hi_biomarkers.append(
                        f"• {name_hi} ({val} {unit}): यह स्तर सामान्य सीमा ({ref_range}) से थोड़ा सा बढ़ा हुआ है। {exp_hi}"
                    )
                elif status == "low":
                    en_biomarkers.append(
                        f"• {name} ({val} {unit}): Your reading is below the reference range ({ref_range}). {exp_en}"
                    )
                    hi_biomarkers.append(
                        f"• {name_hi} ({val} {unit}): यह स्तर सामान्य सीमा ({ref_range}) से कम है। {exp_hi}"
                    )
                else:
                    en_biomarkers.append(
                        f"• {name} ({val} {unit}): Your reading is within the normal reference range ({ref_range}). {exp_en}"
                    )
                    hi_biomarkers.append(
                        f"• {name_hi} ({val} {unit}): यह स्तर सामान्य सीमा ({ref_range}) के भीतर है। {exp_hi}"
                    )

            en_blocks.append("🔬 Key Lab Findings:\n" + "\n\n".join(en_biomarkers))
            hi_blocks.append("🔬 मुख्य जांच परिणाम (लैब टेस्ट):\n" + "\n\n".join(hi_biomarkers))

        # 2. Prescriptions / Medicines
        if medicines:
            en_meds: list[str] = []
            hi_meds: list[str] = []
            for m in medicines:
                m_name = m.get("name", "Medicine")
                m_strength = m.get("strength", "")
                m_freq = m.get("frequency", "As directed")
                m_food = m.get("withFood", "any")
                m_used_en = m.get("usedFor", "")
                m_used_hi = m.get("usedForHi", m_used_en)
                m_info_en = m.get("generalInfo", "")
                m_info_hi = m.get("generalInfoHi", m_info_en)

                food_note_en = (
                    "take after meals" if m_food == "after"
                    else "take before meals on an empty stomach" if m_food == "before"
                    else "take with meals" if m_food == "with"
                    else "take with water"
                )
                food_note_hi = (
                    "खाने के बाद लें" if m_food == "after"
                    else "खाली पेट या खाने से पहले लें" if m_food == "before"
                    else "खाने के साथ लें" if m_food == "with"
                    else "पानी के साथ लें"
                )

                en_meds.append(
                    f"• {m_name} ({m_strength}) — {m_freq}:\n"
                    f"  Purpose: {m_used_en}\n"
                    f"  How to take: {m_info_en} Best rule: {food_note_en}."
                )
                hi_meds.append(
                    f"• {m_name} ({m_strength}) — {m_freq}:\n"
                    f"  उपयोग: {m_used_hi}\n"
                    f"  लेने का तरीका: {m_info_hi} सही समय: {food_note_hi}।"
                )

            en_blocks.append("💊 Prescribed Medications:\n" + "\n\n".join(en_meds))
            hi_blocks.append("💊 डॉक्टर द्वारा लिखी गई दवाएं:\n" + "\n\n".join(hi_meds))

        # 3. Health Profile Connection
        if conditions_list:
            conds_str = ", ".join([c.replace("-", " ").title() for c in conditions_list])
            en_blocks.append(
                f"🏥 Health Profile Connection:\n"
                f"Given your recorded medical history ({conds_str}), keeping these readings and medications aligned with "
                f"your physician's treatment plan is key to maintaining long-term wellness and preventing complications."
            )
            hi_blocks.append(
                f"🏥 आपके स्वास्थ्य रिकॉर्ड के अनुसार:\n"
                f"आपकी प्रोफाइल में दर्ज स्थिति ({conds_str}) को ध्यान में रखते हुए, इन परिणामों और दवाओं को अपने डॉक्टर "
                f"के निर्देशानुसार नियमित रखना आपकी सेहत को सुरक्षित रखने के लिए बेहद महत्वपूर्ण है।"
            )

        # 4. Closing Disclaimer
        en_final = (
            (ai_en + "\n\n") if ai_en else (
                "Here is your easy-to-understand health summary grounded in MedlinePlus and NIH guidelines:\n\n"
                + "\n\n".join(en_blocks)
                + "\n\nNote: MediLens AI provides educational information only and does not replace medical advice or prescription from your doctor."
            )
        )
        if auth_warning_en:
            en_final = f"{auth_warning_en}\n\n{en_final}"

        hi_final = (
            (ai_hi + "\n\n") if ai_hi else (
                "यहाँ आपकी रिपोर्ट का आसान और सरल हिंदी सारांश दिया गया है:\n\n"
                + "\n\n".join(hi_blocks)
                + "\n\nनोट: MediLens AI केवल स्वास्थ्य शिक्षा और जानकारी के लिए है। किसी भी दवा या उपचार में बदलाव से पहले हमेशा अपने डॉक्टर से परामर्श करें।"
            )
        )
        if auth_warning_hi:
            hi_final = f"{auth_warning_hi}\n\n{hi_final}"

        return en_final, hi_final

        return en_final, hi_final


llm_client = LLMClient()
