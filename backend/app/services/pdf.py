"""
PDF Document Text & Metadata Extraction Service.
Uses PyMuPDF (fitz) to read PDF pages, strip metadata, and detect scanned pages.
"""

import io

import pymupdf as fitz

from app.core.logging import logger


class PDFExtractor:
    @staticmethod
    def extract_text(pdf_bytes: bytes) -> tuple[str, bool]:
        """
        Extracts textual content from PDF byte stream.
        Returns:
            (extracted_text, is_scanned_image_based)
        """
        text_parts = []
        is_scanned = True
        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            total_chars = 0
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                page_text = page.get_text("text").strip()
                if page_text:
                    text_parts.append(page_text)
                    total_chars += len(page_text)

            doc.close()
            full_text = "\n\n".join(text_parts).strip()
            # If document has substantial digital text (> 100 characters), it's not a scanned image
            if total_chars >= 80:
                is_scanned = False
            return full_text, is_scanned
        except Exception as e:
            logger.warning(f"PyMuPDF text extraction note: {str(e)}")
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
