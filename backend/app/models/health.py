"""
Health Check and System Diagnostics Pydantic Models.
"""

from datetime import UTC, datetime

from pydantic import BaseModel, Field


class DatabaseHealth(BaseModel):
    status: str = Field(..., description="'connected' or 'unavailable'")
    latency_ms: float | None = Field(None, description="Roundtrip ping latency in milliseconds")


class LivenessResponse(BaseModel):
    ok: bool = True
    status: str = "ok"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class HealthResponse(BaseModel):
    status: str = Field(..., description="'healthy' or 'unhealthy'")
    uptime_seconds: float
    database: DatabaseHealth
