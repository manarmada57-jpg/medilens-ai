"""
Optical Character Recognition (OCR) Service for Scanned Medical Reports.
Uses Tesseract OCR with English and Hindi language support.
"""

import io

import pytesseract
from PIL import Image, ImageOps

from app.core.logging import logger


class OCRService:
    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """Runs Tesseract OCR on image bytes with contrast enhancement and EXIF removal."""
        try:
            raw_image = Image.open(io.BytesIO(image_bytes))

            # Strip EXIF orientation / GPS tags
            clean_image = ImageOps.exif_transpose(raw_image) or raw_image

            # Convert to grayscale for cleaner OCR contrast
            gray_img = clean_image.convert("L")

            # Run pytesseract OCR
            text = pytesseract.image_to_string(gray_img, lang="eng+hin")
            return text.strip()
        except Exception as e:
            logger.warning(f"Tesseract OCR execution error: {str(e)}")
            return ""

    @staticmethod
    def is_image_readable(text: str) -> bool:
        """Flags when OCR text is too sparse or corrupted, requesting a clearer re-upload."""
        words = [w for w in text.split() if len(w) > 2]
        return len(words) >= 5


ocr_service = OCRService()
