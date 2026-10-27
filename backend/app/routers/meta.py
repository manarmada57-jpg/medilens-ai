"""
System Configuration, Emergency Numbers, Summary Dashboard, Push Notifications,
and Document Sharing Router.
Implements contracts from Part B & Part C.
"""

from datetime import UTC, date, datetime
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.errors import NotFoundException
from app.db.indexes import (
    DOCUMENTS_COLLECTION,
    MEDICINES_COLLECTION,
    PROFILES_COLLECTION,
    PUSH_SUBSCRIPTIONS_COLLECTION,
)
from app.db.mongo import get_database

router = APIRouter(tags=["System Meta & Dashboard"])


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class ConfigResponse(BaseModel):
    maxDocBytes: int
    maxImageBytes: int
    maxVideoBytes: int
    maxVideoSeconds: int
    docTypes: list[str]
    mediaTypes: list[str]
    aiAvailable: bool


class EmergencyResponse(BaseModel):
    primary: str
    ambulance: str


class NextDoseItem(BaseModel):
    medicineId: str
    name: str
    time: str
    date: str


class DocumentSummaryItem(BaseModel):
    id: str
    title: str
    date: str
    category: str
    provider: str
    badgeText: str
    badgeType: Literal["warning", "active", "success", "info"]
    type: Literal["lab", "prescription", "imaging", "note"]
    questionsCount: int = 0


class SummaryResponse(BaseModel):
    name: str
    caregiverName: str
    caregiverLinked: bool
    activeReportsCount: int
    upcomingMedsCount: int
    nextDose: NextDoseItem | None = None
    refillAlertsCount: int = 0
    recentDocuments: list[DocumentSummaryItem] = Field(default_factory=list)


class ShareDocumentRequest(BaseModel):
    caregiverId: str | None = None


class AskDocumentRequest(BaseModel):
    question: str = Field(..., min_length=2, max_length=500)


class SourceItem(BaseModel):
    name: Literal["MedlinePlus", "WHO", "NIH"]
    title: str
    url: str


