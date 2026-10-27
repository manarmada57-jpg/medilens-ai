"""
Authentication Router for MediLens AI.
Endpoints for registration, login, rotating refresh token exchange,
logout, account management, and password operations.
"""

import secrets
from datetime import UTC, datetime
from typing import Any

import pymongo.errors
from bson import ObjectId
from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import Response

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.errors import MediLensException, UnauthorizedException, ValidationException
from app.core.logging import logger
from app.core.security import (
    check_needs_rehash,
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    verify_password,
)
from app.db.indexes import (
    AUDIT_LOGS_COLLECTION,
    DOCUMENTS_COLLECTION,
    DOSE_LOGS_COLLECTION,
    MEDICINES_COLLECTION,
    PROFILES_COLLECTION,
    REFRESH_TOKENS_COLLECTION,
    USERS_COLLECTION,
)
from app.db.mongo import get_database
from app.models.user import (
    DeleteMeRequest,
    MeUpdateRequest,
    PasswordChangeRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserInfo,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


async def write_audit_log(
    db: Any,
    *,
    user_id: str | None,
    action: str,
    ip: str | None = None,
    success: bool = True,
) -> None:
    """Writes a privacy-safe audit log entry (no health data, no tokens)."""
    try:
        await db[AUDIT_LOGS_COLLECTION].insert_one(
            {
                "user_id": user_id,
                "action": action,
                "ip": ip,
                "success": success,
                "timestamp": datetime.now(UTC),
            }
        )
    except Exception as exc:
        logger.warning("Audit log write failed: %s", type(exc).__name__)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _build_token_response(
    access_token: str,
    refresh_token: str,
    user_id: str,
    name: str,
    email: str,
    timezone: str = "Asia/Kolkata",
    language: str = "en",
    font_size: str = "normal",
) -> TokenResponse:
    return TokenResponse(
        token=access_token,
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(
            id=user_id,
            name=name,
            email=email,
            timezone=timezone,
            language=language,
            font_size=font_size,
        ),
    )


# ---------------------------------------------------------------------------
# Signup
# ---------------------------------------------------------------------------


@router.post(
    "/signup",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient/user",
)
async def signup(req: UserSignupRequest, request: Request) -> TokenResponse:
    """Creates a new patient account with Argon2 password hashing and returns auth tokens."""
    if not req.accept_terms:
        raise ValidationException("You must accept the terms of service and privacy policy")

    db = get_database()
    email_clean = req.email.lower().strip()
    name_clean = req.name.strip()

    hashed = hash_password(req.password)
    now = datetime.now(UTC)

    # Check duplicate email explicitly for in-memory mock and concurrent guarantees
    existing = await db[USERS_COLLECTION].find_one({"email": email_clean})
    if existing:
        raise MediLensException(
            message="An account with this email address already exists",
            code="EMAIL_EXISTS",
            status_code=status.HTTP_409_CONFLICT,
        )

    user_tz = req.timezone or "Asia/Kolkata"
    user_lang = req.language or "en"

    user_doc: dict[str, Any] = {
        "email": email_clean,
        "name": name_clean,
        "hashed_password": hashed,
        "is_active": True,
        "timezone": user_tz,
        "language": user_lang,
        "font_size": "normal",
        "consent": {"terms_at": now, "privacy_at": now},
        "created_at": now,
        "updated_at": now,
    }

    try:
        result = await db[USERS_COLLECTION].insert_one(user_doc)
    except pymongo.errors.DuplicateKeyError as err:
        raise MediLensException(
            message="An account with this email address already exists",
            code="EMAIL_EXISTS",
            status_code=status.HTTP_409_CONFLICT,
        ) from err

    user_id = str(result.inserted_id)

    # Initialize default patient profile — compensate if this fails
    profile_doc: dict[str, Any] = {
        "user_id": user_id,
        "name": name_clean,
        "role": "patient",
        "caregiver_name": "",
        "caregiver_linked": False,
        "active_reports_count": 0,
        "upcoming_meds_count": 0,
        "medical_history_encrypted": None,
        "created_at": now,
        "updated_at": now,
    }
    try:
        await db[PROFILES_COLLECTION].insert_one(profile_doc)
    except Exception as exc:
        # Compensating delete so the email can be reused
        await db[USERS_COLLECTION].delete_one({"_id": result.inserted_id})
        raise MediLensException(
            message="Account setup failed. Please try again.",
            code="SIGNUP_FAILED",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from exc

    access_token = create_access_token(user_id)
    raw_refresh, token_hash, family_id, expires_at = generate_refresh_token(user_id)

    await db[REFRESH_TOKENS_COLLECTION].insert_one(
        {
            "user_id": user_id,
            "token_hash": token_hash,
            "family_id": family_id,
            "expires_at": expires_at,
            "revoked": False,
            "created_at": now,
        }
    )

    await write_audit_log(db, user_id=user_id, action="signup", ip=_client_ip(request))
    logger.info("New user registered: [ID: %s]", user_id)

    return _build_token_response(access_token, raw_refresh, user_id, name_clean, email_clean, user_tz, user_lang, "normal")


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------


@router.post("/login", response_model=TokenResponse, summary="Log in with email and password")
async def login(req: UserLoginRequest, request: Request) -> TokenResponse:
    """Authenticates patient credentials and issues new access and refresh tokens."""
    db = get_database()
    email_clean = req.email.lower().strip()

    user = await db[USERS_COLLECTION].find_one({"email": email_clean})

    # Always run verify_password regardless of whether user exists (constant-time defence)
    password_ok = verify_password(req.password, user.get("hashed_password") if user else None)

    if not user or not password_ok:
        await write_audit_log(
            db,
            user_id=str(user["_id"]) if user else None,
            action="login_failed",
            ip=_client_ip(request),
            success=False,
        )
        raise UnauthorizedException("Invalid email address or password")

    if not user.get("is_active", True):
        raise UnauthorizedException("This account is currently deactivated")

    user_id = str(user["_id"])
    name = user.get("name", email_clean.split("@")[0].capitalize())
    now = datetime.now(UTC)

    # Opportunistic rehash if cost parameters have been upgraded
    if check_needs_rehash(user["hashed_password"]):
        new_hash = hash_password(req.password)
        await db[USERS_COLLECTION].update_one(
            {"_id": user["_id"]},
            {"$set": {"hashed_password": new_hash, "updated_at": now}},
        )

    access_token = create_access_token(user_id)
    raw_refresh, token_hash, family_id, expires_at = generate_refresh_token(user_id)

    await db[REFRESH_TOKENS_COLLECTION].insert_one(
        {
            "user_id": user_id,
            "token_hash": token_hash,
            "family_id": family_id,
            "expires_at": expires_at,
            "revoked": False,
            "created_at": now,
        }
    )

    await write_audit_log(db, user_id=user_id, action="login", ip=_client_ip(request))
    return _build_token_response(
        access_token,
        raw_refresh,
        user_id,
        name,
        email_clean,
        user.get("timezone", "Asia/Kolkata"),
        user.get("language", "en"),
        user.get("font_size", "normal"),
    )


# ---------------------------------------------------------------------------
# Refresh Token Rotation (atomic + reuse detection)
# ---------------------------------------------------------------------------


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and issue new access token",
)
async def refresh_tokens(req: RefreshTokenRequest) -> TokenResponse:
    """
    Atomically exchanges an active refresh token for a new token pair.
    Detects reuse: if a revoked token from an active family is submitted,
    the entire family is revoked (all sessions for that login chain).
    """
    db = get_database()
    token_hash = hash_refresh_token(req.refresh_token)
    now = datetime.now(UTC)

    # Atomic find-and-revoke in one round trip
    record = await db[REFRESH_TOKENS_COLLECTION].find_one_and_update(
        {"token_hash": token_hash, "revoked": False, "expires_at": {"$gt": now}},
        {"$set": {"revoked": True, "revoked_at": now}},
        return_document=True,
    )

    if record is None:
        # Check if the token exists but is already revoked → reuse attempt
        existing = await db[REFRESH_TOKENS_COLLECTION].find_one({"token_hash": token_hash})
        if existing and existing.get("family_id"):
            # Revoke the entire family to invalidate all sessions from this login chain
            await db[REFRESH_TOKENS_COLLECTION].update_many(
                {"family_id": existing["family_id"]},
                {"$set": {"revoked": True, "revoked_at": now, "revoke_reason": "reuse_detected"}},
            )
            logger.warning(
                "Refresh token reuse detected — family %s revoked",
                str(existing.get("family_id", ""))[:8],
            )
        raise UnauthorizedException("Refresh token is invalid, expired, or has already been used")

    user_id = record["user_id"]
    family_id = record.get("family_id") or secrets.token_hex(16)

    # Verify user still exists and is active
    user = await db[USERS_COLLECTION].find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise UnauthorizedException("User account no longer exists or is deactivated")

    name = user.get("name", "")
    email = user.get("email", "")

    new_access = create_access_token(user_id)
    new_raw, new_hash, _, new_expires = generate_refresh_token(user_id, family_id=family_id)

    await db[REFRESH_TOKENS_COLLECTION].insert_one(
        {
            "user_id": user_id,
            "token_hash": new_hash,
            "family_id": family_id,
            "expires_at": new_expires,
            "revoked": False,
            "created_at": now,
        }
    )

    return _build_token_response(
        new_access,
        new_raw,
        user_id,
        name,
        email,
        user.get("timezone", "Asia/Kolkata"),
        user.get("language", "en"),
        user.get("font_size", "normal"),
    )


# ---------------------------------------------------------------------------
# Logout
# ---------------------------------------------------------------------------


@router.post("/logout", summary="Revoke active refresh token session")
async def logout(req: RefreshTokenRequest, request: Request) -> dict[str, Any]:
    """
    Revokes a refresh token (and its whole family).
    Does NOT require an access token — an expired access token must not block logout.
    """
    db = get_database()
    token_hash = hash_refresh_token(req.refresh_token)
    now = datetime.now(UTC)

    record = await db[REFRESH_TOKENS_COLLECTION].find_one({"token_hash": token_hash})
    if record:
        family_id = record.get("family_id")
        if family_id:
            await db[REFRESH_TOKENS_COLLECTION].update_many(
                {"family_id": family_id},
                {"$set": {"revoked": True, "revoked_at": now}},
            )
        else:
            await db[REFRESH_TOKENS_COLLECTION].update_one(
                {"_id": record["_id"]},
                {"$set": {"revoked": True, "revoked_at": now}},
            )
        await write_audit_log(db, user_id=record.get("user_id"), action="logout", ip=_client_ip(request))

    return {"message": "Successfully logged out"}


@router.post("/logout-all", summary="Revoke all sessions for the current user")
async def logout_all(
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Revokes every active refresh token for the authenticated user."""
    db = get_database()
    user_id = current_user["id"]
    now = datetime.now(UTC)

    await db[REFRESH_TOKENS_COLLECTION].update_many(
        {"user_id": user_id, "revoked": False},
        {"$set": {"revoked": True, "revoked_at": now}},
    )

    await write_audit_log(db, user_id=user_id, action="logout_all", ip=_client_ip(request))
    return {"message": "All sessions have been revoked"}


# ---------------------------------------------------------------------------
# Current user — get / update / delete
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserResponse, summary="Get current user details")
async def get_me(current_user: dict[str, Any] = Depends(get_current_user)) -> UserResponse:
    """Returns account details of the authenticated patient."""
    return UserResponse(
        id=current_user["id"],
        name=current_user.get("name", ""),
        email=current_user["email"],
        timezone=current_user.get("timezone", "Asia/Kolkata"),
        language=current_user.get("language", "en"),
        font_size=current_user.get("font_size", "normal"),
        is_active=current_user.get("is_active", True),
        created_at=current_user["created_at"],
    )


@router.patch("/me", response_model=UserResponse, summary="Update profile preferences")
async def update_me(
    req: MeUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserResponse:
    """Updates name, timezone, language, or font size for the authenticated user."""
    import zoneinfo

    db = get_database()
    user_id = current_user["id"]
    updates: dict[str, Any] = {"updated_at": datetime.now(UTC)}

    if req.name is not None:
        updates["name"] = req.name.strip()
    if req.timezone is not None:
        try:
            zoneinfo.ZoneInfo(req.timezone)
            updates["timezone"] = req.timezone
        except (zoneinfo.ZoneInfoNotFoundError, KeyError) as err:
            raise ValidationException(f"Unknown timezone: {req.timezone}") from err
    if req.language is not None:
        if req.language not in ("en", "hi"):
            raise ValidationException("language must be 'en' or 'hi'")
        updates["language"] = req.language
    if req.font_size is not None:
        if req.font_size not in ("normal", "large", "xlarge"):
            raise ValidationException("font_size must be 'normal', 'large', or 'xlarge'")
        updates["font_size"] = req.font_size

    await db[USERS_COLLECTION].update_one({"_id": ObjectId(user_id)}, {"$set": updates})

    updated = await db[USERS_COLLECTION].find_one({"_id": ObjectId(user_id)})
    assert updated is not None
    updated["id"] = str(updated["_id"])

    return UserResponse(
        id=updated["id"],
        name=updated.get("name", ""),
        email=updated["email"],
        timezone=updated.get("timezone", "Asia/Kolkata"),
        language=updated.get("language", "en"),
        font_size=updated.get("font_size", "normal"),
        is_active=updated.get("is_active", True),
        created_at=updated["created_at"],
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT, summary="Delete account")
async def delete_me(
    req: DeleteMeRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Permanently deletes the account and all associated data. Requires password confirmation."""
    db = get_database()
    user_id = current_user["id"]

    if not verify_password(req.password, current_user.get("hashed_password")):
        raise UnauthorizedException("Password confirmation is incorrect")

    # Write audit log before deletion (after this the user no longer exists)
    await write_audit_log(db, user_id=user_id, action="account_deleted", ip=_client_ip(request))

    # Delete all user data
    await db[REFRESH_TOKENS_COLLECTION].delete_many({"user_id": user_id})
    await db[PROFILES_COLLECTION].delete_many({"user_id": user_id})
    await db[DOCUMENTS_COLLECTION].delete_many({"user_id": user_id})
    await db[MEDICINES_COLLECTION].delete_many({"user_id": user_id})
    await db[DOSE_LOGS_COLLECTION].delete_many({"user_id": user_id})
    await db[USERS_COLLECTION].delete_one({"_id": ObjectId(user_id)})

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Password management
# ---------------------------------------------------------------------------


@router.post("/password/change", summary="Change password and revoke all sessions")
async def change_password(
    req: PasswordChangeRequest,
    request: Request,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Changes the user's password and revokes all active refresh token sessions."""
    db = get_database()
    user_id = current_user["id"]

    if not verify_password(req.current_password, current_user.get("hashed_password")):
        raise UnauthorizedException("Current password is incorrect")

    new_hash = hash_password(req.new_password)
    now = datetime.now(UTC)

    await db[USERS_COLLECTION].update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"hashed_password": new_hash, "password_changed_at": now, "updated_at": now}},
    )

    # Revoke all active sessions
    await db[REFRESH_TOKENS_COLLECTION].update_many(
        {"user_id": user_id, "revoked": False},
        {"$set": {"revoked": True, "revoked_at": now}},
    )

    await write_audit_log(db, user_id=user_id, action="password_changed", ip=_client_ip(request))
    return {"message": "Password changed successfully. Please log in again."}
