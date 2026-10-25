"""
API Integration Tests for Skin Screening, Evidence-based Self-Care & Data Export/Deletion.
"""

import io

import pytest
from httpx import AsyncClient


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    signup_resp = await client.post(
        "/api/auth/signup",
        json={
            "email": "skin.tester@example.com",
            "password": "SkinPassword123!",
            "name": "Eleanor Mitchell",
            "accept_terms": True,
        },
    )
    token = signup_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_skin_screening_awareness(client: AsyncClient, auth_headers: dict[str, str]):
    # Create 1x1 dummy PNG
    fake_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    file_obj = io.BytesIO(fake_png)
    files = {"file": ("skin_spot.png", file_obj, "image/png")}

    response = await client.post("/api/analyze/skin", headers=auth_headers, files=files)
    assert response.status_code == 200
    data = response.json()
    assert "abcdeGuide" in data
    assert len(data["abcdeGuide"]) == 5
    assert "questionsForDermatologist" in data
    assert "disclaimer" in data
    assert "NOT a medical diagnosis" in data["disclaimer"]


@pytest.mark.asyncio
async def test_self_care_guides(client: AsyncClient, auth_headers: dict[str, str]):
    # Test Diabetes Guide
    d_resp = await client.get("/api/selfcare?condition=Diabetes", headers=auth_headers)
    assert d_resp.status_code == 200
    diabetes_guide = d_resp.json()
    assert "Type 2 Diabetes" in diabetes_guide["condition"]
    assert len(diabetes_guide["dailyHabits"]) >= 2
    assert "Metformin" in diabetes_guide["dailyHabits"][0]["description"]

    # Test Hypertension Guide
    h_resp = await client.get("/api/selfcare?condition=Hypertension", headers=auth_headers)
    assert h_resp.status_code == 200
    hypertension_guide = h_resp.json()
    assert "Hypertension" in hypertension_guide["condition"]
    assert len(hypertension_guide["whenToContactDoctor"]) >= 1


@pytest.mark.asyncio
async def test_patient_data_export(client: AsyncClient, auth_headers: dict[str, str]):
    export_resp = await client.get("/api/profile/export", headers=auth_headers)
    assert export_resp.status_code == 200
    archive = export_resp.json()
    assert "export_timestamp" in archive
    assert "patient" in archive
    assert "medications" in archive
    assert "health_documents" in archive


@pytest.mark.asyncio
async def test_account_and_data_deletion(client: AsyncClient):
    # Register disposable user
    signup_resp = await client.post(
        "/api/auth/signup",
        json={
            "email": "delete.me@example.com",
            "password": "DeleteMe123!",
            "name": "Delete Me",
            "accept_terms": True,
        },
    )
    token = signup_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Delete account
    del_resp = await client.delete("/api/profile/delete-account", headers=headers)
    assert del_resp.status_code == 200

    # Confirm user can no longer authenticate
    me_resp = await client.get("/api/auth/me", headers=headers)
    assert me_resp.status_code == 401