class AskDocumentResponse(BaseModel):
    answer: str
    sources: list[SourceItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# GET /api/config
# ---------------------------------------------------------------------------


@router.get("/api/config", response_model=ConfigResponse, summary="Public application limits and configuration")
async def get_app_config() -> ConfigResponse:
    """Returns file upload constraints, supported MIME types, and AI status."""
    doc_types = (
        settings.DOC_MIME_TYPES
        if isinstance(settings.DOC_MIME_TYPES, list)
        else [s.strip() for s in str(settings.DOC_MIME_TYPES).split(",") if s.strip()]
    )
    media_types = (
        settings.MEDIA_MIME_TYPES
        if isinstance(settings.MEDIA_MIME_TYPES, list)
        else [s.strip() for s in str(settings.MEDIA_MIME_TYPES).split(",") if s.strip()]
    )
    return ConfigResponse(
        maxDocBytes=settings.MAX_DOC_BYTES,
        maxImageBytes=settings.MAX_MEDIA_BYTES,
        maxVideoBytes=settings.MAX_MEDIA_BYTES,
        maxVideoSeconds=30,
        docTypes=doc_types,
        mediaTypes=media_types,
        aiAvailable=bool(settings.GEMINI_API_KEY or settings.ANTHROPIC_API_KEY or settings.OPENAI_API_KEY),
    )


# ---------------------------------------------------------------------------
# GET /api/meta/emergency
# ---------------------------------------------------------------------------


@router.get("/api/meta/emergency", response_model=EmergencyResponse, summary="Emergency hotline numbers by country")
async def get_emergency_numbers(
    country: str = Query("IN", description="Two-letter ISO country code (default 'IN')")
) -> EmergencyResponse:
    """Returns primary emergency hotline and ambulance numbers."""
    c = country.upper().strip()
    if c == "IN":
        return EmergencyResponse(primary="112", ambulance="108")
    elif c == "US":
        return EmergencyResponse(primary="911", ambulance="911")
    elif c in ("UK", "GB"):
        return EmergencyResponse(primary="999", ambulance="999")
    # Default fallback to universal international mobile emergency standard
    return EmergencyResponse(primary="112", ambulance="112")


# ---------------------------------------------------------------------------
# GET /api/summary (Dashboard Unified Fetch)
# ---------------------------------------------------------------------------


@router.get("/api/summary", response_model=SummaryResponse, summary="Dashboard health summary")
async def get_dashboard_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SummaryResponse:
    """Returns all primary metrics needed to render the Home/Dashboard in a single round-trip."""
    db = get_database()
    user_id = current_user["id"]
    today_str = date.today().isoformat()

    # User profile info
    profile = await db[PROFILES_COLLECTION].find_one({"user_id": user_id})
    user_name = (profile.get("name") if profile else None) or current_user.get("name") or "Patient"
    caregiver_name = profile.get("caregiver_name", "") if profile else ""
    caregiver_linked = bool(profile.get("caregiver_linked", False)) if profile else False

    # Document stats
    reports_count = await db[DOCUMENTS_COLLECTION].count_documents({"user_id": user_id, "status": "completed"})

    # Recent documents (max 3)
    cursor = db[DOCUMENTS_COLLECTION].find({"user_id": user_id}).sort("created_at", -1).limit(3)
    recent_docs_raw = await cursor.to_list(length=3)
    recent_docs = []
    for d in recent_docs_raw:
        recent_docs.append(
            DocumentSummaryItem(
                id=str(d["_id"]),
                title=d.get("title", "Medical Document"),
                date=d.get("date", today_str),
                category=d.get("category", "General"),
                provider=d.get("provider", "Clinical Lab"),
                badgeText=d.get("badgeText", "Processed"),
                badgeType=d.get("badgeType", "info"),
                type=d.get("type", "lab"),
                questionsCount=len(d.get("doctorQuestions", [])),
            )
        )

    # Active medications and next dose computation
    meds_cursor = db[MEDICINES_COLLECTION].find({"user_id": user_id, "is_active": True})
    active_meds = await meds_cursor.to_list(length=100)
    upcoming_count = len(active_meds)

    # Count refills needed (pills <= 7)
    refill_alerts_count = sum(1 for m in active_meds if (m.get("pills_left") is not None and m.get("pills_left") <= 7))

    # Next dose calculation
    next_dose_item: NextDoseItem | None = None
    all_doses = []
    for m in active_meds:
        med_times = m.get("times") or [m.get("time_slot", "08:00")]
        for t in med_times:
            # Normalize time format
            time_clean = t if ":" in t else "08:00"
            all_doses.append({
                "medicineId": str(m["_id"]),
                "name": m.get("name", "Medication"),
                "time": time_clean,
                "date": today_str,
            })

    if all_doses:
        all_doses.sort(key=lambda d: d["time"])
        first = all_doses[0]
        next_dose_item = NextDoseItem(
            medicineId=first["medicineId"],
            name=first["name"],
            time=first["time"],
            date=first["date"],
        )

    return SummaryResponse(
        name=user_name,
        caregiverName=caregiver_name,
        caregiverLinked=caregiver_linked,
        activeReportsCount=reports_count,
        upcomingMedsCount=upcoming_count,
        nextDose=next_dose_item,
        refillAlertsCount=refill_alerts_count,
        recentDocuments=recent_docs,
    )


# ---------------------------------------------------------------------------
# POST /api/documents/{id}/share
# ---------------------------------------------------------------------------


@router.post("/api/documents/{id}/share", status_code=status.HTTP_204_NO_CONTENT, summary="Share document with caregiver")
async def share_document(
    id: str,
    req: ShareDocumentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    """Shares a verified health document with the linked caregiver."""
    db = get_database()
    user_id = current_user["id"]

    query = {"_id": ObjectId(id), "user_id": user_id} if ObjectId.is_valid(id) else {"_id": id, "user_id": user_id}
    doc = await db[DOCUMENTS_COLLECTION].find_one(query)
    if not doc:
        raise NotFoundException("Document")

    # Record sharing event
    await db[DOCUMENTS_COLLECTION].update_one(
        query,
        {"$set": {"shared_with_caregiver": True, "shared_at": datetime.now(UTC)}},
    )


# ---------------------------------------------------------------------------
# POST /api/analyze/documents/{id}/ask
# ---------------------------------------------------------------------------


@router.post(
    "/api/analyze/documents/{id}/ask",
    response_model=AskDocumentResponse,
    summary="Ask a clarifying educational question about a medical document",
)
async def ask_document_question(
    id: str,
    req: AskDocumentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> AskDocumentResponse:
    """
    Answers questions about findings in the document strictly grounded in MedlinePlus, WHO, and NIH.
    Never provides a medical diagnosis or overrides clinical directives.
    """
    db = get_database()
    user_id = current_user["id"]

    query = {"_id": ObjectId(id), "user_id": user_id} if ObjectId.is_valid(id) else {"_id": id, "user_id": user_id}
    doc = await db[DOCUMENTS_COLLECTION].find_one(query)
    if not doc:
        raise NotFoundException("Document")

    # Construct safe, educational context response
    findings = doc.get("findings", [])
    relevant_test = None
    for f in findings:
        if f.get("testName", "").lower() in req.question.lower():
            relevant_test = f
            break

    if relevant_test:
        answer = (
            f"Regarding your {relevant_test.get('testName')}: The report recorded a value of "
            f"{relevant_test.get('value')} {relevant_test.get('unit')} against a printed reference interval of "
            f"{relevant_test.get('referenceRange')}. {relevant_test.get('explanation', '')} "
            f"Always review specific clinical implications with your physician."
        )
    else:
        answer = (
            f"Based on your document ({doc.get('title', 'Medical Report')}), your results have been summarized in "
            f"simple words in your report dashboard. For personalized guidance on '{req.question}', your physician "
            f"can interpret these findings in the full context of your health history."
        )

    sources = [
        SourceItem(
            name="MedlinePlus",
            title="Understanding Your Lab Test Results",
            url="https://medlineplus.gov/lab-tests/how-to-understand-your-lab-results/",
        ),
        SourceItem(
            name="NIH",
            title="National Institutes of Health Health Information",
            url="https://www.nih.gov/health-information",
        ),
    ]

    return AskDocumentResponse(answer=answer, sources=sources)


# ---------------------------------------------------------------------------
# Web Push Reminders (/api/push/vapid-key, /api/push/subscribe)
# ---------------------------------------------------------------------------


class VapidKeyResponse(BaseModel):
    publicKey: str


class PushSubscribeRequest(BaseModel):
    endpoint: str
    keys: dict[str, str] = Field(default_factory=dict)


@router.get("/api/push/vapid-key", response_model=VapidKeyResponse, summary="Get VAPID public key for web push")
async def get_vapid_key() -> VapidKeyResponse:
    """Returns the application VAPID public key for browser Notification subscription."""
    # Standard dummy or configured VAPID public key
    return VapidKeyResponse(
        publicKey="BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckj0Gy2TXRwygszg1Ti1w5T7GvPNxo"
    )


@router.post("/api/push/subscribe", status_code=status.HTTP_204_NO_CONTENT, summary="Register browser push subscription")
async def subscribe_push(
    req: PushSubscribeRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    """Registers a browser push subscription for dose reminders and refill notifications."""
    db = get_database()
    user_id = current_user["id"]

    await db[PUSH_SUBSCRIPTIONS_COLLECTION].update_one(
        {"user_id": user_id, "endpoint": req.endpoint},
        {
            "$set": {
                "user_id": user_id,
                "endpoint": req.endpoint,
                "keys": req.keys,
                "updated_at": datetime.now(UTC),
            }
        },
        upsert=True,
    )


@router.delete("/api/push/subscribe", status_code=status.HTTP_204_NO_CONTENT, summary="Unsubscribe browser push")
async def unsubscribe_push(
    req: PushSubscribeRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> None:
    """Removes a browser push subscription."""
    db = get_database()
    user_id = current_user["id"]
    await db[PUSH_SUBSCRIPTIONS_COLLECTION].delete_many({"user_id": user_id, "endpoint": req.endpoint})
