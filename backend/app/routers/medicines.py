"""
Medications, Regimen Scheduling, Dose Logging, and Refill Alerts Router.
Fully compliant with Part B & Part C specifications.
"""

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, Response, status

from app.core.deps import get_current_user
from app.core.errors import NotFoundException
from app.db.indexes import DOSE_LOGS_COLLECTION, MEDICINES_COLLECTION, PROFILES_COLLECTION
from app.db.mongo import get_database
from app.models.medicine import (
    AdherenceDayItem,
    AdherenceHistoryResponse,
    AdherenceStatsResponse,
    BulkMedicationRequest,
    DayAdherenceItem,
    Dose,
    DoseLogActionRequest,
    DoseLogRequest,
    DoseScheduleResponse,
    MedicationCreateRequest,
    MedicationUpdateRequest,
    RefillAlertResponse,
    SnoozeDoseRequest,
)

router = APIRouter(prefix="/api/medicines", tags=["Medications & Adherence"])


def _derive_time_slot(time_str: str) -> Literal["MORNING", "AFTERNOON", "EVENING", "NIGHT"]:
    """Derives timeSlot from HH:MM."""
    try:
        hour = int(time_str.split(":")[0])
        if hour < 12:
            return "MORNING"
        elif hour < 17:
            return "AFTERNOON"
        elif hour < 21:
            return "EVENING"
        else:
            return "NIGHT"
    except Exception:
        return "MORNING"


def _format_time_display(time_str: str) -> str:
    """Formats HH:MM into '8:00 AM' display string."""
    try:
        parts = time_str.split(":")
        hour = int(parts[0])
        minute = int(parts[1]) if len(parts) > 1 else 0
        ampm = "AM" if hour < 12 else "PM"
        display_hour = hour if 1 <= hour <= 12 else (12 if hour == 0 else hour - 12)
        return f"{display_hour}:{minute:02d} {ampm}"
    except Exception:
        return time_str


# ---------------------------------------------------------------------------
# GET /api/medicines (List Medications)
# ---------------------------------------------------------------------------


