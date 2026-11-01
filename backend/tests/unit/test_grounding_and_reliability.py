"""
Unit tests for Task 3 (Source Grounding), Task 4 (Confidence & Uncertainty),
and Task 5 (LLM & Provider Reliability).
"""

from typing import Any
import pytest
from app.services.validation import lab_validator
from app.ai.llm_client import GeminiAdapter, LLMAuthenticationError, LLMClient


def test_source_grounding_detects_wrong_or_hallucinated_value():
    """
    Task 3 'Done' Check:
    Verifies that when a wrong or hallucinated value (not present in raw OCR text)
    is checked, the source grounding engine catches it, flags needs_confirmation=True,
    assigns confirmationStatus='needs_confirmation', and lowers confidence score.
    """
    raw_ocr_text = """
    COMPLETE BLOOD COUNT REPORT
    Haemoglobin : 15.0 g/dL (13 - 17)
    Total Leucocyte Count : 5000 /cumm (4000 - 10000)
    MCV : 80.0 fL (81 - 101)
    """

    test_findings: list[dict[str, Any]] = [
        # Correctly grounded finding
        {
            "testName": "Haemoglobin (Hb)",
            "value": "15.0",
            "unit": "g/dL",
            "referenceRange": "13 - 17",
            "status": "normal",
        },
        # Wrong / Hallucinated value not present in OCR text (e.g. 999.0)
        {
            "testName": "Platelet Count",
            "value": "999.0",
            "unit": "/cumm",
            "referenceRange": "150000 - 410000",
            "status": "high",
        },
    ]

    verified = lab_validator.verify_source_grounding(test_findings, raw_ocr_text)

    # 1. Correct value is verified
    correct_item = verified[0]
    assert correct_item["confirmationStatus"] == "ok"
    assert correct_item["needs_confirmation"] is False
    assert correct_item["confidence"] >= 0.95

    # 2. Wrong / Hallucinated value is caught and flagged!
    caught_wrong_item = verified[1]
    assert caught_wrong_item["confirmationStatus"] == "needs_confirmation"
    assert caught_wrong_item["needs_confirmation"] is True
    assert caught_wrong_item["needsReview"] is True
    assert caught_wrong_item["confidence"] <= 0.40
    assert "Unverified Value" in caught_wrong_item["explanation"]


def test_unreadable_text_never_guessed():
    """
    Task 4 'Done' Check:
    Verifies that unreadable or blurred lines are NEVER guessed.
    They are marked as confirmationStatus='unreadable', needs_confirmation=True,
    and confidence=0.10.
    """
    raw_ocr_text = "Patient Report: Serum Creatinine : ??? mg/dL"

    test_findings: list[dict[str, Any]] = [
        {
            "testName": "Serum Creatinine",
            "value": "???",
            "unit": "mg/dL",
            "referenceRange": "0.7 - 1.3",
            "status": "normal",
        }
    ]

    verified = lab_validator.verify_source_grounding(test_findings, raw_ocr_text)
    unreadable_item = verified[0]
    assert unreadable_item["confirmationStatus"] == "unreadable"
    assert unreadable_item["needs_confirmation"] is True
    assert unreadable_item["confidence"] <= 0.15
    assert "unreadable or blurred" in unreadable_item["explanation"]


def test_reference_range_strict_from_document():
    """
    Task 3 Requirement:
    Reference range MUST come strictly from the document. Never fabricate one.
    If the document has no printed reference range, it is marked 'Not specified in report'
    and flagged with needs_confirmation=True.
    """
    raw_ocr_text = "Blood Urea Nitrogen: 18 mg/dL"  # Notice: no reference range printed

    test_findings: list[dict[str, Any]] = [
        {
            "testName": "Blood Urea Nitrogen (BUN)",
            "value": "18",
            "unit": "mg/dL",
            "referenceRange": "",  # Missing from report
            "status": "normal",
        }
    ]

    verified = lab_validator.verify_source_grounding(test_findings, raw_ocr_text)
    item = verified[0]
    assert item["referenceRange"] == "Not specified in report"
    assert item["needs_confirmation"] is True
    assert item["confirmationStatus"] == "needs_confirmation"


@pytest.mark.asyncio
async def test_invalid_api_key_returns_clear_user_message(monkeypatch):
    """
    Task 5 'Done' Check:
    API key galat karke test karo, user ko saaf message mile.
    Simulates calling Gemini with an invalid API key, verifying that:
    1. GeminiAdapter detects the invalid key HTTP 400/401/403 and raises LLMAuthenticationError.
    2. LLMClient catches it and produces a clear, safe, patient-facing notice.
    """
    from unittest.mock import AsyncMock
    import httpx

    # Mock invalid API key HTTP 400 response
    mock_bad_resp = httpx.Response(
        status_code=400,
        text='{"error": {"code": 400, "message": "API key not valid. Please pass a valid API key.", "status": "INVALID_ARGUMENT"}}',
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
    )
    monkeypatch.setattr(httpx.AsyncClient, "post", AsyncMock(return_value=mock_bad_resp))

    bad_adapter = GeminiAdapter(api_key="AIzaSy_INVALID_KEY_FOR_TESTING_12345")

    # Direct adapter call should raise LLMAuthenticationError on invalid key
    with pytest.raises(LLMAuthenticationError) as exc_info:
        await bad_adapter.generate_explanation("Explain report", context="Test context")
    assert "Invalid AI provider API key" in str(exc_info.value)

    # LLMClient call should catch the error and present a clean notice to the user
    client = LLMClient()
    client.adapter = bad_adapter

    sample_findings = [
        {"testName": "Haemoglobin (Hb)", "value": "15.0", "unit": "g/dL", "referenceRange": "13 - 17", "status": "normal"}
    ]
    en_summary, hi_summary = await client.explain_report_bilingual(
        title="CBC Report",
        findings=sample_findings,
    )

    # Must contain clear user-facing notice and clinical fallback
    assert "Notice: The configured AI provider API key is invalid or unauthorized" in en_summary
    assert "सूचना: AI प्रोवाइडर API कुंजी अमान्य है" in hi_summary
    assert "Haemoglobin (Hb)" in en_summary
