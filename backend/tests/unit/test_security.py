"""
Unit Tests for Cryptography, Argon2, JWT, and Field-Level Encryption.
"""

from datetime import timedelta

import pytest
from cryptography.fernet import Fernet

from app.core.errors import DecryptionError, UnauthorizedException
from app.core.security import (
    FieldEncryptor,
    create_access_token,
    decode_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)


def test_argon2_password_hashing():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)

    # Argon2 hashes start with $argon2
    assert hashed.startswith("$argon2")
    assert verify_password(password, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False
    assert verify_password("", hashed) is False
    # Verifying against None uses dummy hash and returns False safely
    assert verify_password("AnyPassword!", None) is False


def test_jwt_access_token_lifecycle():
    user_id = "user_6718a2bc"
    token = create_access_token(user_id, expires_delta=timedelta(minutes=15))

    payload = decode_access_token(token)
    assert payload["sub"] == user_id
    assert payload["type"] == "access"
    assert payload["iss"] == "medilens-ai"
    assert payload["aud"] == "medilens-users"
    assert "exp" in payload


def test_jwt_access_token_expired():
    user_id = "user_expired_123"
    expired_token = create_access_token(user_id, expires_delta=timedelta(minutes=-1))

    with pytest.raises(UnauthorizedException) as exc_info:
        decode_access_token(expired_token)
    assert "expired" in str(exc_info.value.message).lower()


def test_refresh_token_generation_and_hashing():
    user_id = "user_test_999"
    raw_token, token_hash, family_id, expires_at = generate_refresh_token(user_id)

    assert raw_token.startswith("ml_rf_")
    assert len(raw_token) > 40
    # SHA-256 hash length is 64 hex chars
    assert len(token_hash) == 64
    assert hash_refresh_token(raw_token) == token_hash
    assert len(family_id) > 10


def test_field_level_phi_encryption_with_user_binding():
    user_id = "user_12345"
    key = Fernet.generate_key()
    encryptor = FieldEncryptor(keys=[key])

    phi_data = {
        "conditions": ["Type 2 Diabetes", "Hypertension"],
        "allergies": "Penicillin",
        "current_medicines": [{"name": "Metformin", "dosage": "500mg"}],
    }

    # Encrypt bound to user_12345
    ciphertext = encryptor.encrypt(phi_data, user_id=user_id)
    assert isinstance(ciphertext, str)
    assert len(ciphertext) > 50

    # Ensure sensitive medical words are not present in plaintext
    assert "Diabetes" not in ciphertext
    assert "Metformin" not in ciphertext
    assert "Penicillin" not in ciphertext

    # Decrypt with correct user_id
    decrypted = encryptor.decrypt(ciphertext, user_id=user_id, as_json=True)
    assert decrypted == phi_data
    assert decrypted["conditions"] == ["Type 2 Diabetes", "Hypertension"]
    assert decrypted["current_medicines"][0]["dosage"] == "500mg"

    # Decrypt with wrong user_id raises DecryptionError
    with pytest.raises(DecryptionError, match="does not belong to this user"):
        encryptor.decrypt(ciphertext, user_id="wrong_user_id", as_json=True)


def test_field_encryption_key_rotation():
    key_old = Fernet.generate_key()
    key_new = Fernet.generate_key()

    user_id = "patient_abc"
    data = {"condition": "Migraine", "severity": "Moderate"}

    # Encrypt with old key only
    old_encryptor = FieldEncryptor(keys=[key_old])
    old_ciphertext = old_encryptor.encrypt(data, user_id=user_id)

    # MultiFernet with new key first (rotation), old key second
    rotated_encryptor = FieldEncryptor(keys=[key_new, key_old])

    # Should successfully decrypt data encrypted under the old key
    decrypted = rotated_encryptor.decrypt(old_ciphertext, user_id=user_id, as_json=True)
    assert decrypted == data

    # New encryptions use the new key
    new_ciphertext = rotated_encryptor.encrypt(data, user_id=user_id)
    # The old encryptor cannot decrypt ciphertext created with the new key
    with pytest.raises(DecryptionError):
        old_encryptor.decrypt(new_ciphertext, user_id=user_id, as_json=True)


def test_field_encryptor_wrong_key_raises():
    key_a = Fernet.generate_key()
    key_b = Fernet.generate_key()

    encryptor_a = FieldEncryptor(keys=[key_a])
    encryptor_b = FieldEncryptor(keys=[key_b])

    ciphertext = encryptor_a.encrypt({"test": "data"}, user_id="u1")
    with pytest.raises(DecryptionError):
        encryptor_b.decrypt(ciphertext, user_id="u1", as_json=True)


def test_field_encryptor_empty_and_none_handling():
    encryptor = FieldEncryptor()
    assert encryptor.encrypt(None) == ""
    assert encryptor.decrypt("", as_json=True) == {}
    assert encryptor.decrypt(None, as_json=False) is None
