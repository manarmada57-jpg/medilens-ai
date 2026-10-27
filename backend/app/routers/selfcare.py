"""
Evidence-Based AI Self-Care Guides and Patient Data Management Router.
Grounded in WHO, NIH, and MedlinePlus.
Supports GDPR and India DPDP Act data export and right to be forgotten.
"""

from datetime import UTC, datetime
from typing import Any, Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.core.security import field_encryptor
from app.db.indexes import (
    DOCUMENTS_COLLECTION,
    DOSE_LOGS_COLLECTION,
    MEDICINES_COLLECTION,
    PROFILES_COLLECTION,
    REFRESH_TOKENS_COLLECTION,
    USERS_COLLECTION,
)
from app.db.mongo import get_database

router = APIRouter(tags=["Self-Care & Data Privacy"])


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class SelfCareHabitItem(BaseModel):
    title: str
    description: str
    frequency: str
    category: str  # 'lifestyle' | 'nutrition' | 'monitoring'
    citationSource: str
    citationUrl: str


class SelfCareGuideResponse(BaseModel):
    condition: str
    overview: str
    dailyHabits: list[SelfCareHabitItem]
    whenToContactDoctor: list[str]
    emergencyFlags: list[str]
    disclaimer: str = (
        "General lifestyle guidance (pending doctor review) derived from WHO, NIH, and MedlinePlus resources. "
        "Always follow your physician's personalized clinical directives."
    )


class SourceItem(BaseModel):
    name: Literal["MedlinePlus", "WHO", "NIH"]
    title: str
    url: str


class SelfCareSection(BaseModel):
    heading: str
    items: list[str]


class SelfCareDetailResponse(BaseModel):
    id: str
    title: str
    sections: list[SelfCareSection]
    redFlags: list[str]
    sources: list[SourceItem]
    disclaimer: str = (
        "General lifestyle guidance (pending doctor review) derived from WHO, NIH, and MedlinePlus resources. "
        "Never replaces a doctor's advice."
    )


class ConditionListItem(BaseModel):
    id: str
    title: str


# ---------------------------------------------------------------------------
# Knowledge Catalog (WHO / NIH / MedlinePlus)
# ---------------------------------------------------------------------------


