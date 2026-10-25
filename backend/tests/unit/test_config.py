"""
Unit Tests for Core Configuration, Validation, and Privacy Guards.
"""

import logging
import pytest
from cryptography.fernet import Fernet

from app.core.config import Settings
from app.core.logging import PrivacyFilter


def test_settings_defaults():
    s = Settings(
        APP_ENV="development",
        MONGODB_URI="mongodb://localhost:27017",
        MONGODB_DB_NAME="test_db",
    )
    assert s.APP_NAME == "MediLens AI Backend"
    assert s.PORT == 8000
    assert not s.is_production
    assert "http://localhost:3000" in s.CORS_ORIGINS


def test_cors_origins_parsing():
    s = Settings(CORS_ORIGINS="http://example.com, https://health.medilens.com , http://localhost:3000")
    assert len(s.CORS_ORIGINS) == 3
    assert "http://example.com" in s.CORS_ORIGINS
    assert "https://health.medilens.com" in s.CORS_ORIGINS
    assert "http://localhost:3000" in s.CORS_ORIGINS


def test_mime_types_parsing():
    s = Settings(
        DOC_MIME_TYPES="application/pdf, image/jpeg, image/png",
        MEDIA_MIME_TYPES="video/mp4, video/quicktime",
    )
    assert s.DOC_MIME_TYPES == ["application/pdf", "image/jpeg", "image/png"]
    assert s.MEDIA_MIME_TYPES == ["video/mp4", "video/quicktime"]


def test_production_secrets_validation():
    valid_key = Fernet.generate_key().decode()
    valid_secret = "a" * 32

    # Valid production settings pass
    prod_ok = Settings(
        APP_ENV="production",
        SECRET_KEY=valid_secret,
        FIELD_ENCRYPTION_KEYS=valid_key,
    )
    assert prod_ok.is_production

    # Missing SECRET_KEY in production raises ValueError
    with pytest.raises(ValueError, match="SECRET_KEY must be at least 32 characters"):
        Settings(
            APP_ENV="production",
            SECRET_KEY="",
            FIELD_ENCRYPTION_KEYS=valid_key,
        )

    # Placeholder/dev SECRET_KEY in production raises ValueError
    with pytest.raises(ValueError, match="placeholder value"):
        Settings(
            APP_ENV="production",
            SECRET_KEY="dev_secret_key_that_is_long_enough_32_chars",
            FIELD_ENCRYPTION_KEYS=valid_key,
        )

    # Invalid Fernet key in production raises ValueError
    with pytest.raises(ValueError, match="invalid Fernet key"):
        Settings(
            APP_ENV="production",
            SECRET_KEY=valid_secret,
            FIELD_ENCRYPTION_KEYS="not_a_valid_fernet_key",
        )


def test_privacy_filter_scrubs_jwt():
    filter_ = PrivacyFilter()
    sample_jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_p_placeholder"
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg=f"User logged in with token Bearer {sample_jwt}",
        args=(),
        exc_info=None,
    )
    filter_.filter(record)
    assert sample_jwt not in record.msg
    assert "[REDACTED_JWT]" in record.msg
