"""
MongoDB Index Definitions and Initialization.
Ensures fast queries, unique constraints, and data retention TTL policies.
"""

from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, TEXT, IndexModel

from app.core.config import settings
from app.core.logging import logger

# Collection names
USERS_COLLECTION = "users"
PROFILES_COLLECTION = "medical_profiles"
DOCUMENTS_COLLECTION = "documents"
MEDICINES_COLLECTION = "medicines"
DOSE_LOGS_COLLECTION = "dose_logs"
KNOWLEDGE_COLLECTION = "knowledge_chunks"
AUDIT_LOGS_COLLECTION = "audit_logs"
REFRESH_TOKENS_COLLECTION = "refresh_tokens"
REMINDERS_COLLECTION = "reminders"
PUSH_SUBSCRIPTIONS_COLLECTION = "push_subscriptions"
CAREGIVER_LINKS_COLLECTION = "caregiver_links"


INDEX_DEFINITIONS = {
    USERS_COLLECTION: [
        IndexModel([("email", ASCENDING)], unique=True, name="idx_users_email_unique"),
        IndexModel([("created_at", DESCENDING)], name="idx_users_created_at"),
    ],
    REFRESH_TOKENS_COLLECTION: [
        IndexModel([("token_hash", ASCENDING)], unique=True, name="idx_refresh_token_hash"),
        IndexModel([("user_id", ASCENDING)], name="idx_refresh_user_id"),
        IndexModel([("family_id", ASCENDING)], name="idx_refresh_family_id"),
        IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0, name="idx_refresh_token_ttl"),
    ],
    PROFILES_COLLECTION: [
        IndexModel([("user_id", ASCENDING)], unique=True, name="idx_profiles_user_id_unique"),
        IndexModel([("updated_at", DESCENDING)], name="idx_profiles_updated_at"),
    ],
    DOCUMENTS_COLLECTION: [
        IndexModel([("user_id", ASCENDING), ("created_at", DESCENDING)], name="idx_docs_user_created"),
        IndexModel([("user_id", ASCENDING), ("kind", ASCENDING)], name="idx_docs_user_kind"),
        IndexModel([("status", ASCENDING)], name="idx_docs_status"),
        IndexModel([("file_hash", ASCENDING)], name="idx_docs_file_hash"),
    ],
    MEDICINES_COLLECTION: [
        IndexModel([("user_id", ASCENDING), ("is_active", ASCENDING)], name="idx_meds_user_active"),
        IndexModel([("user_id", ASCENDING), ("start_date", ASCENDING)], name="idx_meds_user_start"),
    ],
    DOSE_LOGS_COLLECTION: [
        # Unique on exact scheduled time (HH:MM string) — not on display slot
        IndexModel(
            [
                ("user_id", ASCENDING),
                ("medicine_id", ASCENDING),
                ("local_date", ASCENDING),
                ("time", ASCENDING),
            ],
            unique=True,
            name="idx_doses_unique_per_time",
        ),
        IndexModel([("user_id", ASCENDING), ("taken_at", DESCENDING)], name="idx_doses_user_taken_at"),
    ],
    KNOWLEDGE_COLLECTION: [
        IndexModel([("topic", ASCENDING), ("source", ASCENDING)], name="idx_rag_topic_source"),
        IndexModel([("title", TEXT), ("content", TEXT)], name="idx_rag_text_search"),
        IndexModel([("lab_test_normalized", ASCENDING)], name="idx_rag_lab_normalized"),
    ],
    AUDIT_LOGS_COLLECTION: [
        IndexModel([("user_id", ASCENDING), ("timestamp", DESCENDING)], name="idx_audit_user_time"),
        # 90-day retention policy via MongoDB TTL index
        IndexModel([("timestamp", ASCENDING)], expireAfterSeconds=90 * 24 * 3600, name="idx_audit_ttl_90d"),
    ],
    REMINDERS_COLLECTION: [
        IndexModel([("user_id", ASCENDING), ("scheduled_utc", ASCENDING)], name="idx_reminders_user_scheduled"),
        IndexModel([("medicine_id", ASCENDING)], name="idx_reminders_medicine"),
    ],
}


async def create_indexes(db: AsyncIOMotorDatabase) -> dict[str, list[str] | str]:
    """
    Applies all defined indexes across all application collections.
    Safe and idempotent — existing indexes with identical specs are no-ops.
    In non-testing environments, raises on any failure so the app does not start
    with missing constraints (especially the unique email index).
    """
    results: dict[str, list[str] | str] = {}
    errors: list[str] = []

    for collection_name, models in INDEX_DEFINITIONS.items():
        try:
            collection = db[collection_name]
            created_names = await collection.create_indexes(models)
            results[collection_name] = created_names
            logger.info("Created/verified %d indexes on '%s'", len(created_names), collection_name)
        except Exception as e:
            msg = f"Failed to create indexes on '{collection_name}': {e}"
            logger.error(msg)
            results[collection_name] = f"ERROR: {e}"
            errors.append(msg)

    if errors and not settings.is_testing:
        raise RuntimeError(
            "Index creation failed — application cannot start safely:\n" + "\n".join(errors)
        )

    return results
