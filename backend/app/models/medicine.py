"""
Medication, Schedule, Dose Logging, and Refill Alert Pydantic Models.
Strictly matches React TypeScript frontend contracts and Part C5.
"""

from typing import Literal

from pydantic import BaseModel, Field


class MedicationCreateRequest(BaseModel):
    name: str = Field(..., description="Medication name with strength (e.g., 'Metformin 500mg')")
    dosage: str = Field(..., description="Dosage instructions (e.g., '1 tablet with meal')")
    instructions: str = Field("Take as directed", description="Patient-friendly instructions")
    notes: str | None = None
    times: list[str] = Field(default_factory=lambda: ["08:00"], description="Scheduled dose times in HH:MM format")
    startDate: str = Field(default_factory=lambda: "2026-01-01", description="Start date YYYY-MM-DD")
    endDate: str | None = None
    timeSlot: str = Field("MORNING", description="'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT'")
    timeDisplay: str = Field("8:00 AM", description="Formatted time string")
    category: str = Field("Routine Care", description="Therapeutic category")
    advisory: str | None = None
    loggedBy: str | None = "Self"
    pillsTotal: int | None = None
    pillsLeft: int | None = 30
    pharmacy: str | None = None
    prescriptionNumber: str | None = None
    phone: str | None = None
    source: Literal["manual", "prescription"] = "manual"
    sourceDocId: str | None = None
    timezone: str = "Asia/Kolkata"


class BulkMedicationRequest(BaseModel):
    medicines: list[MedicationCreateRequest]


class MedicationUpdateRequest(BaseModel):
    name: str | None = None
    dosage: str | None = None
    instructions: str | None = None
    notes: str | None = None
    times: list[str] | None = None
    startDate: str | None = None
    endDate: str | None = None
    timeSlot: str | None = None
    timeDisplay: str | None = None
    category: str | None = None
    advisory: str | None = None
    pillsLeft: int | None = None
    pharmacy: str | None = None
    phone: str | None = None
    isActive: bool | None = None


class MedicationResponse(BaseModel):
    id: str
    name: str
    dosage: str
    instructions: str
    timeSlot: str = "MORNING"
    timeDisplay: str = "8:00 AM"
    times: list[str] = Field(default_factory=lambda: ["08:00"])
    taken: bool = False
    takenAt: str | None = None
    category: str = "Routine Care"
    loggedBy: str | None = "Self"
    advisory: str | None = None
    dueStatus: str | None = "normal"
    dueStatusType: str | None = "normal"
    pillsLeft: int | None = None
    pillsTotal: int | None = None


class Dose(BaseModel):
    medicineId: str
    name: str
    dosage: str
    instructions: str
    advisory: str | None = None
    category: str = "Routine Care"
    time: str  # HH:MM
    date: str  # YYYY-MM-DD
    timeSlot: Literal["MORNING", "AFTERNOON", "EVENING", "NIGHT"]
    timeDisplay: str  # "8:00 AM"
    status: Literal["pending", "taken", "snoozed", "skipped", "missed"]
    takenAt: str | None = None
    snoozedUntil: str | None = None
    loggedBy: str | None = None
    dueStatus: str
    dueStatusType: Literal["normal", "due-soon", "taken", "upcoming", "missed"]


class DoseScheduleResponse(BaseModel):
    doses: list[Dose]


class DoseLogActionRequest(BaseModel):
    date: str
    time: str
    status: Literal["taken", "snoozed", "skipped", "pending"] = "taken"


class DoseLogRequest(BaseModel):
    scheduledDate: str | None = None
    notes: str | None = None


class SnoozeDoseRequest(BaseModel):
    minutes: int = Field(15, ge=5, le=120)


class PharmacyInfo(BaseModel):
    name: str = ""
    phone: str = ""


class RefillAlertResponse(BaseModel):
    id: str
    medicationName: str
    pillsLeft: int
    daysRemaining: int
    pharmacy: str | None = None
    prescriptionNumber: str | None = None
    phone: str | None = None


class DayAdherenceItem(BaseModel):
    key: str
    label: str
    dayNum: str
    taken: bool
    totalDoses: int
    takenDoses: int


class AdherenceStatsResponse(BaseModel):
    percentage: int
    takenCount: int
    totalCount: int
    streakDays: int
    weeklyOverview: list[DayAdherenceItem]


class AdherenceDayItem(BaseModel):
    date: str
    scheduled: int
    taken: int


class AdherenceHistoryResponse(BaseModel):
    days: list[AdherenceDayItem]
