"""
System Health and Diagnostics Router.
Provides standard Kubernetes/Docker liveness and readiness endpoints.
"""

import time

from fastapi import APIRouter, Response, status

from app.db.mongo import ping_mongo
from app.models.health import DatabaseHealth, HealthResponse, LivenessResponse

router = APIRouter(prefix="/api/health", tags=["System Health"])

# Track startup timestamp for uptime calculations
APP_START_TIME = time.time()


@router.get("", response_model=LivenessResponse, summary="Liveness Probe")
@router.get("/live", response_model=LivenessResponse, summary="Liveness Probe (Alias)")
async def liveness() -> LivenessResponse:
    """
    Returns 200 OK if the FastAPI process is responsive.
    Does not touch external dependencies.
    """
    return LivenessResponse(ok=True, status="ok")


@router.get("/ready", response_model=HealthResponse, summary="Readiness Probe")
async def readiness(response: Response) -> HealthResponse:
    """
    Evaluates database connectivity.
    Returns 200 OK when ready, 503 when DB is down.
    Does NOT expose raw error text to clients.
    """
    db_result = await ping_mongo()
    db_health = DatabaseHealth(
        status=db_result["status"],
        latency_ms=db_result.get("latency_ms"),
    )

    is_ready = db_health.status == "connected"
    overall_status = "healthy" if is_ready else "unhealthy"

    if not is_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    uptime = round(time.time() - APP_START_TIME, 2)

    return HealthResponse(
        status=overall_status,
        uptime_seconds=uptime,
        database=db_health,
    )