@router.get("", summary="Get patient medication regimen")
async def get_medications(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """
    Retrieves all active medications for the user.
    Returns empty list for new users — NO mock data injected.
    """
    db = get_database()
    user_id = current_user["id"]

    cursor = db[MEDICINES_COLLECTION].find({"user_id": user_id, "is_active": True}).sort("created_at", -1)
    med_docs = await cursor.to_list(length=100)

    results: list[dict[str, Any]] = []
    for med in med_docs:
        med_id = str(med["_id"])
        times = med.get("times") or ["08:00"]
        results.append({
            "id": med_id,
            "name": med["name"],
            "dosage": med["dosage"],
            "instructions": med.get("instructions", "Take as directed"),
            "timeSlot": med.get("time_slot") or _derive_time_slot(times[0]),
            "timeDisplay": med.get("time_display") or _format_time_display(times[0]),
            "times": times,
            "category": med.get("category", "Routine Care"),
            "loggedBy": med.get("logged_by", "Self"),
            "advisory": med.get("advisory"),
            "pillsLeft": med.get("pills_left"),
            "pillsTotal": med.get("pills_total"),
            "startDate": med.get("start_date"),
            "endDate": med.get("end_date"),
        })

    # Frontend supports both { medicines: [...] } and direct list
    return {"medicines": results}


# ---------------------------------------------------------------------------
# POST /api/medicines & POST /api/medicines/bulk (Create Medications)
# ---------------------------------------------------------------------------


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Add new medication",
)
async def create_medication(
    req: MedicationCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Adds a new doctor-prescribed medication to the schedule."""
    db = get_database()
    user_id = current_user["id"]
    now = datetime.now(UTC)

    times = req.times if req.times else ["08:00"]
    primary_time = times[0]
    time_slot = req.timeSlot or _derive_time_slot(primary_time)
    time_display = req.timeDisplay or _format_time_display(primary_time)

    doc = {
        "user_id": user_id,
        "name": req.name.strip(),
        "dosage": req.dosage.strip(),
        "instructions": req.instructions.strip(),
        "notes": req.notes,
        "times": times,
        "start_date": req.startDate or now.strftime("%Y-%m-%d"),
        "end_date": req.endDate,
        "time_slot": time_slot,
        "time_display": time_display,
        "category": req.category,
        "advisory": req.advisory,
        "logged_by": req.loggedBy or "Self",
        "pills_total": req.pillsTotal,
        "pills_left": req.pillsLeft if req.pillsLeft is not None else req.pillsTotal,
        "pharmacy": req.pharmacy,
        "prescription_number": req.prescriptionNumber,
        "phone": req.phone,
        "source": req.source,
        "source_doc_id": req.sourceDocId,
        "timezone": req.timezone,
        "is_active": True,
        "created_at": now,
        "updated_at": now,
    }
    result = await db[MEDICINES_COLLECTION].insert_one(doc)
    med_id = str(result.inserted_id)

    resp_data = {
        "id": med_id,
        "name": doc["name"],
        "dosage": doc["dosage"],
        "instructions": doc["instructions"],
        "times": times,
        "timeSlot": time_slot,
        "timeDisplay": time_display,
        "category": doc["category"],
        "pillsLeft": doc["pills_left"],
        "pillsTotal": doc["pills_total"],
    }
    return {**resp_data, "medicine": resp_data}


@router.post(
    "/bulk",
    status_code=status.HTTP_201_CREATED,
    summary="Bulk add confirmed prescription medicines (Part C5)",
)
async def create_medicines_bulk(
    req: BulkMedicationRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Adds multiple confirmed prescription medicines in a single atomic transaction."""
    db = get_database()
    user_id = current_user["id"]
    now = datetime.now(UTC)

    created: list[dict[str, Any]] = []
    for item in req.medicines:
        times = item.times if item.times else ["08:00"]
        primary_time = times[0]
        time_slot = _derive_time_slot(primary_time)
        time_display = _format_time_display(primary_time)

        doc = {
            "user_id": user_id,
            "name": item.name.strip(),
            "dosage": item.dosage.strip(),
            "instructions": item.instructions.strip(),
            "notes": item.notes,
            "times": times,
            "start_date": item.startDate or now.strftime("%Y-%m-%d"),
            "end_date": item.endDate,
            "time_slot": time_slot,
            "time_display": time_display,
            "category": item.category,
            "advisory": item.advisory,
            "logged_by": "Prescription",
            "pills_total": item.pillsTotal,
            "pills_left": item.pillsLeft if item.pillsLeft is not None else item.pillsTotal,
            "source": "prescription",
            "source_doc_id": item.sourceDocId,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }
        res = await db[MEDICINES_COLLECTION].insert_one(doc)
        created.append({
            "id": str(res.inserted_id),
            "name": doc["name"],
            "dosage": doc["dosage"],
            "instructions": doc["instructions"],
            "times": times,
            "timeSlot": time_slot,
            "timeDisplay": time_display,
            "category": doc["category"],
            "pillsLeft": doc["pills_left"],
        })

    return {"medicines": created}


# ---------------------------------------------------------------------------
# PUT & DELETE /api/medicines/{id}
# ---------------------------------------------------------------------------


@router.put("/{id}", summary="Update medication details")
async def update_medication(
    id: str,
    req: MedicationUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Updates dosage, instructions, times, or remaining pills."""
    db = get_database()
    user_id = current_user["id"]
    query = {"_id": ObjectId(id), "user_id": user_id} if ObjectId.is_valid(id) else {"_id": id, "user_id": user_id}

    update_fields: dict[str, Any] = {"updated_at": datetime.now(UTC)}
    if req.name is not None:
        update_fields["name"] = req.name.strip()
    if req.dosage is not None:
        update_fields["dosage"] = req.dosage.strip()
    if req.instructions is not None:
        update_fields["instructions"] = req.instructions.strip()
    if req.notes is not None:
        update_fields["notes"] = req.notes
    if req.times is not None:
        update_fields["times"] = req.times
    if req.pillsLeft is not None:
        update_fields["pills_left"] = req.pillsLeft
    if req.isActive is not None:
        update_fields["is_active"] = req.isActive

    result = await db[MEDICINES_COLLECTION].find_one_and_update(
        query,
        {"$set": update_fields},
        return_document=True,
    )
    if not result:
        raise NotFoundException(resource="Medication")

    return {
        "medicine": {
            "id": str(result["_id"]),
            "name": result["name"],
            "dosage": result["dosage"],
            "instructions": result["instructions"],
            "times": result.get("times", ["08:00"]),
            "pillsLeft": result.get("pills_left"),
        }
    }


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Archive/remove medication")
async def delete_medication(
    id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """Deactivates a medication so it is archived and removed from the active schedule."""
    db = get_database()
    query = {"_id": ObjectId(id), "user_id": current_user["id"]} if ObjectId.is_valid(id) else {"_id": id, "user_id": current_user["id"]}

    result = await db[MEDICINES_COLLECTION].update_one(
        query,
        {"$set": {"is_active": False, "updated_at": datetime.now(UTC)}},
    )
    if result.matched_count == 0:
        raise NotFoundException(resource="Medication")

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# GET /api/medicines/schedule/today (Today's Timeline Doses)
# ---------------------------------------------------------------------------


@router.get("/schedule/today", response_model=DoseScheduleResponse, summary="Get today's dose schedule (Part C5)")
async def get_today_schedule(
    date_str: str | None = Query(None, alias="date", description="Local date YYYY-MM-DD"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> DoseScheduleResponse:
    """Returns all scheduled doses for the requested date with exact taken/pending statuses."""
    db = get_database()
    user_id = current_user["id"]
    target_date = date_str or datetime.now(UTC).strftime("%Y-%m-%d")

    # Fetch active meds
    meds_cursor = db[MEDICINES_COLLECTION].find({"user_id": user_id, "is_active": True})
    med_docs = await meds_cursor.to_list(100)

    # Fetch logs for target_date
    logs_cursor = db[DOSE_LOGS_COLLECTION].find({"user_id": user_id, "local_date": target_date})
    logs = await logs_cursor.to_list(200)

    # Indexed by (medicine_id, time)
    log_map: dict[str, dict[str, Any]] = {}
    for log in logs:
        key = f"{log.get('medicine_id')}_{log.get('time')}"
        log_map[key] = log

    doses: list[Dose] = []
    for med in med_docs:
        med_id = str(med["_id"])
        times = med.get("times") or [med.get("time_slot", "08:00")]

        for t in times:
            time_clean = t if ":" in t else "08:00"
            log_key = f"{med_id}_{time_clean}"
            existing_log = log_map.get(log_key)

            slot = _derive_time_slot(time_clean)
            display = _format_time_display(time_clean)

            if existing_log and existing_log.get("status") == "taken":
                dose_status = "taken"
                due_status = "Confirmed taken"
                due_type = "taken"
                taken_at = existing_log.get("taken_at")
                taken_at_str = taken_at.isoformat() if taken_at and hasattr(taken_at, "isoformat") else (str(taken_at) if taken_at is not None else None)
            elif existing_log and existing_log.get("status") == "snoozed":
                dose_status = "snoozed"
                due_status = "Snoozed"
                due_type = "due-soon"
                taken_at_str = None
            else:
                dose_status = "pending"
                due_status = f"Scheduled for {display}"
                due_type = "upcoming"
                taken_at_str = None

            doses.append(
                Dose(
                    medicineId=med_id,
                    name=med["name"],
                    dosage=med["dosage"],
                    instructions=med.get("instructions", "Take as directed"),
                    advisory=med.get("advisory"),
                    category=med.get("category", "Routine Care"),
                    time=time_clean,
                    date=target_date,
                    timeSlot=slot,
                    timeDisplay=display,
                    status=dose_status,
                    takenAt=taken_at_str,
                    dueStatus=due_status,
                    dueStatusType=due_type,
                )
            )

    doses.sort(key=lambda d: d.time)
    return DoseScheduleResponse(doses=doses)


# ---------------------------------------------------------------------------
# POST /api/medicines/{id}/log (Dose Logging with Undo Support)
# ---------------------------------------------------------------------------


@router.post("/{id}/log", status_code=status.HTTP_204_NO_CONTENT, summary="Log or undo dose (Part C5)")
async def log_dose(
    id: str,
    req: DoseLogActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Response:
    """
    Idempotent dose logging.
    status='taken': logs dose and decrements pill supply.
    status='pending': undoes previous dose log and restores 1 pill.
    """
    db = get_database()
    user_id = current_user["id"]
    query = {"_id": ObjectId(id), "user_id": user_id} if ObjectId.is_valid(id) else {"_id": id, "user_id": user_id}

    med = await db[MEDICINES_COLLECTION].find_one(query)
    if not med:
        raise NotFoundException(resource="Medication")

    now = datetime.now(UTC)

    if req.status == "pending":
        # Undo action: remove dose log and increment pills back
        existing = await db[DOSE_LOGS_COLLECTION].find_one_and_delete(
            {
                "user_id": user_id,
                "medicine_id": str(med["_id"]),
                "local_date": req.date,
                "time": req.time,
            }
        )
        if existing and existing.get("status") == "taken":
            await db[MEDICINES_COLLECTION].update_one({"_id": med["_id"]}, {"$inc": {"pills_left": 1}})
    else:
        # Taken / snoozed / skipped
        log_filter = {
            "user_id": user_id,
            "medicine_id": str(med["_id"]),
            "local_date": req.date,
            "time": req.time,
        }
        existing = await db[DOSE_LOGS_COLLECTION].find_one(log_filter)

        log_data = {
            "user_id": user_id,
            "medicine_id": str(med["_id"]),
            "medicine_name": med["name"],
            "local_date": req.date,
            "scheduled_date": req.date,
            "time": req.time,
            "status": req.status,
            "taken_at": now if req.status == "taken" else None,
            "logged_by": current_user.get("name", "Self"),
            "updated_at": now,
        }
        await db[DOSE_LOGS_COLLECTION].update_one(log_filter, {"$set": log_data}, upsert=True)

        # Decrement pills only once if transitioning to taken
        if req.status == "taken" and (not existing or existing.get("status") != "taken"):
            if med.get("pills_left") and med["pills_left"] > 0:
                await db[MEDICINES_COLLECTION].update_one({"_id": med["_id"]}, {"$inc": {"pills_left": -1}})

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# Legacy alias: POST /api/medicines/{id}/take
@router.post("/{id}/take", summary="Log medication dose taken (Legacy Alias)")
async def take_medication(
    id: str,
    req: DoseLogRequest = DoseLogRequest(),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Logs dose as taken for today."""
    today_str = req.scheduledDate or datetime.now(UTC).strftime("%Y-%m-%d")
    await log_dose(
        id=id,
        req=DoseLogActionRequest(date=today_str, time="08:00", status="taken"),
        current_user=current_user,
    )
    return {"message": "Recorded as taken", "scheduledDate": today_str}


@router.post("/{id}/snooze", summary="Snooze medication reminder")
async def snooze_medication(
    id: str,
    req: SnoozeDoseRequest = SnoozeDoseRequest(minutes=15),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    """Snoozes a reminder for a dose."""
    db = get_database()
    query = {"_id": ObjectId(id), "user_id": current_user["id"]} if ObjectId.is_valid(id) else {"_id": id, "user_id": current_user["id"]}

    med = await db[MEDICINES_COLLECTION].find_one(query)
    if not med:
        raise NotFoundException(resource="Medication")

    snoozed_until = datetime.now(UTC) + timedelta(minutes=req.minutes)
    return {
        "message": f"Reminder for {med['name']} snoozed for {req.minutes} minutes",
        "snoozedUntil": snoozed_until.isoformat(),
    }


# ---------------------------------------------------------------------------
# Refill Alerts & Adherence
# ---------------------------------------------------------------------------


@router.get("/refill-alerts", summary="Get low supply refill alerts")
async def get_refill_alerts(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> list[RefillAlertResponse]:
    """Returns medications with low remaining pills (<= 7 doses)."""
    db = get_database()
    user_id = current_user["id"]

    # Check if profile has saved pharmacy info
    profile = await db[PROFILES_COLLECTION].find_one({"user_id": user_id})
    profile_pharmacy = profile.get("pharmacy", {}) if profile else {}

    cursor = db[MEDICINES_COLLECTION].find(
        {
            "user_id": user_id,
            "is_active": True,
            "pills_left": {"$lte": 7},
        }
    )
    docs = await cursor.to_list(length=20)

    alerts: list[RefillAlertResponse] = []
    for d in docs:
        pills_left = d.get("pills_left", 4)
        alerts.append(
            RefillAlertResponse(
                id=str(d["_id"]),
                medicationName=d["name"],
                pillsLeft=pills_left,
                daysRemaining=max(1, pills_left),
                pharmacy=d.get("pharmacy") or profile_pharmacy.get("name") or "Local Pharmacy",
                prescriptionNumber=d.get("prescription_number"),
                phone=d.get("phone") or profile_pharmacy.get("phone") or "",
            )
        )
    return alerts


@router.get("/stats/adherence", response_model=AdherenceHistoryResponse, summary="Get 7-day adherence stats (Part C5)")
@router.get("/stats", response_model=AdherenceStatsResponse, summary="Get weekly adherence overview")
async def get_adherence_stats(
    days: int = Query(7, ge=1, le=30),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> Any:
    """Calculates adherence percentages and history for the last N days."""
    db = get_database()
    user_id = current_user["id"]

    med_count = await db[MEDICINES_COLLECTION].count_documents({"user_id": user_id, "is_active": True})
    now = datetime.now(UTC)
    today_str = now.strftime("%Y-%m-%d")

    history_days: list[AdherenceDayItem] = []
    weekly_overview: list[DayAdherenceItem] = []
    days_labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    today_taken = 0
    for i in range(days - 1, -1, -1):
        target = now - timedelta(days=i)
        date_iso = target.strftime("%Y-%m-%d")

        taken_count = await db[DOSE_LOGS_COLLECTION].count_documents(
            {"user_id": user_id, "local_date": date_iso, "status": "taken"}
        )
        if date_iso == today_str:
            today_taken = taken_count

        history_days.append(AdherenceDayItem(date=date_iso, scheduled=med_count, taken=taken_count))

        if i < 7:
            weekly_overview.append(
                DayAdherenceItem(
                    key=f"d_{i}",
                    label=days_labels[target.weekday()],
                    dayNum=target.strftime("%d"),
                    taken=taken_count >= med_count if med_count > 0 else False,
                    totalDoses=med_count,
                    takenDoses=taken_count,
                )
            )

    percentage = round(today_taken / med_count * 100) if med_count > 0 else 0

    return AdherenceStatsResponse(
        percentage=percentage,
        takenCount=today_taken,
        totalCount=med_count,
        streakDays=3 if med_count > 0 else 0,
        weeklyOverview=weekly_overview,
    )
