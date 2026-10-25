"""
Security, Cryptography, and Token Management Module for MediLens AI.
Implements:
- Argon2id password hashing (OWASP recommended)
- Signed JWT access tokens with iss/aud claims and configurable expiration
- Rotating refresh tokens with SHA-256 hash storage and family-based reuse detection
- Field-level encryption for sensitive PHI with MultiFernet key rotation support
"""

import hashlib
import json
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from cryptography.fernet import Fernet, InvalidToken, MultiFernet

from app.core.config import settings
from app.core.logging import logger


# ---------------------------------------------------------------------------
# Password Hashing (Argon2id)
# ---------------------------------------------------------------------------


def _make_hasher() -> PasswordHasher:
    if settings.is_testing:
        # Much cheaper parameters for test speed
        return PasswordHasher(time_cost=1, memory_cost=8, parallelism=1, hash_len=16, salt_len=8)
    return PasswordHasher(time_cost=3, memory_cost=65536, parallelism=4, hash_len=32, salt_len=16)


pwd_hasher = _make_hasher()

# A constant dummy hash used in constant-time rejection during login.
# Computed once at startup — never stored in DB.
_DUMMY_HASH = pwd_hasher.hash("__medilens_dummy_password_constant_time__")


def hash_password(password: str) -> str:
    """Hashes a password using Argon2id."""
    return pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str | None) -> bool:
    """
    Verifies a plain password against an Argon2 hash.
    Always runs the full hash even when hashed_password is None (constant-time defence).
    """
    target = hashed_password if hashed_password else _DUMMY_HASH
    try:
        return pwd_hasher.verify(target, plain_password)
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def check_needs_rehash(hashed_password: str) -> bool:
    """Returns True if the hash should be upgraded (e.g., after a cost increase)."""
    return pwd_hasher.check_needs_rehash(hashed_password)


# ---------------------------------------------------------------------------
# JWT Access Token Management
# ---------------------------------------------------------------------------


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    """Creates a cryptographically signed JWT access token with iss/aud/jti claims."""
    now = datetime.now(UTC)
    expire = now + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
        "jti": secrets.token_hex(16),
        "type": "access",
        "iss": settings.JWT_ISSUER,
        "aud": settings.JWT_AUDIENCE,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """Decodes and validates a JWT access token, checking iss/aud/type claims."""
    # Import here to avoid circular at module load time
    from app.core.errors import UnauthorizedException

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            issuer=settings.JWT_ISSUER,
            audience=settings.JWT_AUDIENCE,
        )
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError as e:
        raise UnauthorizedException("Access token has expired") from e
    except jwt.PyJWTError as e:
        raise UnauthorizedException("Could not validate credentials") from e


# ---------------------------------------------------------------------------
# Rotating Refresh Token Management with Family-based Reuse Detection
# ---------------------------------------------------------------------------


def generate_refresh_token(
    user_id: str,
    family_id: str | None = None,
) -> tuple[str, str, str, datetime]:
    """
    Generates a secure cryptographically random refresh token.

    Args:
        user_id:   The owning user's ID (reserved for future use).
        family_id: Existing family ID for rotation; a new one is created on first login.

    Returns:
        (raw_token, token_hash, family_id, expires_at)
        raw_token  — delivered to the client once; never stored.
        token_hash — SHA-256 hash stored in the database.
        family_id  — shared across rotations; used for reuse-detection revocation.
        expires_at — UTC expiry datetime.
    """
    _ = user_id  # reserved
    raw_token = f"ml_rf_{secrets.token_urlsafe(48)}"
    token_hash = hash_refresh_token(raw_token)
    fid = family_id or secrets.token_hex(16)
    expires_at = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    return raw_token, token_hash, fid, expires_at


def hash_refresh_token(raw_token: str) -> str:
    """Computes a SHA-256 hash of a refresh token for safe storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ---------------------------------------------------------------------------
# Field-Level PHI Encryption with MultiFernet Key Rotation
# ---------------------------------------------------------------------------


class FieldEncryptor:
    """
    Encrypts and decrypts sensitive patient health information (PHI)
    using Fernet symmetric authenticated cryptography (AES-128-CBC + HMAC-SHA256).

    Supports multiple keys for zero-downtime key rotation via MultiFernet.
    The first key in FIELD_ENCRYPTION_KEYS is always used for new encryptions.
    Decryption is attempted with all configured keys.
    """

    def __init__(self, keys: list[bytes] | None = None) -> None:
        key_bytes = keys or settings.fernet_keys
        if not key_bytes:
            raise RuntimeError("No encryption keys configured. Set FIELD_ENCRYPTION_KEYS.")
        # Validate all keys upfront — fail at startup, not at runtime
        fernets: list[Fernet] = []
        for kb in key_bytes:
            try:
                fernets.append(Fernet(kb))
            except Exception as exc:
                raise RuntimeError(f"Invalid Fernet key: {exc}") from exc
        self._multi = MultiFernet(fernets)

    def encrypt(self, data: Any, user_id: str = "") -> str:
        """
        Serializes data into JSON, wraps it with a user_id binding, and encrypts.
        The uid binding prevents a ciphertext being moved between users.
        """
        if data is None:
            return ""
        wrapper: dict[str, Any] = {"uid": user_id, "data": data}
        json_str = json.dumps(wrapper, ensure_ascii=False, default=str)
        token = self._multi.encrypt(json_str.encode("utf-8"))
        return token.decode("utf-8")

    def decrypt(self, ciphertext: str | None, user_id: str = "", as_json: bool = False) -> Any:
        """
        Decrypts ciphertext and verifies the uid binding.

        Raises:
            DecryptionError: if decryption fails or uid does not match.
        """
        from app.core.errors import DecryptionError

        if not ciphertext:
            return None if not as_json else {}
        try:
            decrypted_bytes = self._multi.decrypt(ciphertext.encode("utf-8"))
            decrypted_str = decrypted_bytes.decode("utf-8")
        except (InvalidToken, Exception) as exc:
            logger.error("Field decryption failed: %s", type(exc).__name__)
            raise DecryptionError("Medical data could not be decrypted") from exc

        # Parse wrapper and verify uid binding
        try:
            wrapper = json.loads(decrypted_str)
        except json.JSONDecodeError as exc:
            raise DecryptionError("Decrypted data is not valid JSON") from exc

        if user_id and wrapper.get("uid") != user_id:
            logger.error("Encryption uid mismatch — possible data integrity issue")
            raise DecryptionError("Medical data does not belong to this user")

        payload = wrapper.get("data")
        if as_json and isinstance(payload, str):
            try:
                return json.loads(payload)
            except json.JSONDecodeError:
                return payload
        return payload


field_encryptor = FieldEncryptor()
