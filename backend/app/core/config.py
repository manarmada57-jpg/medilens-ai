"""
Core Application Configuration
Pydantic v2 Settings for MediLens AI Backend.
"""


from cryptography.fernet import Fernet
from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application Information
    APP_NAME: str = "MediLens AI Backend"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = "development"  # development, staging, production, testing
    DEBUG: bool = False
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS
    CORS_ORIGINS: list[str] | str = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]
    )

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        if isinstance(value, list):
            return [str(origin).strip() for origin in value if str(origin).strip()]
        return [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
        ]

    # Database (MongoDB)
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "medilens_db"
    MONGODB_MIN_POOL_SIZE: int = 5
    MONGODB_MAX_POOL_SIZE: int = 50
    MONGODB_TIMEOUT_MS: int = 5000

    # Authentication & Security — NO defaults in production
    SECRET_KEY: str = ""
    JWT_ALGORITHM: str = "HS256"
    JWT_ISSUER: str = "medilens-ai"
    JWT_AUDIENCE: str = "medilens-users"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Field-level encryption — supports comma-separated key rotation (newest first)
    # Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    FIELD_ENCRYPTION_KEYS: str = ""  # comma-separated, newest first

    # Storage & Uploads
    UPLOAD_DIR: str = "/tmp/medilens/uploads"
    MAX_DOC_BYTES: int = 20 * 1024 * 1024    # 20 MB for documents
    MAX_MEDIA_BYTES: int = 20 * 1024 * 1024  # 20 MB for media/video
    MAX_UPLOAD_SIZE_BYTES: int = 20 * 1024 * 1024  # legacy alias

    DOC_MIME_TYPES: list[str] | str = Field(
        default_factory=lambda: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/heic",
        ]
    )
    MEDIA_MIME_TYPES: list[str] | str = Field(
        default_factory=lambda: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
            "video/quicktime",
            "video/webm",
        ]
    )
    # Legacy alias — kept for backward compatibility
    ALLOWED_MIME_TYPES: list[str] | str = Field(
        default_factory=lambda: [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/webp",
            "video/mp4",
        ]
    )

    @field_validator("DOC_MIME_TYPES", "MEDIA_MIME_TYPES", "ALLOWED_MIME_TYPES", mode="after")
    @classmethod
    def parse_mime_list(cls, value: list[str] | str) -> list[str]:
        if isinstance(value, str):
            return [v.strip() for v in value.split(",") if v.strip()]
        return [str(v).strip() for v in value if str(v).strip()]

    # AI / LLM Providers
    LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    PRIMARY_MODEL: str = "gemini-2.0-flash"
    VISION_MODEL: str = "gemini-2.0-flash"

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        env = self.APP_ENV.lower()

        if env in ("production", "staging"):
            # Validate SECRET_KEY
            if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "SECRET_KEY must be at least 32 characters in production/staging. "
                    "Generate with: openssl rand -hex 32"
                )
            bad_patterns = ("dev_secret", "change_this", "placeholder", "example", "default")
            if any(p in self.SECRET_KEY.lower() for p in bad_patterns):
                raise ValueError(
                    "SECRET_KEY contains a well-known placeholder value. "
                    "Generate with: openssl rand -hex 32"
                )
            # Validate FIELD_ENCRYPTION_KEYS
            if not self.FIELD_ENCRYPTION_KEYS:
                raise ValueError(
                    "FIELD_ENCRYPTION_KEYS must be set in production/staging. "
                    "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
                )
            for raw_key in self.FIELD_ENCRYPTION_KEYS.split(","):
                key = raw_key.strip()
                try:
                    Fernet(key.encode())
                except Exception as err:
                    raise ValueError(
                        "FIELD_ENCRYPTION_KEYS contains an invalid Fernet key. "
                        "Each key must be a 44-character URL-safe base64 Fernet key."
                    ) from err

        elif env == "development":
            # Auto-generate ephemeral dev secrets if not set
            if not self.SECRET_KEY:
                import secrets as _secrets
                object.__setattr__(self, "SECRET_KEY", _secrets.token_hex(32))
            if not self.FIELD_ENCRYPTION_KEYS:
                object.__setattr__(self, "FIELD_ENCRYPTION_KEYS", Fernet.generate_key().decode())

        # testing env: conftest sets keys explicitly; no auto-generation here

        return self

    @property
    def fernet_keys(self) -> list[bytes]:
        """Returns list of Fernet key bytes, newest first."""
        if not self.FIELD_ENCRYPTION_KEYS:
            raise RuntimeError(
                "FIELD_ENCRYPTION_KEYS not configured. "
                "Generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return [k.strip().encode() for k in self.FIELD_ENCRYPTION_KEYS.split(",") if k.strip()]

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.lower() == "production"

    @property
    def is_staging(self) -> bool:
        return self.APP_ENV.lower() == "staging"

    @property
    def is_testing(self) -> bool:
        return self.APP_ENV.lower() == "testing"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV.lower() == "development"

    @property
    def docs_enabled(self) -> bool:
        return not self.is_production


# Singleton configuration instance
settings = Settings()
