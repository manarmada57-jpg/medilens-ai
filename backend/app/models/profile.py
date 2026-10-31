"""
Patient Profile and Medical History Models.
Strictly matches React 19 + TypeScript frontend contracts.
"""

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class CurrentMedicineItem(BaseModel):
    name: str = Field("", max_length=200)
    dosage: str = Field("", max_length=100)


class UserProfileResponse(BaseModel):
    name: str = ""
    role: str = "patient"
    caregiverName: str = ""
    caregiverLinked: bool = False
    activeReportsCount: int = 0
    upcomingMedsCount: int = 0


class UserProfileUpdateRequest(BaseModel):
    name: str | None = None
    caregiverName: str | None = None
    caregiverLinked: bool | None = None


class MedicalHistorySchema(BaseModel):
    model_config = {"extra": "ignore"}

    dob: str | None = Field(None, description="Date of birth in ISO 8601 format (YYYY-MM-DD)")
    sex: Literal["Male", "Female", "Other", "Prefer not to say"] | None = None
    conditions: list[str] = Field(default_factory=list, max_length=50)
    allergyType: Literal["None", "Food", "Drug", "Environmental", "Other"] | None = Field(None)
    noKnownAllergies: bool = True
    specificAllergen: str | None = Field(None, max_length=200)
    currentMedicines: list[CurrentMedicineItem] = Field(default_factory=list, max_length=100)
    pastSurgeries: str | None = Field(None, max_length=1000)
    documentIds: list[str] = Field(default_factory=list)

    @field_validator("dob", mode="before")
    @classmethod
    def validate_dob(cls, v: object) -> str | None:
        if v is None or v == "":
            return None
        val_str = str(v).strip()
        if not val_str:
            return None
        from datetime import datetime
        parsed: date | None = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%m/%d/%Y", "%m-%d-%Y", "%Y/%m/%d"):
            try:
                parsed = datetime.strptime(val_str, fmt).date()
                break
            except ValueError:
                continue
        if not parsed:
            try:
                parsed = date.fromisoformat(val_str)
            except ValueError as err:
                raise ValueError("Date of birth must be a valid date (e.g. DD/MM/YYYY or YYYY-MM-DD)") from err
        if parsed > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return parsed.isoformat()

    @field_validator("sex", mode="before")
    @classmethod
    def validate_sex(cls, v: object) -> str | None:
        if not v or not str(v).strip():
            return None
        val = str(v).strip().lower()
        if val in ("female", "f"):
            return "Female"
        elif val in ("male", "m"):
            return "Male"
        elif val in ("other", "intersex"):
            return "Other"
        elif val in ("prefer not to say", "prefer_not", "prefer_not_to_say"):
            return "Prefer not to say"
        formatted = str(v).strip().title()
        if formatted in ("Male", "Female", "Other"):
            return formatted
        if formatted in ("Prefer Not To Say", "Prefer_Not_To_Say"):
            return "Prefer not to say"
        return None

    @field_validator("allergyType", mode="before")
    @classmethod
    def validate_allergy_type(cls, v: object) -> str | None:
        if not v or not str(v).strip():
            return None
        val = str(v).strip().lower()
        if val in ("medicine", "drug"):
            return "Drug"
        elif val == "food":
            return "Food"
        elif val == "environmental":
            return "Environmental"
        elif val == "none":
            return "None"
        elif val == "other":
            return "Other"
        formatted = str(v).strip().capitalize()
        if formatted in ("None", "Food", "Drug", "Environmental", "Other"):
            return formatted
        return None

    @field_validator("conditions", mode="before")
    @classmethod
    def validate_conditions(cls, v: list) -> list:
        truncated = []
        for item in v:
            s = str(item)
            if len(s) > 100:
                raise ValueError("Each condition entry must be 100 characters or fewer")
            truncated.append(s)
        return truncated
