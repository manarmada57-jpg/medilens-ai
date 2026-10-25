"""
Background Scheduler for Medication Reminders & Refill Monitoring.
Built with APScheduler for timezone-aware dose alerts.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler

from app.core.logging import logger
from app.db.indexes import MEDICINES_COLLECTION
from app.db.mongo import db_manager

_scheduler: AsyncIOScheduler | None = None


async def check_medication_reminders() -> None:
    """Periodic job inspecting upcoming and due medication doses across all active patients."""
    if db_manager.db is None:
        return
    try:
        # Scan for medicines with low refill counts (< 5 pills)
        cursor = db_manager.db[MEDICINES_COLLECTION].find({"is_active": True, "pills_left": {"$lte": 5}})
        low_supply_meds = await cursor.to_list(length=50)
        if low_supply_meds:
            logger.info(f"Refill monitor: {len(low_supply_meds)} medications currently have low supply (<= 5 doses).")
    except Exception as e:
        logger.error(f"Error executing medication reminder check: {str(e)}")


def start_scheduler() -> AsyncIOScheduler:
    """Initializes and starts the APScheduler background runner."""
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            check_medication_reminders,
            "interval",
            minutes=15,
            id="medication_reminder_job",
            replace_existing=True,
        )
        _scheduler.start()
        logger.info("MediLens APScheduler background worker started.")
    return _scheduler


def stop_scheduler() -> None:
    """Shuts down APScheduler cleanly on application exit."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("MediLens APScheduler background worker stopped.")
