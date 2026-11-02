"""
Optical Character Recognition (OCR) Service for Scanned Medical Reports.
Primary: Gemini Vision API (cloud, fast ~2-3 s).
Fallback 1: RapidOCR ONNX (local, if installed).
Fallback 2: pytesseract (local Tesseract binary).
"""

import asyncio
import base64
import io
from concurrent.futures import ThreadPoolExecutor

import httpx
from PIL import Image, ImageOps

from app.core.logging import logger

_rapid_ocr_instance = None
# Thread pool for running blocking OCR calls without blocking the event loop
_ocr_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ocr")


def _get_rapid_ocr():
    global _rapid_ocr_instance
    if _rapid_ocr_instance is None:
        try:
            from rapidocr_onnxruntime import RapidOCR
            _rapid_ocr_instance = RapidOCR()
        except Exception as e:
            logger.warning(f"Could not initialize RapidOCR: {e}")
            _rapid_ocr_instance = False
    return _rapid_ocr_instance if _rapid_ocr_instance is not False else None


def _preprocess_image(image_bytes: bytes) -> tuple[bytes, "Image.Image"]:
    """Strip EXIF, downscale to 1600 px, convert to grayscale. Returns (png_bytes, gray_pil)."""
    raw_image = Image.open(io.BytesIO(image_bytes))
    clean_image = ImageOps.exif_transpose(raw_image) or raw_image
    max_dim = 1600
    if max(clean_image.size) > max_dim:
        clean_image.thumbnail((max_dim, max_dim), Image.Resampling.LANCZOS)
    gray_img = clean_image.convert("L")
    buf = io.BytesIO()
    gray_img.save(buf, format="PNG")
    return buf.getvalue(), gray_img


async def _gemini_vision_ocr(image_bytes: bytes, api_key: str, model: str) -> str:
    """
    Extract all printed text from a medical document image using Gemini Vision.
    Returns the raw extracted text, or "" on any failure.
    """
    b64_image = base64.b64encode(image_bytes).decode("utf-8")
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        f":generateContent?key={api_key}"
    )
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [
                    {
                        "inlineData": {
                            "mimeType": "image/png",
                            "data": b64_image,
                        }
                    },
                    {
                        "text": (
                            "You are a precise OCR engine for medical laboratory reports. "
                            "Transcribe EVERY piece of printed text exactly as it appears — "
                            "including all test names, numeric values, units, reference ranges, "
                            "dates, and lab name. Do NOT interpret or summarise. "
                            "Output plain text only, preserving the original line layout."
                        )
                    },
                ],
            }
        ]
    }
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=5.0)) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                candidates = data.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts:
                        text = parts[0].get("text", "").strip()
                        if text:
                            logger.info("Gemini Vision OCR succeeded (%d chars)", len(text))
                            return text
            elif resp.status_code in (400, 401, 403):
                logger.warning(
                    "Gemini Vision OCR auth/key error (HTTP %s) — falling back to local OCR",
                    resp.status_code,
                )
            else:
                logger.warning(
                    "Gemini Vision OCR HTTP %s — falling back to local OCR",
                    resp.status_code,
                )
    except Exception as e:
        logger.warning("Gemini Vision OCR error: %s — falling back to local OCR", e)
    return ""


def _local_ocr_blocking(img_bytes: bytes, gray_img: "Image.Image") -> str:
    """Blocking: try RapidOCR then pytesseract. Returns extracted text or ''."""
    engine = _get_rapid_ocr()
    if engine:
        try:
            ocr_results, _ = engine(img_bytes)
            if ocr_results:
                lines = [line[1] for line in ocr_results if len(line) >= 2 and line[1]]
                text = "\n".join(lines).strip()
                if text:
                    logger.info("RapidOCR succeeded (%d chars)", len(text))
                    return text
        except Exception as e:
            logger.warning(f"RapidOCR execution warning: {e}")

    try:
        import pytesseract
        text = pytesseract.image_to_string(gray_img, lang="eng+hin").strip()
        if text:
            logger.info("pytesseract OCR succeeded (%d chars)", len(text))
        return text
    except Exception as e:
        logger.warning(f"Tesseract OCR fallback unavailable: {e}")

    return ""


class OCRService:
    @staticmethod
    async def extract_text_from_image_async(image_bytes: bytes) -> str:
        """
        Async: tries Gemini Vision first (fast, cloud), then local engines in a thread.
        """
        try:
            img_bytes, gray_img = _preprocess_image(image_bytes)
        except Exception as e:
            logger.warning(f"Image preprocessing error: {e}")
            return ""

        # 1. Try Gemini Vision (primary — fast cloud OCR)
        try:
            from app.core.config import settings
            key = settings.GEMINI_API_KEY
            if key and key not in ("", "demo-local-key", "demo"):
                gemini_text = await _gemini_vision_ocr(img_bytes, key, settings.PRIMARY_MODEL)
                if gemini_text:
                    return gemini_text
        except Exception as e:
            logger.warning("Gemini Vision OCR invocation error: %s", e)

        # 2. Local OCR in thread (non-blocking)
        loop = asyncio.get_event_loop()
        text = await loop.run_in_executor(
            _ocr_executor,
            _local_ocr_blocking,
            img_bytes,
            gray_img,
        )
        return text

    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """
        Sync wrapper (kept for backward compatibility).
        Prefer extract_text_from_image_async() in async contexts.
        """
        try:
            img_bytes, gray_img = _preprocess_image(image_bytes)
        except Exception as e:
            logger.warning(f"Image preprocessing error: {e}")
            return ""
        return _local_ocr_blocking(img_bytes, gray_img)

    @staticmethod
    def is_image_readable(text: str) -> bool:
        """Flags when OCR text is too sparse or corrupted, requesting a clearer re-upload."""
        words = [w for w in text.split() if len(w) > 2]
        return len(words) >= 3


ocr_service = OCRService()
