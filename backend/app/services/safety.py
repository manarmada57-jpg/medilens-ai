"""
AI Safety, Prompt Injection Defense, and Emergency Warning Signs Scanner.
Enforces non-negotiable boundaries:
- Never diagnose, prescribe, change medication doses, or override a doctor
- Detects emergency warning signs before generating lengthy text
- Defends against prompt injection attempts in uploaded medical documents
"""

import re
from typing import Any

PROMPT_INJECTION_PATTERNS = [
    r"ignore (all )?(previous|prior) instructions",
    r"disregard (all )?(previous|system) instructions",
    r"you are now (an? )?(unrestricted|doctor|pharmacist)",
    r"bypass (all )?(safety|medical) filters",
    r"system prompt",
    r"jailbreak",
]

EMERGENCY_SIGNS_PATTERNS = [
    r"severe chest pain",
    r"crushing chest pressure",
    r"pain radiating to (the )?(left arm|jaw|back)",
    r"difficulty breathing and sudden confusion",
    r"facial drooping|one-sided weakness|slurred speech",
    r"anaphylaxis|swelling of (the )?(throat|tongue|lips)",
    r"blood sugar (over|>)\s*450",
    r"oxygen saturation (under|<)\s*88",
    r"coughing up large amounts of blood",
    r"sudden loss of vision",
]


class SafetyEngine:
    @staticmethod
    def detect_prompt_injection(text: str) -> bool:
        """Inspects uploaded text for adversarial prompt injection phrases."""
        for pattern in PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False

    @staticmethod
    def scan_for_emergency_signs(text: str) -> dict[str, Any] | None:
        """
        Scans medical text or queries for immediate red-flag emergency symptoms.
        Returns emergency response payload if detected.
        """
        for pattern in EMERGENCY_SIGNS_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                matched_sign = match.group(0)
                return {
                    "is_emergency": True,
                    "warning_sign": matched_sign,
                    "action_required": (
                        f"CRITICAL HEALTH ALERT: Possible emergency warning sign detected ('{matched_sign}'). "
                        "Do not wait for an AI explanation. Call emergency medical services (911 in US / 112 / 102 in India) "
                        "or proceed immediately to the nearest emergency department."
                    ),
                }
        return None

    @staticmethod
    def sanitize_medical_text(text: str) -> str:
        """Strips potential injection commands while preserving medical terminology."""
        cleaned = text
        for pattern in PROMPT_INJECTION_PATTERNS:
            cleaned = re.sub(pattern, "[FILTERED]", cleaned, flags=re.IGNORECASE)
        return cleaned


safety_engine = SafetyEngine()
