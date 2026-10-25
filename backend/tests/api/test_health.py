"""
API Integration Tests for Health and Diagnostics Endpoints.
"""

from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Verifies that the root route returns service metadata and non-diagnosis disclaimer."""
    response = await client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert data["status"] == "operational"
    assert "disclaimer" in data
    assert "does not provide medical diagnosis" in data["disclaimer"]


@pytest.mark.asyncio
async def test_liveness_probe(client: AsyncClient):
    """Verifies the /api/health liveness check returns 200 OK with ok: true."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["ok"] is True
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_liveness_alias_probe(client: AsyncClient):
    """Verifies the /api/health/live alias returns 200 OK."""
    response = await client.get("/api/health/live")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["ok"] is True


@pytest.mark.asyncio
async def test_readiness_probe_healthy(client: AsyncClient):
    """Verifies readiness probe returns 200 and healthy status when MongoDB responds."""
    response = await client.get("/api/health/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"]["status"] == "connected"
    assert "uptime_seconds" in data
    # Version and environment are removed from public readiness response for security
    assert "version" not in data
    assert "environment" not in data


@pytest.mark.asyncio
async def test_readiness_probe_unhealthy(client: AsyncClient):
    """Verifies readiness probe returns 503 when MongoDB ping fails without leaking raw error text."""
    with patch("app.routers.health.ping_mongo", new_callable=AsyncMock) as mock_ping:
        mock_ping.return_value = {
            "status": "unavailable",
            "latency_ms": None,
        }
        response = await client.get("/api/health/ready")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"]["status"] == "unavailable"
        # No raw internal error message leaked
        assert "error" not in data["database"] or data["database"]["error"] is None


@pytest.mark.asyncio
async def test_404_error_envelope(client: AsyncClient):
    """Verifies unknown routes return the standardized flat MediLens error envelope."""
    response = await client.get("/api/non-existent-endpoint")
    assert response.status_code == 404
    data = response.json()
    # Flat error envelope: {"error": "...", "code": "..."}
    assert "error" in data
    assert data["code"] == "HTTP_404"
    assert "success" not in data
