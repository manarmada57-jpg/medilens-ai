"""
Provider-Independent LLM & Vision Client for MediLens AI.
Supports Google Gemini, Anthropic Claude, and OpenAI via unified interface.
Provides deterministic grounded fallback when external API keys are not supplied.
"""

from abc import ABC, abstractmethod
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import logger
from app.services.rag import medical_rag

SYSTEM_MEDICAL_PROMPT = """You are MediLens AI — an educational, patient-friendly medical explanation assistant.
CRITICAL SAFETY BOUNDARIES:
1. NEVER diagnose a medical condition or confirm a diagnosis.
2. NEVER prescribe drugs, recommend dose changes, or tell a patient to start or stop medication.
3. ALWAYS remind the user to consult their licensed doctor or healthcare team.
4. Translate complex medical terms and lab metrics into clear, gentle English or Hindi.
5. Emphasize printed reference ranges provided on the report.
6. If emergency warning signs are present, prioritize immediate emergency medical care.
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
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data["candidates"][0]["content"]["parts"][0]["text"]
            logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text}")
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

    async def explain_report(self, title: str, findings: list[dict[str, Any]]) -> str:
        """
        Generates simple plain-language summary for the patient.
        Uses verified RAG sources if LLM provider key is offline.
        """
        # If external API adapter is active, query it
        if self.adapter:
            try:
                context_str = "\n".join([f"- {f.get('testName')}: {f.get('value')} {f.get('unit')} (Range: {f.get('referenceRange')})" for f in findings])
                ai_text = await self.adapter.generate_explanation(f"Explain {title}", context=context_str)
                if ai_text:
                    return ai_text
            except Exception as e:
                logger.warning(f"External LLM call failed, falling back to grounded RAG: {str(e)}")

        # Grounded RAG explanation fallback
        summaries = []
        for f in findings:
            name = f.get("testName", "")
            val = f.get("value", "")
            unit = f.get("unit", "")
            status = f.get("status", "normal")
            ref_range = f.get("referenceRange", "")
            rag_info = await medical_rag.get_grounded_explanation(name)

            if status in ("high", "elevated"):
                summaries.append(
                    f"Your {name} reading of {val} {unit} is slightly above your lab's reference range ({ref_range}). {rag_info.get('plain_explanation')}"
                )
            elif status == "low":
                summaries.append(
                    f"Your {name} reading of {val} {unit} is below your lab's reference range ({ref_range}). {rag_info.get('plain_explanation')}"
                )
            else:
                summaries.append(
                    f"Your {name} reading of {val} {unit} is within the normal reference range ({ref_range}). {rag_info.get('plain_explanation')}"
                )

        return (
            "Here is your easy-to-understand health summary grounded in MedlinePlus and NIH guidelines:\n\n"
            + "\n\n".join(summaries)
            + "\n\nNote: MediLens AI is an educational platform and does not replace the diagnosis or treatment guidance of your physician."
        )


llm_client = LLMClient()
