"""
Optical Character Recognition (OCR) Service for Scanned Medical Reports.
Uses RapidOCR (ONNX-powered) with Tesseract OCR fallback.
"""

import io

from PIL import Image, ImageOps

from app.core.logging import logger

_rapid_ocr_instance = None


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


class OCRService:
    @staticmethod
    def extract_text_from_image(image_bytes: bytes) -> str:
        """Runs OCR on image bytes with contrast enhancement and EXIF removal."""
        try:
            raw_image = Image.open(io.BytesIO(image_bytes))

            # Strip EXIF orientation / GPS tags
            clean_image = ImageOps.exif_transpose(raw_image) or raw_image

            # Convert to grayscale for cleaner OCR contrast
            gray_img = clean_image.convert("L")
            processed_buf = io.BytesIO()
            gray_img.save(processed_buf, format="PNG")
            img_bytes = processed_buf.getvalue()

            # Try RapidOCR first
            engine = _get_rapid_ocr()
            if engine:
                try:
                    ocr_results, _ = engine(img_bytes)
                    if ocr_results:
                        lines = [line[1] for line in ocr_results if len(line) >= 2 and line[1]]
                        text = "\n".join(lines).strip()
                        if text:
                            return text
                except Exception as e:
                    logger.warning(f"RapidOCR execution warning: {e}")

            # Fallback to pytesseract
            try:
                import pytesseract
                text = pytesseract.image_to_string(gray_img, lang="eng+hin")
                return text.strip()
            except Exception as e:
                logger.warning(f"Tesseract OCR fallback unavailable: {e}")

            return ""
        except Exception as e:
            logger.warning(f"Image processing error in OCRService: {str(e)}")
            return ""

    @staticmethod
    def is_image_readable(text: str) -> bool:
        """Flags when OCR text is too sparse or corrupted, requesting a clearer re-upload."""
        words = [w for w in text.split() if len(w) > 2]
        return len(words) >= 3


ocr_service = OCRService()
