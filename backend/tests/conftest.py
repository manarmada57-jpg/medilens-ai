"""
Pytest Fixtures and Test Environment Setup for MediLens AI.
Uses AsyncMongoMockClient for fast, isolated in-memory MongoDB testing.
"""

import os
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from cryptography.fernet import Fernet
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

# ---------------------------------------------------------------------------
# Force test environment variables BEFORE importing any app module
# ---------------------------------------------------------------------------
os.environ["APP_ENV"] = "testing"
os.environ["DEBUG"] = "false"
os.environ["MONGODB_URI"] = "mongodb://localhost:27017"
os.environ["MONGODB_DB_NAME"] = "medilens_test_db"
# A 64-char hex key — safe test-only value, not used in production
os.environ["SECRET_KEY"] = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2a3b4c5d6a7b8c9d0e1f2"
os.environ["JWT_ISSUER"] = "medilens-ai"
os.environ["JWT_AUDIENCE"] = "medilens-users"
os.environ["CORS_ORIGINS"] = "http://localhost:3000,http://localhost:5173"
# Generate a fresh valid Fernet key for each test session
os.environ["FIELD_ENCRYPTION_KEYS"] = Fernet.generate_key().decode()

from app.db.mongo import db_manager  # noqa: E402
from app.main import create_application  # noqa: E402


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def mock_db():
    """Provides a fresh isolated in-memory MongoDB database for each test."""
    client = AsyncMongoMockClient()
    db = client["medilens_test_db"]
    return db


@pytest.fixture
async def app_instance(mock_db):
    """Provides a fresh FastAPI test app instance with in-memory MongoDB."""
    mock_client = AsyncMongoMockClient()
    mock_client.admin.command = AsyncMock(return_value={"ok": 1.0})

    with (
        patch("app.main.connect_to_mongo", new_callable=AsyncMock),
        patch("app.main.close_mongo_connection", new_callable=AsyncMock),
        patch("app.main.create_indexes", new_callable=AsyncMock),
    ):
        db_manager.client = mock_client
        db_manager.db = mock_db

        app = create_application()
        yield app

        db_manager.client = None
        db_manager.db = None


@pytest.fixture
async def client(app_instance) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client bound to ASGI transport."""
    transport = ASGITransport(app=app_instance)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