SELFCARE_CATALOG: dict[str, dict[str, Any]] = {
    "Diabetes": {
        "id": "type-2-diabetes",
        "condition": "Type 2 Diabetes Mellitus",
        "title": "Type 2 Diabetes Self-Care Guide",
        "overview": "Managing glucose effectively involves balanced meal timing, regular moderate movement, and consistent medication timing as prescribed.",
        "daily_habits": [
            SelfCareHabitItem(
                title="Consistent Meal Scheduling",
                description="Space carbohydrates evenly throughout the day to support steady energy levels.",
                frequency="Daily with meals",
                category="nutrition",
                citationSource="NIH / NIDDK Diabetes Guidelines",
                citationUrl="https://www.niddk.nih.gov/health-information/diabetes",
            ),
            SelfCareHabitItem(
                title="Post-Meal Physical Activity",
                description="A gentle 10 to 15-minute walk after lunch or dinner encourages muscle uptake of glucose.",
                frequency="Daily",
                category="lifestyle",
                citationSource="WHO Physical Activity & Diabetes",
                citationUrl="https://www.who.int/news-room/fact-sheets/detail/diabetes",
            ),
            SelfCareHabitItem(
                title="Foot & Skin Check",
                description="Inspect feet daily for minor cuts, blisters, or redness to prevent undetected infections.",
                frequency="Every evening",
                category="monitoring",
                citationSource="MedlinePlus Diabetic Foot Care",
                citationUrl="https://medlineplus.gov/diabeticfoot.html",
            ),
        ],
        "when_to_contact_doctor": [
            "Frequent fasting blood glucose readings consistently exceeding 160 mg/dL",
            "Episodes of shakiness, dizziness, or sweating relieved by fast-acting sugar",
            "Persistent nausea or changes in appetite",
        ],
        "emergency_flags": [
            "Fruiting breath odor, rapid breathing, and extreme confusion (Ketoacidosis alert)",
            "Blood glucose reading above 400 mg/dL with persistent vomiting",
        ],
        "sections": [
            {
                "heading": "Daily Nutrition & Medication",
                "items": [
                    "Space carbohydrates evenly across meals to avoid glucose spikes.",
                    "Discuss individualized nutritional strategies with your healthcare provider.",
                    "Hydrate primarily with water, avoiding sweetened fruit beverages.",
                ],
            },
            {
                "heading": "Physical Activity & Foot Care",
                "items": [
                    "Aim for at least 150 minutes of moderate aerobic activity weekly.",
                    "Walk 10–15 minutes after main meals to improve insulin response.",
                    "Examine feet daily for unnoticed scratches, redness, or blisters.",
                ],
            },
        ],
        "sources": [
            {
                "name": "NIH",
                "title": "NIDDK Managing Diabetes",
                "url": "https://www.niddk.nih.gov/health-information/diabetes/overview/managing-type-2-diabetes",
            },
            {
                "name": "WHO",
                "title": "WHO Diabetes Factsheet",
                "url": "https://www.who.int/news-room/fact-sheets/detail/diabetes",
            },
            {
                "name": "MedlinePlus",
                "title": "MedlinePlus Diabetes Overview",
                "url": "https://medlineplus.gov/diabetes.html",
            },
        ],
    },
    "Hypertension": {
        "id": "hypertension",
        "condition": "Hypertension (High Blood Pressure)",
        "title": "Hypertension Management Guide",
        "overview": "Blood pressure management focuses on sodium moderation, stress reduction, and consistent daily wellness routines (pending doctor review).",
        "daily_habits": [
            SelfCareHabitItem(
                title="Sodium Awareness",
                description="Aim for less than 2,000 mg of sodium daily. Use herbs and spices in place of table salt.",
                frequency="Daily",
                category="nutrition",
                citationSource="WHO Guidelines on Sodium Intake",
                citationUrl="https://www.who.int/publications/i/item/9789241504836",
            ),
            SelfCareHabitItem(
                title="Morning Pressure Check",
                description="Sit quietly for 5 minutes before recording your morning blood pressure reading.",
                frequency="Daily before breakfast",
                category="monitoring",
                citationSource="NIH / NHLBI High Blood Pressure",
                citationUrl="https://www.nhlbi.nih.gov/health/high-blood-pressure",
            ),
            SelfCareHabitItem(
                title="Deep Breathing Practice",
                description="5 minutes of slow, paced breathing (4-second inhale, 6-second exhale) reduces sympathetic vascular tension.",
                frequency="Twice daily",
                category="lifestyle",
                citationSource="MedlinePlus Stress & Blood Pressure",
                citationUrl="https://medlineplus.gov/ency/article/001948.htm",
            ),
        ],
        "when_to_contact_doctor": [
            "Systolic reading consistently above 140 mmHg or diastolic above 90 mmHg across 3 days",
            "Morning headaches accompanied by blurred vision",
            "Swelling in the ankles or feet that does not resolve after elevating legs",
        ],
        "emergency_flags": [
            "Sudden severe chest pressure, pain radiating to arm, jaw, or back (Call 112 / 108 immediately)",
            "Blood pressure exceeding 180/120 mmHg with shortness of breath or numbness",
        ],
        "sections": [
            {
                "heading": "Dietary Sodium & Minerals",
                "items": [
                    "Limit daily sodium intake to under 2,000 mg (approx. 1 teaspoon of table salt).",
                    "Incorporate potassium-rich vegetables (spinach, tomatoes, sweet potatoes) if advised by your physician.",
                    "Avoid licorice root supplements, which can increase vascular tone.",
                ],
            },
            {
                "heading": "Medication Timing & Stress Control",
                "items": [
                    "Take all prescribed blood pressure medications at consistent times as directed by your physician.",
                    "Practice 5 minutes of relaxed diaphragmatic breathing twice a day.",
                    "Limit alcohol and quit smoking to protect arterial elasticity.",
                ],
            },
        ],
        "sources": [
            {
                "name": "WHO",
                "title": "WHO Hypertension Fact Sheet",
                "url": "https://www.who.int/news-room/fact-sheets/detail/hypertension",
            },
            {
                "name": "NIH",
                "title": "NHLBI High Blood Pressure Guidelines",
                "url": "https://www.nhlbi.nih.gov/health/high-blood-pressure",
            },
        ],
    },
    "Migraine": {
        "id": "migraine",
        "condition": "Migraine & Chronic Headache",
        "title": "Migraine Relief & Prevention Guide",
        "overview": "Effective migraine control centers on identifying triggers, steady hydration, consistent sleep schedules, and early intervention at aura onset.",
        "daily_habits": [
            SelfCareHabitItem(
                title="Trigger Diary",
                description="Log lighting, skipped meals, stress, or specific foods preceding headache episodes.",
                frequency="Daily / as episodes occur",
                category="monitoring",
                citationSource="NIH / NINDS Headache Information",
                citationUrl="https://www.ninds.nih.gov/health-information/disorders/headache",
            ),
            SelfCareHabitItem(
                title="Consistent Sleep Architecture",
                description="Wake up and go to sleep at identical times every day, including weekends. Sleep shifts are a primary trigger.",
                frequency="Nightly",
                category="lifestyle",
                citationSource="MedlinePlus Migraine Prevention",
                citationUrl="https://medlineplus.gov/migraine.html",
            ),
            SelfCareHabitItem(
                title="Hydration Milestone",
                description="Drink 8 glasses (2 liters) of water steadily throughout the daytime hours to prevent dehydration headaches.",
                frequency="Throughout daytime",
                category="nutrition",
                citationSource="WHO Headache Fact Sheet",
                citationUrl="https://www.who.int/news-room/fact-sheets/detail/headache-disorders",
            ),
        ],
        "when_to_contact_doctor": [
            "Headaches occurring more than 3 times per week",
            "Pain requiring escalating non-prescription pain relievers",
        ],
        "emergency_flags": [
            "Sudden 'thunderclap' headache reaching maximum intensity within seconds",
            "Headache accompanied by high fever, stiff neck, and confusion",
        ],
        "sections": [
            {
                "heading": "Trigger Management & Environment",
                "items": [
                    "Rest in a quiet, darkened room during initial symptom onset.",
                    "Apply a cool compress or ice pack gently to the forehead or neck.",
                    "Avoid aged cheeses, processed meats, and artificial sweeteners if known triggers.",
                ],
            },
            {
                "heading": "Hydration & Sleep Stability",
                "items": [
                    "Maintain steady circadian rhythms by going to sleep at the same hour daily.",
                    "Sip water continuously; avoid long fasting intervals between meals.",
                    "Minimize harsh blue light from screens during evening hours.",
                ],
            },
        ],
        "sources": [
            {
                "name": "WHO",
                "title": "WHO Headache Disorders",
                "url": "https://www.who.int/news-room/fact-sheets/detail/headache-disorders",
            },
            {
                "name": "NIH",
                "title": "NINDS Migraine Information Page",
                "url": "https://www.ninds.nih.gov/health-information/disorders/migraine",
            },
        ],
    },
}


