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
    value: str = Field(..., description="Observed patient test value")
    unit: str = Field("", description="Measurement unit (e.g., 'mg/dL', 'mmol/L')")
    referenceRange: str = Field("", description="Report's printed normal reference interval")
    status: Literal["normal", "high", "low", "unknown", "elevated"] = "normal"
    critical: bool = False
    explanation: str = Field(..., description="Plain-language educational summary of this biomarker")
    whyItMatters: str | None = None
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
    usedFor: str | None = None
    generalInfo: str | None = None
    commonSideEffects: list[str] = Field(default_factory=list)
    generalCautions: list[str] = Field(default_factory=list)
    unclear: bool = False
    needsReview: bool = False
    sources: list[SourceItem] = Field(default_factory=list)


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
    status: Literal["processing", "done", "completed", "failed"] = "done"
    progress: int = 100
    pipelineSteps: list[PipelineStep] = Field(default_factory=list)
    unclearItems: list[str] = Field(default_factory=list)
    summary: str | None = None
    findings: list[FindingItem] = Field(default_factory=list)
    medicines: list[ExtractedMedicine] = Field(default_factory=list)
    plainLanguageSummary: str | None = None
    doctorQuestions: list[str] = Field(default_factory=list)
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
