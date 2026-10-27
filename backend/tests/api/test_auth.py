"""
API Integration Tests for Authentication & Session Management.
Tests the updated auth contract: flat error envelope, token+user response,
duplicate → 409, accept_terms required, name required, new endpoints.
"""

import asyncio

import pytest
from httpx import AsyncClient

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_SIGNUP = {
    "email": "eleanor.mitchell@example.com",
    "password": "SecurePassword123!",
    "name": "Eleanor Mitchell",
    "accept_terms": True,
}


async def _signup(client: AsyncClient, payload: dict | None = None) -> dict:
    resp = await client.post("/api/auth/signup", json=payload or VALID_SIGNUP)
    return resp


# ---------------------------------------------------------------------------
# Signup
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_signup_success(client: AsyncClient):
    resp = await _signup(client)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    # Standard OAuth2 fields
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0
    # Frontend alias
    assert data["token"] == data["access_token"]
    # User object
    assert "user" in data
    assert data["user"]["email"] == VALID_SIGNUP["email"]
    assert data["user"]["name"] == VALID_SIGNUP["name"]
    assert "id" in data["user"]


@pytest.mark.asyncio
async def test_signup_camelcase_contract(client: AsyncClient):
    """Stage A contract test: posts exactly {name,email,password,timezone,language,acceptTerms}."""
    payload = {
        "name": "Aarav Sharma",
        "email": "aarav.sharma.stage_a@example.com",
        "password": "SecurePassword123!",
        "timezone": "Asia/Kolkata",
        "language": "hi",
        "acceptTerms": True,
    }
    resp = await client.post("/api/auth/signup", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert data["user"]["timezone"] == "Asia/Kolkata"
    assert data["user"]["language"] == "hi"
    assert "fontSize" in data["user"]


@pytest.mark.asyncio
async def test_signup_requires_name(client: AsyncClient):
    payload = {
        "email": "noname@example.com",
        "password": "Password123!",
        "accept_terms": True,
    }
    resp = await client.post("/api/auth/signup", json=payload)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_signup_requires_accept_terms(client: AsyncClient):
    payload = {
        "email": "noterms@example.com",
        "password": "Password123!",
        "name": "Test User",
        "accept_terms": False,
    }
    resp = await client.post("/api/auth/signup", json=payload)
    # ValidationException or 422
    assert resp.status_code in (400, 422)


@pytest.mark.asyncio
async def test_signup_duplicate_email_returns_409(client: AsyncClient):
    payload = {
        "email": "duplicate.test@example.com",
        "password": "Password123!",
        "name": "Test User",
        "accept_terms": True,
    }
    resp1 = await client.post("/api/auth/signup", json=payload)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/auth/signup", json=payload)
    assert resp2.status_code == 409
    data = resp2.json()
    # Flat error envelope
    assert "error" in data
    assert data["code"] == "EMAIL_EXISTS"
    # Must NOT have the old nested envelope
    assert "success" not in data


@pytest.mark.asyncio
async def test_concurrent_signup_one_201_one_409(client: AsyncClient):
    """Gate test: Simultaneous signups with identical email must result in exactly one 201 and one 409."""
    payload = {
        "email": "concurrent.race@example.com",
        "password": "RacePassword123!",
        "name": "Race Tester",
        "accept_terms": True,
    }
    resp_a, resp_b = await asyncio.gather(
        client.post("/api/auth/signup", json=payload),
        client.post("/api/auth/signup", json=payload),
    )
    statuses = sorted([resp_a.status_code, resp_b.status_code])
    assert statuses == [201, 409], f"Expected [201, 409] but got {statuses}"


@pytest.mark.asyncio
async def test_signup_password_too_short(client: AsyncClient):
    payload = {
        "email": "short@example.com",
        "password": "abc",
        "name": "Short Pwd",
        "accept_terms": True,
    }
    resp = await client.post("/api/auth/signup", json=payload)
    assert resp.status_code == 422
    # The submitted password must NOT appear in the response
    assert "abc" not in resp.text


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_login_success_returns_user_object(client: AsyncClient):
    await _signup(client)

    resp = await client.post(
        "/api/auth/login",
        json={"email": VALID_SIGNUP["email"], "password": VALID_SIGNUP["password"]},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token"] == data["access_token"]
    assert data["user"]["email"] == VALID_SIGNUP["email"]
    assert data["user"]["name"] == VALID_SIGNUP["name"]


@pytest.mark.asyncio
async def test_login_failure_returns_flat_401(client: AsyncClient):
    # Register first
    await client.post(
        "/api/auth/signup",
        json={
            "email": "login.test@example.com",
            "password": "CorrectPassword123!",
            "name": "Login Tester",
            "accept_terms": True,
        },
    )

    # Wrong password
    bad_resp = await client.post(
        "/api/auth/login",
        json={"email": "login.test@example.com", "password": "WrongPassword!"},
    )
    assert bad_resp.status_code == 401
    data = bad_resp.json()
    assert "error" in data
    assert "success" not in data

    # Non-existent user
    no_user = await client.post(
        "/api/auth/login",
        json={"email": "nobody@example.com", "password": "AnyPassword123!"},
    )
    assert no_user.status_code == 401


# ---------------------------------------------------------------------------
# Refresh token rotation
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_refresh_token_rotation(client: AsyncClient):
    signup_resp = await client.post(
        "/api/auth/signup",
        json={
            "email": "rotate.test@example.com",
            "password": "RotatePassword123!",
            "name": "Rotate Tester",
            "accept_terms": True,
        },
    )
    initial = signup_resp.json()
    rf_token = initial["refresh_token"]

    # Exchange refresh token
    refresh_resp = await client.post("/api/auth/refresh", json={"refresh_token": rf_token})
    assert refresh_resp.status_code == 200
    new_tokens = refresh_resp.json()
    assert new_tokens["access_token"] != initial["access_token"]
    assert new_tokens["refresh_token"] != rf_token

    # Reuse the old token — must be rejected (single-use rotation)
    reuse_resp = await client.post("/api/auth/refresh", json={"refresh_token": rf_token})
    assert reuse_resp.status_code == 401

    # The new token from reuse-detected family must also be revoked
    family_resp = await client.post("/api/auth/refresh", json={"refresh_token": new_tokens["refresh_token"]})
    assert family_resp.status_code == 401


@pytest.mark.asyncio
async def test_parallel_refresh_one_success_family_revoked_on_reuse(client: AsyncClient):
    """Gate test: Simultaneous refresh with identical token must succeed at most once."""
    signup_resp = await client.post(
        "/api/auth/signup",
        json={
            "email": "parallel.refresh@example.com",
            "password": "ParallelPassword123!",
            "name": "Parallel Tester",
            "accept_terms": True,
        },
    )
    rf_token = signup_resp.json()["refresh_token"]

    resp_a, resp_b = await asyncio.gather(
        client.post("/api/auth/refresh", json={"refresh_token": rf_token}),
        client.post("/api/auth/refresh", json={"refresh_token": rf_token}),
    )
    statuses = sorted([resp_a.status_code, resp_b.status_code])
    # Exactly one succeeded (200) and the other detected reuse/revocation (401)
    assert statuses == [200, 401], f"Expected [200, 401] but got {statuses}"


# ---------------------------------------------------------------------------
# GET /me
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_get_me_includes_name_and_prefs(client: AsyncClient):
    signup_resp = await client.post(
        "/api/auth/signup",
        json={
            "email": "me.test@example.com",
            "password": "MePassword123!",
            "name": "Me Tester",
            "accept_terms": True,
        },
    )
    access_token = signup_resp.json()["access_token"]

    me_resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert me_resp.status_code == 200
    data = me_resp.json()
    assert data["email"] == "me.test@example.com"
    assert data["name"] == "Me Tester"
    assert "id" in data
    assert "timezone" in data
    assert "language" in data
    assert "font_size" in data


@pytest.mark.asyncio
async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    assert resp.status_code == 401
    data = resp.json()
    assert "error" in data
    assert "success" not in data


# ---------------------------------------------------------------------------
# Logout (does NOT require access token)
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_logout_without_access_token(client: AsyncClient):
    signup_resp = await client.post(
        "/api/auth/signup",
        json={
            "email": "logout.test@example.com",
            "password": "LogoutPassword123!",
            "name": "Logout Tester",
            "accept_terms": True,
        },
    )
    tokens = signup_resp.json()

    # Logout using only the refresh token (no Authorization header)
    logout_resp = await client.post(
        "/api/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert logout_resp.status_code == 200
    assert "message" in logout_resp.json()

    # Confirm the refresh token is now revoked
    refresh_after = await client.post(
        "/api/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh_after.status_code == 401


# ---------------------------------------------------------------------------
# Error envelope format
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_validation_error_envelope_is_flat(client: AsyncClient):
    resp = await client.post("/api/auth/signup", json={"email": "bad-email", "password": "x"})
    assert resp.status_code == 422
    data = resp.json()
    # Flat envelope
    assert "error" in data
    assert "code" in data
    # Old nested envelope must not be present
    assert "success" not in data
