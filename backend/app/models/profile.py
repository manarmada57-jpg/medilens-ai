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
    dob: str | None = Field(None, description="Date of birth in ISO 8601 format (YYYY-MM-DD)")
    sex: Literal["Male", "Female", "Other", "Prefer not to say"] | None = None
    conditions: list[str] = Field(default_factory=list, max_length=50)
    allergyType: Literal["None", "Food", "Drug", "Environmental", "Other"] | None = Field(None)
    noKnownAllergies: bool = True
    specificAllergen: str | None = Field(None, max_length=200)
    currentMedicines: list[CurrentMedicineItem] = Field(default_factory=list, max_length=100)
    pastSurgeries: str | None = Field(None, max_length=1000)
    # uploadedFiles removed — use document IDs instead
    documentIds: list[str] = Field(default_factory=list)

    @field_validator("dob", mode="before")
    @classmethod
    def validate_dob(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        try:
            parsed = date.fromisoformat(str(v))
        except ValueError as err:
            raise ValueError("dob must be a valid ISO date (YYYY-MM-DD)") from err
        if parsed > date.today():
            raise ValueError("Date of birth cannot be in the future")
        return str(v)

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
