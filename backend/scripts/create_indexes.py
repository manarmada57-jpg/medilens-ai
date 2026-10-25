#!/usr/bin/env python3
"""
Stand-alone Index Management Script for MediLens AI.
Run via: python scripts/create_indexes.py
"""

import asyncio
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.logging import logger
from app.db.indexes import create_indexes
from app.db.mongo import close_mongo_connection, connect_to_mongo, db_manager


async def main():
    logger.info("Initializing stand-alone index creation script...")
    await connect_to_mongo()

    if db_manager.db is None:
        logger.error("Could not obtain database handle. Aborting.")
        sys.exit(1)

    logger.info(f"Target Database: {settings.MONGODB_DB_NAME}")
    results = await create_indexes(db_manager.db)

    logger.info("=" * 50)
    logger.info("Index creation summary:")
    for collection, status_info in results.items():
        logger.info(f"  • {collection}: {status_info}")
    logger.info("=" * 50)

    await close_mongo_connection()
    logger.info("All indexes successfully processed.")


if __name__ == "__main__":
    asyncio.run(main())
