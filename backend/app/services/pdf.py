"""
PDF Document Text & Metadata Extraction Service.
Uses PyMuPDF (fitz) to read PDF pages, strip metadata, detect scanned pages,
and render scanned pages to images (200-300 DPI) for OCR.
"""

import io

import pymupdf as fitz

from app.core.logging import logger
from app.services.ocr import ocr_service


class PDFExtractor:
    @staticmethod
    def extract_text(pdf_bytes: bytes) -> tuple[str, bool]:
        """
        Extracts textual content from PDF byte stream.
        If the document is a scanned image or has sparse digital text,
        renders pages to 200 DPI PNG images and OCRs them.
        Returns:
            (extracted_text, is_scanned_image_based)
        """
        text_parts: list[str] = []
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_chars = 0
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text("text").strip()
                if page_text:
                    text_parts.append(page_text)
                    total_chars += len(page_text)

            combined_digital = "\n\n".join(text_parts).strip()
            # If document has substantial or readable digital text, use it directly
            if combined_digital and ocr_service.is_image_readable(combined_digital):
                doc.close()
                return combined_digital, False

            # Otherwise, render pages to images at 200 DPI and run OCR
            logger.info("PDF has sparse digital text (%d chars); rendering pages to images for OCR", total_chars)
            ocr_text_parts: list[str] = []
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                # Render page at 200 DPI for reliable OCR readability
                pix = page.get_pixmap(dpi=200)
                img_bytes = pix.tobytes("png")
                page_ocr = ocr_service.extract_text_from_image(img_bytes)
                if page_ocr.strip():
                    ocr_text_parts.append(page_ocr.strip())

            doc.close()
            ocr_full_text = "\n\n".join(ocr_text_parts).strip()
            return ocr_full_text, True

        except Exception as e:
            logger.warning("PyMuPDF text extraction note: %s", str(e))
            # If stream is plain text or raw text document, decode directly
            try:
                decoded = pdf_bytes.decode("utf-8", errors="ignore").strip()
                if len(decoded) >= 10:
                    return decoded, False
            except Exception:
                pass
            return "", True

    @staticmethod
    def strip_metadata(pdf_bytes: bytes) -> bytes:
        """Removes author, creator, and producer metadata from PDF."""
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            doc.set_metadata({})
            out_stream = io.BytesIO()
            doc.save(out_stream)
            doc.close()
            return out_stream.getvalue()
        except Exception:
            return pdf_bytes


pdf_extractor = PDFExtractor()
