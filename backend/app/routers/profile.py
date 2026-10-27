"""
Patient Profile and Encrypted Medical History Router for MediLens AI.

Route contract (matching frontend api.ts):
  GET  /api/profile          → {"profile": <MedicalHistory | null>}
  PUT  /api/profile          → {"profile": <MedicalHistory>}
  GET  /api/profile/me       → UserProfileResponse  (display info)
  PUT  /api/profile/me       → UserProfileResponse
  GET  /api/profile/medical-history  → alias for GET /api/profile
  PUT  /api/profile/medical-history  → alias for PUT /api/profile
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.core.deps import get_current_user
from app.core.errors import DecryptionError, MediLensException
from app.core.logging import logger
from app.core.security import field_encryptor
from app.db.indexes import DOCUMENTS_COLLECTION, MEDICINES_COLLECTION, PROFILES_COLLECTION
from app.db.mongo import get_database
from app.models.profile import (
    MedicalHistorySchema,
    UserProfileResponse,
    UserProfileUpdateRequest,
)

router = APIRouter(prefix="/api/profile", tags=["Patient Profile"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_profile_doc(db: Any, user_id: str) -> dict[str, Any] | None:
    return await db[PROFILES_COLLECTION].find_one({"user_id": user_id})


async def _count_stats(db: Any, user_id: str) -> tuple[int, int]:
    """Returns (analyzed_reports_count, upcoming_meds_count)."""
    from datetime import date

    today_str = date.today().isoformat()
    reports_count = await db[DOCUMENTS_COLLECTION].count_documents(
        {"user_id": user_id, "status": "completed"}
    )
    upcoming_count = await db[MEDICINES_COLLECTION].count_documents(
        {"user_id": user_id, "is_active": True, "start_date": {"$lte": today_str}}
    )
    return reports_count, upcoming_count


# ---------------------------------------------------------------------------
# Medical history — primary routes (frontend contract)
# ---------------------------------------------------------------------------


@router.get("", summary="Get patient medical history (frontend contract)")
async def get_profile(current_user: dict[str, Any] = Depends(get_current_user)) -> JSONResponse:
    """
    Returns the encrypted medical history decrypted in memory.
    Returns {"profile": null} if no history has been saved yet.
    Never overwrites data — raises DATA_UNREADABLE if decryption fails.
    """
    db = get_database()
    user_id = current_user["id"]

    profile = await _get_profile_doc(db, user_id)
    if not profile or not profile.get("medical_history_encrypted"):
        return JSONResponse(status_code=200, content={"profile": None})

    try:
        decrypted = field_encryptor.decrypt(
            profile["medical_history_encrypted"],
            user_id=user_id,
            as_json=True,
        )
    except DecryptionError as err:
        logger.error("Medical history decryption failed for user %s", user_id)
        raise MediLensException(
            message=(
                "Your medical history could not be decrypted. "
                "Please contact support — do not save new data until this is resolved."
            ),
            code="DATA_UNREADABLE",
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        ) from err

    if not isinstance(decrypted, dict):
        return JSONResponse(status_code=200, content={"profile": None})

    # Validate through schema before returning
    history = MedicalHistorySchema(**decrypted)
    return JSONResponse(status_code=200, content={"profile": history.model_dump()})


@router.put("", summary="Save patient medical history (frontend contract)")
async def save_profile(
    history: MedicalHistorySchema,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> JSONResponse:
    """
    Encrypts and persists medical history.
    Returns {"profile": <saved data>}.
    """
    db = get_database()
    user_id = current_user["id"]

    history_dict = history.model_dump()
    encrypted_blob = field_encryptor.encrypt(history_dict, user_id=user_id)

    now = datetime.now(UTC)
    await db[PROFILES_COLLECTION].update_one(
        {"user_id": user_id},
        {
            "$set": {
                "medical_history_encrypted": encrypted_blob,
                "updated_at": now,
            }
        },
        upsert=True,
    )

    return JSONResponse(status_code=200, content={"profile": history.model_dump()})


# Aliases for backward compatibility
router.add_api_route(
    "/medical-history",
    get_profile,
    methods=["GET"],
    summary="Get medical history (alias)",
    tags=["Patient Profile"],
)
router.add_api_route(
    "/medical-history",
    save_profile,
    methods=["PUT"],
    summary="Save medical history (alias)",
    tags=["Patient Profile"],
)


# ---------------------------------------------------------------------------
# Display profile — name / caregiver / dashboard counts
# ---------------------------------------------------------------------------


@router.get("/me", response_model=UserProfileResponse, summary="Get display profile")
async def get_display_profile(current_user: dict[str, Any] = Depends(get_current_user)) -> UserProfileResponse:
    """Returns patient display profile (name, caregiver, dashboard stats)."""
    db = get_database()
    user_id = current_user["id"]

    profile = await _get_profile_doc(db, user_id)
    reports_count, upcoming_count = await _count_stats(db, user_id)

    if not profile:
        return UserProfileResponse(
            name=current_user.get("name", ""),
            role="patient",
            caregiverName="",
            caregiverLinked=False,
            activeReportsCount=reports_count,
            upcomingMedsCount=upcoming_count,
        )

    return UserProfileResponse(
        name=profile.get("name") or current_user.get("name", ""),
        role=profile.get("role", "patient"),
        caregiverName=profile.get("caregiver_name") or "",
        caregiverLinked=bool(profile.get("caregiver_linked", False)),
        activeReportsCount=reports_count,
        upcomingMedsCount=upcoming_count,
    )


@router.put("/me", response_model=UserProfileResponse, summary="Update display profile")
@router.patch("/me", response_model=UserProfileResponse, summary="Update display profile (partial)")
async def update_display_profile(
    req: UserProfileUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> UserProfileResponse:
    """Updates display name and caregiver info."""
    db = get_database()
    user_id = current_user["id"]

    update_fields: dict[str, Any] = {"updated_at": datetime.now(UTC)}
    if req.name is not None:
        update_fields["name"] = req.name.strip()
    if req.caregiverName is not None:
        update_fields["caregiver_name"] = req.caregiverName.strip()
    if req.caregiverLinked is not None:
        update_fields["caregiver_linked"] = req.caregiverLinked

    await db[PROFILES_COLLECTION].update_one(
        {"user_id": user_id},
        {"$set": update_fields},
        upsert=True,
    )

    return await get_display_profile(current_user)


class PharmacyUpdateRequest(UserProfileUpdateRequest):
    name: str = ""
    phone: str = ""


@router.put("/pharmacy", summary="Update designated pharmacy details")
async def update_pharmacy(
    req: PharmacyUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Saves patient's designated pharmacy name and contact phone on their profile."""
    db = get_database()
    user_id = current_user["id"]
    pharmacy_data = {"name": req.name.strip(), "phone": req.phone.strip()}

    await db[PROFILES_COLLECTION].update_one(
        {"user_id": user_id},
        {"$set": {"pharmacy": pharmacy_data, "updated_at": datetime.now(UTC)}},
        upsert=True,
    )

    return {"pharmacy": pharmacy_data}

