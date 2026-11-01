"""
Health Document, Lab Finding, and OCR Extraction Schemas.
Fully matches Part C3 DocumentDetail & DocumentListItem contracts.
"""

from typing import Literal

from pydantic import BaseModel, Field


class SourceItem(BaseModel):
    name: Literal["MedlinePlus", "WHO", "NIH"] = "MedlinePlus"
    title: str = "MedlinePlus Medical Reference"
    url: str = "https://medlineplus.gov/"


class FindingItem(BaseModel):
    testName: str = Field(..., description="Standardized or printed lab test name")
    testNameHi: str | None = None
    value: str = Field(..., description="Observed patient test value")
    unit: str = Field("", description="Measurement unit (e.g., 'mg/dL', 'mmol/L')")
    referenceRange: str = Field("", description="Report's printed normal reference interval")
    status: Literal["normal", "high", "low", "unknown", "elevated"] = "normal"
    critical: bool = False
    confidence: float = Field(0.95, ge=0.0, le=1.0, description="Extraction confidence score from 0.0 to 1.0")
    confirmationStatus: Literal["ok", "needs_confirmation", "unreadable"] = Field(
        "ok", description="Grounding confirmation status: ok, needs_confirmation, unreadable"
    )
    needs_confirmation: bool = Field(False, description="Flag for user verification before save")
    explanation: str = Field("", description="Plain-language educational summary of this biomarker")
    explanationHi: str | None = None
    whyItMatters: str | None = None
    whyItMattersHi: str | None = None
    whatIsIt: str | None = None
    whatIsItHi: str | None = None
    ifHigh: list[str] = Field(default_factory=list)
    ifHighHi: list[str] = Field(default_factory=list)
    ifLow: list[str] = Field(default_factory=list)
    ifLowHi: list[str] = Field(default_factory=list)
    needsReview: bool = False
    sources: list[SourceItem] = Field(default_factory=list)
    # Backward compatibility fields
    sourceCitation: str | None = None
    sourceUrl: str | None = None


class ExtractedMedicine(BaseModel):
    name: str
    strength: str | None = None
    dosage: str | None = None
    frequency: str | None = None
    suggestedTimes: list[str] = Field(default_factory=lambda: ["08:00"])
    withFood: Literal["before", "after", "with", "any"] | None = None
    durationDays: int | None = None
    doctorInstructions: str | None = None
    doctorInstructionsHi: str | None = None
    usedFor: str | None = None
    usedForHi: str | None = None
    generalInfo: str | None = None
    generalInfoHi: str | None = None
    commonSideEffects: list[str] = Field(default_factory=list)
    generalCautions: list[str] = Field(default_factory=list)
    confidence: float = Field(0.95, ge=0.0, le=1.0, description="Medicine extraction confidence score")
    confirmationStatus: Literal["ok", "needs_confirmation", "unreadable"] = Field(
        "ok", description="Medicine grounding status: ok, needs_confirmation, unreadable"
    )
    needs_confirmation: bool = Field(False, description="Flag for user verification before save")
    unclear: bool = False
    needsReview: bool = False
    sources: list[SourceItem] = Field(default_factory=list)


class MedicalTermItem(BaseModel):
    term: str
    termHi: str | None = None
    simpleEn: str
    simpleHi: str


class PipelineStep(BaseModel):
    id: Literal[1, 2, 3, 4, 5]
    title: str
    description: str
    status: Literal["done", "active", "pending"]
    tag: str | None = None


class HealthDocumentResponse(BaseModel):
    id: str
    title: str
    date: str
    category: str = "Diagnostic Lab"
    provider: str | None = None
    badgeText: str = "Explained"
    badgeType: Literal["warning", "active", "success", "info"] = "active"
    questionsCount: int = 0
    type: Literal["lab", "prescription", "imaging", "note"] = "lab"
    language: str = "en"
    status: Literal["processing", "done", "completed", "failed"] = "done"
    progress: int = 100
    pipelineSteps: list[PipelineStep] = Field(default_factory=list)
    unclearItems: list[str] = Field(default_factory=list)
    summary: str | None = None
    findings: list[FindingItem] = Field(default_factory=list)
    medicines: list[ExtractedMedicine] = Field(default_factory=list)
    plainLanguageSummary: str | None = None
    plainLanguageSummaryHi: str | None = None
    doctorQuestions: list[str] = Field(default_factory=list)
    doctorQuestionsHi: list[str] = Field(default_factory=list)
    conditionContext: str | None = None
    conditionContextHi: str | None = None
    medicalTermsExplained: list[MedicalTermItem] = Field(default_factory=list)
    urgentFlags: list[str] = Field(default_factory=list)
    sources: list[SourceItem] = Field(default_factory=list)
    disclaimer: str = (
        "MediLens AI provides health education only. Not a medical diagnosis. "
        "Always consult your doctor before changing treatments or making health decisions."
    )


class DocumentProgressResponse(BaseModel):
    id: str
    status: str = Field(..., description="'uploading' | 'processing' | 'completed' | 'done' | 'failed'")
    progress: int = Field(..., ge=0, le=100, description="Processing percentage (0 to 100)")
    step: str = Field("Analysis in progress", description="Current pipeline stage description")
    message: str | None = None


class DocumentUploadAsyncResponse(BaseModel):
    id: str
    status: str = "processing"
    message: str = "Document accepted for processing"


class DocumentListPaginatedResponse(BaseModel):
    items: list[HealthDocumentResponse]
    page: int = 1
    pageSize: int = 20
    total: int = 0


class UpdateDocumentRequest(BaseModel):
    findings: list[FindingItem] | None = None
    medicines: list[ExtractedMedicine] | None = None
    language: str | None = None
    notes: str | None = None

    model_config = {"extra": "ignore"}