# ---------------------------------------------------------------------------
# GET /api/selfcare (Index & Guide Fetch)
# ---------------------------------------------------------------------------


@router.get("/api/selfcare", summary="Get evidence-based self-care index or guide")
async def get_self_care(
    condition: str | None = Query(None, description="Condition name: 'Diabetes', 'Hypertension', 'Migraine'"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    If condition query parameter is provided, returns that specific guide.
    If omitted, returns the list of supported educational health conditions.
    """
    if not condition:
        return {
            "conditions": [
                {"id": "migraine", "title": "Migraine Management"},
                {"id": "type-2-diabetes", "title": "Type 2 Diabetes"},
                {"id": "hypertension", "title": "Hypertension"},
            ]
        }

    # Match condition
    for key, guide in SELFCARE_CATALOG.items():
        if key.lower() in condition.lower() or condition.lower() in key.lower():
            return SelfCareGuideResponse(
                condition=guide["condition"],
                overview=guide["overview"],
                dailyHabits=guide["daily_habits"],
                whenToContactDoctor=guide["when_to_contact_doctor"],
                emergencyFlags=guide["emergency_flags"],
            )

    default_g = SELFCARE_CATALOG["Diabetes"]
    return SelfCareGuideResponse(
        condition=default_g["condition"],
        overview=default_g["overview"],
        dailyHabits=default_g["daily_habits"],
        whenToContactDoctor=default_g["when_to_contact_doctor"],
        emergencyFlags=default_g["emergency_flags"],
    )


# ---------------------------------------------------------------------------
# GET /api/selfcare/{condition} (Part C6 Contract)
# ---------------------------------------------------------------------------


@router.get("/api/selfcare/{condition}", response_model=SelfCareDetailResponse, summary="Get full condition guide")
async def get_self_care_detail(
    condition: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SelfCareDetailResponse:
    """Returns detailed condition sections, red flags, and verified MedlinePlus/WHO/NIH citations."""
    cond_clean = condition.lower().replace("-", " ")
    for key, guide in SELFCARE_CATALOG.items():
        if key.lower() in cond_clean or cond_clean in key.lower() or guide["id"] in condition.lower():
            return SelfCareDetailResponse(
                id=guide["id"],
                title=guide["title"],
                sections=[SelfCareSection(**s) for s in guide["sections"]],
                redFlags=guide["emergency_flags"],
                sources=[SourceItem(**src) for src in guide["sources"]],
            )

    # Fallback default
    default_g = SELFCARE_CATALOG["Diabetes"]
    return SelfCareDetailResponse(
        id=default_g["id"],
        title=default_g["title"],
        sections=[SelfCareSection(**s) for s in default_g["sections"]],
        redFlags=default_g["emergency_flags"],
        sources=[SourceItem(**src) for src in default_g["sources"]],
    )


# ---------------------------------------------------------------------------
# GET /api/export & GET /api/profile/export (GDPR/DPDP Data Portability)
# ---------------------------------------------------------------------------


@router.get("/api/export", summary="Export all patient health data (Part C6)")
@router.get("/api/profile/export", summary="Export all patient health data (Alias)")
async def export_patient_data(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Exports all stored data for this patient as a clean, structured JSON file.
    Includes profile, decrypted medical history, medications, dose logs, and documents.
    """
    db = get_database()
    user_id = current_user["id"]

    profile = await db[PROFILES_COLLECTION].find_one({"user_id": user_id})
    med_history = None
    if profile and profile.get("medical_history_encrypted"):
        try:
            med_history = field_encryptor.decrypt(profile["medical_history_encrypted"], user_id=user_id, as_json=True)
        except Exception:
            med_history = None

    meds = await db[MEDICINES_COLLECTION].find({"user_id": user_id}, {"_id": 0, "user_id": 0}).to_list(100)
    logs = await db[DOSE_LOGS_COLLECTION].find({"user_id": user_id}, {"_id": 0, "user_id": 0}).to_list(500)
    docs = await db[DOCUMENTS_COLLECTION].find({"user_id": user_id}, {"_id": 0, "user_id": 0}).to_list(100)

    return {
        "export_timestamp": datetime.now(UTC).isoformat(),
        "disclaimer": "MediLens AI health education export. Protected under DPDP Act / GDPR data portability.",
        "patient": {
            "id": user_id,
            "email": current_user["email"],
            "name": profile.get("name", "") if profile else current_user.get("name", ""),
            "medical_history": med_history,
        },
        "medications": meds,
        "dose_logs": logs,
        "health_documents": docs,
    }


# ---------------------------------------------------------------------------
# DELETE /api/profile/delete-account (Legacy alias for DELETE /api/auth/me)
# ---------------------------------------------------------------------------


@router.delete("/api/profile/delete-account", summary="Permanent account deletion (Right to be Forgotten)")
async def delete_account_and_data(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Permanently erases all patient data across all collections."""
    db = get_database()
    user_id = current_user["id"]

    await db[USERS_COLLECTION].delete_one({"_id": current_user["_id"]})
    await db[PROFILES_COLLECTION].delete_many({"user_id": user_id})
    await db[DOCUMENTS_COLLECTION].delete_many({"user_id": user_id})
    await db[MEDICINES_COLLECTION].delete_many({"user_id": user_id})
    await db[DOSE_LOGS_COLLECTION].delete_many({"user_id": user_id})
    await db[REFRESH_TOKENS_COLLECTION].delete_many({"user_id": user_id})

    return {"success": True, "message": "All patient account records and health data have been permanently deleted."}
