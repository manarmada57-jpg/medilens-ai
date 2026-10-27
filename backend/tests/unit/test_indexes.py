"""
Unit Tests for MongoDB Index Verification and Startup Safety.
Verifies that index creation failures abort application startup in non-test environments.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.core.config import settings
from app.db.indexes import create_indexes


@pytest.mark.asyncio
async def test_index_creation_failure_raises_in_production(monkeypatch):
    """Gate test: Startup must fail loudly if MongoDB index creation fails."""
    # Temporarily set APP_ENV to production
    monkeypatch.setattr(settings, "APP_ENV", "production")

    # Mock database whose create_indexes raises an error
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_collection.create_indexes = AsyncMock(side_effect=Exception("Simulated index collision or permission error"))
    mock_db.__getitem__.return_value = mock_collection

    with pytest.raises(RuntimeError, match="Index creation failed — application cannot start safely"):
        await create_indexes(mock_db)
