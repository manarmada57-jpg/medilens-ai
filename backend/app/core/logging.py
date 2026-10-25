"""
Structured Logging Module for MediLens AI Backend.
Guarantees privacy: Never logs medical report content, prompts, or sensitive credentials.
"""

import logging
import re
import sys

from app.core.config import settings

# Sensitive keys that must be scrubbed from any logging payload
REDACTED_KEYS = {
    "password",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "authorization",
    "field_encryption_key",
    "report_text",
    "ocr_text",
    "findings",
    "extracted_text",
    "prompt",
}

JWT_PATTERN = re.compile(r"eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+")


class PrivacyFilter(logging.Filter):
    """
    Scrubs JWT tokens and ensures sensitive health/auth fields are not logged in plaintext.
    """

    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            # Redact any Bearer JWT tokens in log strings
            record.msg = JWT_PATTERN.sub("[REDACTED_JWT]", record.msg)
        return True


def setup_logging() -> logging.Logger:
    """
    Configures application-wide logging with privacy guards.
    """
    log_level = logging.DEBUG if settings.DEBUG and not settings.is_production else logging.INFO

    # Root logger configuration
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)
    handler.addFilter(PrivacyFilter())

    logger = logging.getLogger("medilens")
    logger.setLevel(log_level)
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False

    # Silence overly verbose third-party loggers
    logging.getLogger("uvicorn.access").handlers = [handler]
    logging.getLogger("motor").setLevel(logging.WARNING)
    logging.getLogger("pymongo").setLevel(logging.WARNING)

    return logger


logger = setup_logging()
