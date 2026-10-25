"""
MongoDB Async Connection Manager using Motor.
Provides clean lifecycle hooks, connection pooling, and health pinging.
All datetimes returned from the database are timezone-aware (UTC).
"""

import time
from datetime import UTC

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings
from app.core.errors import DatabaseException
from app.core.logging import logger


class MongoDBManager:
    client: AsyncIOMotorClient | None = None
    db: AsyncIOMotorDatabase | None = None


db_manager = MongoDBManager()


async def connect_to_mongo() -> None:
    """Initializes async MongoDB connection pool with timezone-aware datetime support."""
    try:
        logger.info(
            "Connecting to MongoDB at %s (db: %s)...",
            settings.MONGODB_URI.split("@")[-1],
            settings.MONGODB_DB_NAME,
        )
        db_manager.client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            minPoolSize=settings.MONGODB_MIN_POOL_SIZE,
            maxPoolSize=settings.MONGODB_MAX_POOL_SIZE,
            serverSelectionTimeoutMS=settings.MONGODB_TIMEOUT_MS,
            # Return timezone-aware datetimes (UTC) from Motor
            tz_aware=True,
            tzinfo=UTC,
        )
        db_manager.db = db_manager.client[settings.MONGODB_DB_NAME]

        # Verify connection immediately with ping
        start = time.perf_counter()
        await db_manager.client.admin.command("ping")
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info("Connected to MongoDB successfully! Ping: %.2fms", elapsed_ms)
    except Exception as e:
        logger.error("Failed to connect to MongoDB: %s", str(e), exc_info=True)
        if not settings.is_testing:
            raise DatabaseException(message=f"Could not connect to MongoDB: {e}") from e


async def close_mongo_connection() -> None:
    """Closes all MongoDB connection pools cleanly."""
    if db_manager.client:
        logger.info("Closing MongoDB connections...")
        db_manager.client.close()
        db_manager.client = None
        db_manager.db = None
        logger.info("MongoDB connection closed.")


def get_database() -> AsyncIOMotorDatabase:
    """Returns the active MongoDB database instance."""
    if db_manager.db is None:
        raise DatabaseException(message="Database client has not been initialized.")
    return db_manager.db


async def ping_mongo() -> dict:
    """
    Pings MongoDB and returns response status.
    Does NOT expose raw error text — logs it internally instead.
    """
    if db_manager.client is None:
        return {"status": "unavailable"}
    try:
        start = time.perf_counter()
        await db_manager.client.admin.command("ping")
        latency = round((time.perf_counter() - start) * 1000, 2)
        return {"status": "connected", "latency_ms": latency}
    except Exception as e:
        logger.warning("MongoDB ping failed: %s", type(e).__name__)
        return {"status": "unavailable"}
