"""
API Integration Tests for Patient Profile and Encrypted Medical History.
"""

import pytest
from httpx import AsyncClient

from app.db.indexes import PROFILES_COLLECTION
from app.db.mongo import db_manager

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

SIGNUP_PAYLOAD = {
    "email": "eleanor.profile@example.com",
    "password": "ProfilePassword123!",
    "name": "Eleanor Mitchell",
    "accept_terms": True,
}


async def _signup_and_token(client: AsyncClient, payload: dict | None = None) -> tuple[str, dict]:
    resp = await client.post("/api/auth/signup", json=payload or SIGNUP_PAYLOAD)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    return data["access_token"], data["user"]


# ---------------------------------------------------------------------------
# Display profile (GET/PUT /api/profile/me)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_display_profile_lifecycle(client: AsyncClient):
    token, user_info = await _signup_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # GET display profile
    profile_resp = await client.get("/api/profile/me", headers=headers)
    assert profile_resp.status_code == 200
    p = profile_resp.json()
    assert p["name"] == "Eleanor Mitchell"
    assert p["role"] == "patient"
    assert p["caregiverLinked"] is False
    assert p["activeReportsCount"] == 0

    # Update display profile
    update_resp = await client.put(
        "/api/profile/me",
        headers=headers,
        json={"caregiverName": "Sarah Mitchell", "caregiverLinked": True},
    )
    assert update_resp.status_code == 200
    updated = update_resp.json()
    assert updated["caregiverName"] == "Sarah Mitchell"
    assert updated["caregiverLinked"] is True


# ---------------------------------------------------------------------------
# Medical history (GET/PUT /api/profile)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_medical_history_initially_null(client: AsyncClient):
    token, _ = await _signup_and_token(
        client,
        {
            "email": "mh.initial@example.com",
            "password": "Password123!",
            "name": "MH Initial",
            "accept_terms": True,
        },
    )
    headers = {"Authorization": f"Bearer {token}"}

    get_resp = await client.get("/api/profile", headers=headers)
    assert get_resp.status_code == 200
    data = get_resp.json()
    assert "profile" in data
    assert data["profile"] is None


@pytest.mark.asyncio
async def test_encrypted_medical_history(client: AsyncClient):
    token, _ = await _signup_and_token(
        client,
        {
            "email": "medhistory.test@example.com",
            "password": "MedHistoryPassword123!",
            "name": "Eleanor Mitchell",
            "accept_terms": True,
        },
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Save sensitive medical history
    history_payload = {
        "dob": "1958-04-12",
        "sex": "Female",
        "conditions": ["Type 2 Diabetes", "Hypertension", "Migraine"],
        "allergyType": "Drug",
        "noKnownAllergies": False,
        "specificAllergen": "Penicillin",
        "currentMedicines": [
            {"name": "Metformin", "dosage": "500mg"},
            {"name": "Lisinopril", "dosage": "10mg"},
        ],
        "pastSurgeries": "Appendectomy (1985)",
    }

    save_resp = await client.put("/api/profile", headers=headers, json=history_payload)
    assert save_resp.status_code == 200
    saved = save_resp.json()
    assert "profile" in saved
    assert "Type 2 Diabetes" in saved["profile"]["conditions"]
    assert len(saved["profile"]["currentMedicines"]) == 2

    # VERIFY DIRECT DATABASE ENCRYPTION — raw ciphertext must not contain PHI
    db = db_manager.db
    assert db is not None
    user_record = await db["users"].find_one({"email": "medhistory.test@example.com"})
    assert user_record is not None
    user_id = str(user_record["_id"])

    raw_profile = await db[PROFILES_COLLECTION].find_one({"user_id": user_id})
    assert raw_profile is not None
    raw_ciphertext = raw_profile.get("medical_history_encrypted", "")
    assert isinstance(raw_ciphertext, str)

    assert "Diabetes" not in raw_ciphertext
    assert "Metformin" not in raw_ciphertext
    assert "Penicillin" not in raw_ciphertext

    # Decrypted retrieval via API (alias endpoint)
    fetch_resp = await client.get("/api/profile/medical-history", headers=headers)
    assert fetch_resp.status_code == 200
    decrypted = fetch_resp.json()
    assert "profile" in decrypted
    profile = decrypted["profile"]
    assert profile["conditions"] == ["Type 2 Diabetes", "Hypertension", "Migraine"]
    assert profile["sex"] == "Female"
    assert profile["specificAllergen"] == "Penicillin"
    assert profile["currentMedicines"][0]["name"] == "Metformin"


@pytest.mark.asyncio
async def test_medical_history_alias_endpoint(client: AsyncClient):
    """GET and PUT /api/profile/medical-history should behave identically to /api/profile."""
    token, _ = await _signup_and_token(
        client,
        {
            "email": "alias.test@example.com",
            "password": "Password123!",
            "name": "Alias Tester",
            "accept_terms": True,
        },
    )
    headers = {"Authorization": f"Bearer {token}"}

    save = await client.put(
        "/api/profile/medical-history",
        headers=headers,
        json={"conditions": ["Asthma"], "sex": "Male"},
    )
    assert save.status_code == 200

    fetch = await client.get("/api/profile", headers=headers)
    assert fetch.status_code == 200
    assert fetch.json()["profile"]["conditions"] == ["Asthma"]


@pytest.mark.asyncio
async def test_medical_history_frontend_intake_contract(client: AsyncClient):
    """Verifies that frontend intake payloads (e.g. lowercase sex, medicine allergy) are normalized and saved."""
    token, _ = await _signup_and_token(
        client,
        {
            "email": "frontend.intake@example.com",
            "password": "Password123!",
            "name": "Intake Tester",
            "accept_terms": True,
        },
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Test with DD/MM/YYYY date format
    frontend_payload = {
        "dob": "15/06/1992",
        "sex": "female",
        "conditions": ["Diabetes", "Asthma"],
        "allergyType": "medicine",
        "noKnownAllergies": False,
        "specificAllergen": "Amoxicillin",
        "currentMedicines": [{"name": "Inhaler", "dosage": "2 puffs"}],
        "pastSurgeries": "None",
    }

    save_resp = await client.put("/api/profile", headers=headers, json=frontend_payload)
    assert save_resp.status_code == 200, save_resp.text
    saved = save_resp.json()["profile"]
    assert saved["dob"] == "1992-06-15"
    assert saved["sex"] == "Female"
    assert saved["allergyType"] == "Drug"
    assert saved["conditions"] == ["Diabetes", "Asthma"]
    assert saved["specificAllergen"] == "Amoxicillin"

    # Re-fetch to confirm persistence
    get_resp = await client.get("/api/profile", headers=headers)
    assert get_resp.status_code == 200
    fetched = get_resp.json()["profile"]
    assert fetched["dob"] == "1992-06-15"
    assert fetched["sex"] == "Female"
    assert fetched["allergyType"] == "Drug"
