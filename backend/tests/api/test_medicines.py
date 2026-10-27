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
            "name": "Medication Patient",
            "accept_terms": True,
        },
    )
    token = signup_resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_get_default_medications(client: AsyncClient, auth_headers: dict[str, str]):
    response = await client.get("/api/medicines", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    meds = data.get("medicines", data)
    # A new account must have zero medications (no fake pre-seeded medications)
    assert len(meds) == 0


@pytest.mark.asyncio
async def test_take_medication_and_verify_decrement(client: AsyncClient, auth_headers: dict[str, str]):
    # Create an actual medication
    create_payload = {
        "name": "Amoxicillin 500mg",
        "dosage": "1 capsule three times daily",
        "instructions": "Take with water after meals",
        "timeSlot": "MORNING",
        "timeDisplay": "8:00 AM",
        "times": ["08:00"],
        "category": "Infection",
        "pillsLeft": 20,
        "pillsTotal": 20,
    }
    create_resp = await client.post("/api/medicines", headers=auth_headers, json=create_payload)
    assert create_resp.status_code == 201
    med = create_resp.json()
    med_id = med["id"]
    initial_pills = med["pillsLeft"]

    # Log as taken
    take_resp = await client.post(
        f"/api/medicines/{med_id}/take",
        headers=auth_headers,
        json={"notes": "Taken with lunch"},
    )
    assert take_resp.status_code == 200
    assert "message" in take_resp.json() or take_resp.json().get("success") is True

    # Re-fetch medications list and verify decrement
    updated_resp = await client.get("/api/medicines", headers=auth_headers)
    updated_data = updated_resp.json()
    updated_meds = updated_data.get("medicines", updated_data)
    updated_med = next(m for m in updated_meds if m["id"] == med_id)
    assert updated_med["pillsLeft"] == initial_pills - 1

    # Verify schedule/today
    sched_resp = await client.get("/api/medicines/schedule/today", headers=auth_headers)
    assert sched_resp.status_code == 200
    sched_doses = sched_resp.json().get("doses", [])
    matched_dose = next(d for d in sched_doses if d["medicineId"] == med_id)
    assert matched_dose["status"] == "taken"


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
    assert del_resp.status_code in (200, 204)

    # Ensure no longer in active list
    list_resp = await client.get("/api/medicines", headers=auth_headers)
    meds_list = list_resp.json().get("medicines", list_resp.json())
    ids = [m["id"] for m in meds_list]
    assert new_id not in ids


@pytest.mark.asyncio
async def test_snooze_medication(client: AsyncClient, auth_headers: dict[str, str]):
    create_payload = {
        "name": "Vitamin C 500mg",
        "dosage": "1 tablet daily",
        "instructions": "Take with breakfast",
        "timeSlot": "MORNING",
        "timeDisplay": "8:00 AM",
        "pillsLeft": 30,
    }
    create_resp = await client.post("/api/medicines", headers=auth_headers, json=create_payload)
    assert create_resp.status_code == 201
    med_id = create_resp.json()["id"]

    snooze_resp = await client.post(
        f"/api/medicines/{med_id}/snooze",
        headers=auth_headers,
        json={"minutes": 15},
    )
    assert snooze_resp.status_code == 200
    assert "snoozedUntil" in snooze_resp.json()


@pytest.mark.asyncio
async def test_refill_alerts(client: AsyncClient, auth_headers: dict[str, str]):
    create_payload = {
        "name": "Thyroxine 50mcg",
        "dosage": "1 tablet daily",
        "instructions": "Take in morning on empty stomach",
        "timeSlot": "MORNING",
        "timeDisplay": "7:00 AM",
        "pillsLeft": 4,
        "pillsTotal": 30,
    }
    create_resp = await client.post("/api/medicines", headers=auth_headers, json=create_payload)
    assert create_resp.status_code == 201

    response = await client.get("/api/medicines/refill-alerts", headers=auth_headers)
    assert response.status_code == 200
    alerts = response.json()
    assert len(alerts) >= 1
    thyroxine_alert = next(a for a in alerts if "Thyroxine" in a["medicationName"])
    assert thyroxine_alert["pillsLeft"] == 4


@pytest.mark.asyncio
async def test_adherence_stats(client: AsyncClient, auth_headers: dict[str, str]):
    response = await client.get("/api/medicines/stats", headers=auth_headers)
    assert response.status_code == 200
    stats = response.json()
    assert "percentage" in stats
    assert "streakDays" in stats
    assert len(stats["weeklyOverview"]) == 7
