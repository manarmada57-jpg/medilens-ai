"""
API Integration Tests for Medications, Dose Logging, Refill Alerts & Adherence Stats.
"""

import pytest
from httpx import AsyncClient


@pytest.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    """Helper fixture providing authenticated patient headers."""
    signup_resp = await client.post(
        "/api/auth/signup",
        json={
            "email": "meds.tester@example.com",
            "password": "MedsPassword123!",
            "name": "Eleanor Mitchell",
            "accept_terms": True,
        },
    )
    token = signup_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_default_medications(client: AsyncClient, auth_headers: dict[str, str]):
    response = await client.get("/api/medicines", headers=auth_headers)
    assert response.status_code == 200
    meds = response.json()
    assert len(meds) == 3
    names = [m["name"] for m in meds]
    assert "Lisinopril 10mg" in names
    assert "Metformin 500mg" in names
    assert "Atorvastatin 20mg" in names


@pytest.mark.asyncio
async def test_take_medication_and_verify_decrement(client: AsyncClient, auth_headers: dict[str, str]):
    # Get initial list
    meds_resp = await client.get("/api/medicines", headers=auth_headers)
    meds = meds_resp.json()
    metformin = next(m for m in meds if "Metformin" in m["name"])
    initial_pills = metformin["pillsLeft"]

    # Log as taken
    take_resp = await client.post(
        f"/api/medicines/{metformin['id']}/take",
        headers=auth_headers,
        json={"notes": "Taken with lunch"},
    )
    assert take_resp.status_code == 200
    assert "message" in take_resp.json() or take_resp.json().get("success") is True

    # Re-fetch medications list
    updated_resp = await client.get("/api/medicines", headers=auth_headers)
    updated_metformin = next(m for m in updated_resp.json() if m["id"] == metformin["id"])
    assert updated_metformin["taken"] is True
    assert updated_metformin["dueStatus"] == "Confirmed taken"
    assert updated_metformin["dueStatusType"] == "taken"
    assert updated_metformin["pillsLeft"] == initial_pills - 1


@pytest.mark.asyncio
async def test_create_and_delete_medication(client: AsyncClient, auth_headers: dict[str, str]):
    create_payload = {
        "name": "Vitamin D3 2000 IU",
        "dosage": "1 capsule daily",
        "instructions": "Take with breakfast",
        "timeSlot": "MORNING",
        "timeDisplay": "9:00 AM",
        "category": "Bone Health",
        "pillsLeft": 60,
    }
    create_resp = await client.post("/api/medicines", headers=auth_headers, json=create_payload)
    assert create_resp.status_code == 201
    new_med = create_resp.json()
    assert new_med["name"] == "Vitamin D3 2000 IU"
    new_id = new_med["id"]

    # Delete medication
    del_resp = await client.delete(f"/api/medicines/{new_id}", headers=auth_headers)
    assert del_resp.status_code == 200

    # Ensure no longer in active list
    list_resp = await client.get("/api/medicines", headers=auth_headers)
    ids = [m["id"] for m in list_resp.json()]
    assert new_id not in ids


@pytest.mark.asyncio
async def test_snooze_medication(client: AsyncClient, auth_headers: dict[str, str]):
    meds = (await client.get("/api/medicines", headers=auth_headers)).json()
    med_id = meds[0]["id"]

    snooze_resp = await client.post(
        f"/api/medicines/{med_id}/snooze",
        headers=auth_headers,
        json={"minutes": 15},
    )
    assert snooze_resp.status_code == 200
    assert "snoozedUntil" in snooze_resp.json()


@pytest.mark.asyncio
async def test_refill_alerts(client: AsyncClient, auth_headers: dict[str, str]):
    response = await client.get("/api/medicines/refill-alerts", headers=auth_headers)
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) >= 1
    # Atorvastatin has 4 pills left (< 7), should trigger alert
    atorvastatin_alert = next(a for a in alerts if "Atorvastatin" in a["medicationName"])
    assert atorvastatin_alert["pillsLeft"] == 4
    assert atorvastatin_alert["pharmacy"] == "CVS Pharmacy #4821"


@pytest.mark.asyncio
async def test_adherence_stats(client: AsyncClient, auth_headers: dict[str, str]):
    response = await client.get("/api/medicines/stats", headers=auth_headers)
    assert response.status_code == 200
    stats = response.json()
    assert "percentage" in stats
    assert "streakDays" in stats
    assert len(stats["weeklyOverview"]) == 7
