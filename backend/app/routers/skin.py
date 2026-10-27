"""
Skin & Health Image Screening Router.
Stage A / Safety Gate: Image check is disabled until Stage G.
Returns 503 FEATURE_UNAVAILABLE ("Image check is not available yet").
"""

from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.core.errors import FeatureUnavailableException

router = APIRouter(prefix="/api/analyze", tags=["Skin & Health Screening"])


class SkinAnalysisResponse(BaseModel):
    message: str = "Image check is not available yet"


@router.post(
    "/skin",
    response_model=SkinAnalysisResponse,
    summary="Screen skin photo/video for awareness and education (Disabled until Stage G)",
)
async def screen_skin_image(
    file: UploadFile = File(...),
    note: str | None = Form(None),
    language: str | None = Form("en"),
    current_user: dict[str, Any] = Depends(get_current_user),
) -> SkinAnalysisResponse:
    """
    Skin and health image screening is not available yet.
    Returns 503 FEATURE_UNAVAILABLE.
    """
    raise FeatureUnavailableException("Image check is not available yet")
