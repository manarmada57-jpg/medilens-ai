#!/usr/bin/env python3
"""
Medical Knowledge Ingestion Script for MediLens AI.
Populates MongoDB with grounded reference datasets from MedlinePlus, WHO, and NIH.
Usage: python scripts/ingest_knowledge.py
"""

import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.logging import logger
from app.db.indexes import KNOWLEDGE_COLLECTION
from app.db.mongo import close_mongo_connection, connect_to_mongo, db_manager

INGESTION_DATA = [
    {
        "topic": "Glucose & Diabetes",
        "title": "Fasting Blood Glucose Test",
        "lab_test_normalized": "fasting_blood_glucose",
        "source": "MedlinePlus (National Library of Medicine)",
        "source_url": "https://medlineplus.gov/lab-tests/blood-glucose-test/",
        "standard_range": "70 - 99 mg/dL",
        "definition": "Measures blood sugar concentration after an overnight fast of 8 to 12 hours.",
        "plain_explanation": "Glucose fuels your body's cells. When levels are mildly above 100 mg/dL, it indicates the body requires extra time or medication support to clear glucose into cells.",
        "questions_for_doctor": [
            "Does my fasting glucose reading indicate a need for further evaluation?",
            "What morning fasting range should I aim for based on my age and health history?",
        ],
    },
    {
        "topic": "Glucose & Diabetes",
        "title": "Hemoglobin A1c (HbA1c) Test",
        "lab_test_normalized": "hemoglobin_a1c",
        "source": "NIH National Institute of Diabetes and Digestive and Kidney Diseases",
        "source_url": "https://www.niddk.nih.gov/health-information/diagnostic-tests/a1c-test",
        "standard_range": "Below 5.7%",
        "definition": "Measures percentage of blood hemoglobin coated with sugar over the previous 90 days.",
        "plain_explanation": "A1C reflects your 3-month average glucose control. Because red blood cells live roughly 120 days, it gives a reliable trend of overall stability.",
        "questions_for_doctor": [
            "What is my personalized target HbA1c goal?",
            "How does my HbA1c compare to my daily fasting checks?",
        ],
    },
    {
        "topic": "Lipids & Cardiovascular",
        "title": "Total Cholesterol & Lipid Panel",
        "lab_test_normalized": "total_cholesterol",
        "source": "MedlinePlus (National Library of Medicine)",
        "source_url": "https://medlineplus.gov/cholesterol.html",
        "standard_range": "< 200 mg/dL",
        "definition": "Measures total circulating sterol lipids in blood, including HDL and LDL particles.",
        "plain_explanation": "Cholesterol helps build cell walls. Excess LDL cholesterol can contribute to plaque, while HDL helps remove it from blood vessels.",
        "questions_for_doctor": [
            "Are my HDL and LDL ratios in good balance?",
            "Are there specific foods I should prioritize or avoid?",
        ],
    },
    {
        "topic": "Kidney Function",
        "title": "Serum Creatinine Test",
        "lab_test_normalized": "serum_creatinine",
        "source": "MedlinePlus Lab Tests",
        "source_url": "https://medlineplus.gov/lab-tests/creatinine-test/",
        "standard_range": "0.5 - 1.1 mg/dL",
        "definition": "Evaluates kidney filtration capacity by measuring a normal muscle breakdown byproduct.",
        "plain_explanation": "Healthy kidneys efficiently filter creatinine into urine. Normal levels confirm that waste filtration is functioning well.",
        "questions_for_doctor": [
            "How does my creatinine level compare to my estimated glomerular filtration rate (eGFR)?",
        ],
    },
    {
        "topic": "Cardiovascular Health",
        "title": "Blood Pressure Management",
        "lab_test_normalized": "blood_pressure",
        "source": "World Health Organization (WHO)",
        "source_url": "https://www.who.int/news-room/fact-sheets/detail/hypertension",
        "standard_range": "< 120 / 80 mmHg",
        "definition": "Hydrostatic pressure exerted by blood upon blood vessel walls.",
        "plain_explanation": "Maintaining optimal arterial pressure protects heart muscle, kidneys, and retinal circulation.",
        "questions_for_doctor": [
            "What home blood pressure range should I look for when resting?",
        ],
    },
]


async def ingest_knowledge():
    logger.info("Connecting to MongoDB for knowledge ingestion...")
    await connect_to_mongo()

    if db_manager.db is None:
        logger.error("Database connection unavailable. Aborting.")
        sys.exit(1)

    db = db_manager.db
    now = datetime.now(UTC)

    logger.info(f"Ingesting {len(INGESTION_DATA)} verified medical knowledge entries into '{KNOWLEDGE_COLLECTION}'...")
    inserted_count = 0

    for item in INGESTION_DATA:
        query = {"lab_test_normalized": item["lab_test_normalized"]}
        doc = {**item, "updated_at": now}
        await db[KNOWLEDGE_COLLECTION].update_one(query, {"$set": doc}, upsert=True)
        inserted_count += 1

    logger.info(f"Knowledge ingestion completed successfully: {inserted_count} topics updated.")
    await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(ingest_knowledge())
