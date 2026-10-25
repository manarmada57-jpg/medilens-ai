"""
Stage 2 End-to-End Gate Test:
Verifies the complete patient lifecycle:
1. New user signs up with legal consent.
2. User verifies auth session via /api/auth/me.
3. Medical history profile is initially null.
4. User completes intake (PUT /api/profile) with encrypted medical history.
5. User reloads (simulated by new GET requests with stored session credentials)
   and receives identical decrypted intake data and display profile.
6. User performs token refresh (POST /api/auth/refresh) and continues accessing profile.
7. User signs out (POST /api/auth/logout).
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_stage2_end_to_end_user_lifecycle(client: AsyncClient):
    # 1. Sign up a new user
    signup_payload = {
        "name": "Alex Taylor",
        "email": "alex.taylor@example.org",
        "password": "SecurePassword2026!",
        "accept_terms": True,
    }
    signup_resp = await client.post("/api/auth/signup", json=signup_payload)
    assert signup_resp.status_code == 201, signup_resp.text
    auth_data = signup_resp.json()
    assert "token" in auth_data or "access_token" in auth_data
    access_token = auth_data.get("token") or auth_data.get("access_token")
    refresh_token = auth_data.get("refresh_token")
    assert access_token
    assert refresh_token
    assert auth_data["user"]["name"] == "Alex Taylor"
    assert auth_data["user"]["email"] == "alex.taylor@example.org"

    auth_headers = {"Authorization": f"Bearer {access_token}"}

    # 2. Check current session identity via /api/auth/me
    me_resp = await client.get("/api/auth/me", headers=auth_headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "alex.taylor@example.org"

    # 3. Before intake, profile is null
    init_profile = await client.get("/api/profile", headers=auth_headers)
    assert init_profile.status_code == 200
    assert init_profile.json()["profile"] is None

    # 4. Complete intake (PUT /api/profile)
    intake_data = {
        "dob": "1980-05-15",
        "sex": "Female",
        "conditions": ["Hypertension"],
        "allergyType": "Food",
        "noKnownAllergies": False,
        "specificAllergen": "Peanuts",
        "currentMedicines": [
            {"name": "Amlodipine", "dosage": "5mg"}
        ],
        "pastSurgeries": "None",
    }
    intake_resp = await client.put("/api/profile", headers=auth_headers, json=intake_data)
    assert intake_resp.status_code == 200
    saved_profile = intake_resp.json()["profile"]
    assert saved_profile["dob"] == "1980-05-15"
    assert saved_profile["conditions"] == ["Hypertension"]
    assert saved_profile["specificAllergen"] == "Peanuts"

    # 5. Simulated page reload / session restore:
    # A reloaded client uses the same access token from storage to fetch user & profile
    reload_user_resp = await client.get("/api/auth/me", headers=auth_headers)
    assert reload_user_resp.status_code == 200
    assert reload_user_resp.json()["name"] == "Alex Taylor"

    reload_profile_resp = await client.get("/api/profile", headers=auth_headers)
    assert reload_profile_resp.status_code == 200
    restored_profile = reload_profile_resp.json()["profile"]
    assert restored_profile is not None
    assert restored_profile["dob"] == "1980-05-15"
    assert restored_profile["conditions"] == ["Hypertension"]
    assert restored_profile["specificAllergen"] == "Peanuts"
    assert restored_profile["currentMedicines"] == [{"name": "Amlodipine", "dosage": "5mg"}]

    # 6. Single-flight token refresh
    refresh_resp = await client.post("/api/auth/refresh", json={"refresh_token": refresh_token})
    assert refresh_resp.status_code == 200
    refreshed_data = refresh_resp.json()
    new_access_token = refreshed_data.get("token") or refreshed_data.get("access_token")
    assert new_access_token

    # Verify new token can access profile
    new_headers = {"Authorization": f"Bearer {new_access_token}"}
    verified_resp = await client.get("/api/profile", headers=new_headers)
    assert verified_resp.status_code == 200
    assert verified_resp.json()["profile"]["conditions"] == ["Hypertension"]

    # 7. Sign out
    logout_resp = await client.post("/api/auth/logout", json={"refresh_token": refresh_token})
    assert logout_resp.status_code == 200
