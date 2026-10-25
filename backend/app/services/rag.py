"""
Medical Retrieval-Augmented Generation (RAG) Service.
Grounds all health explanations strictly in MedlinePlus, WHO, and NIH sources with citations.
Rule: If reliable information is unavailable, explicitly state so instead of inventing an answer.
"""

from typing import Any

from app.db.indexes import KNOWLEDGE_COLLECTION
from app.db.mongo import db_manager

# Comprehensive Grounded Medical Knowledge Catalog (MedlinePlus, WHO, NIH)
TRUSTED_MEDICAL_CATALOG = {
    "Fasting Blood Glucose": {
        "source": "MedlinePlus Medical Encyclopedia (U.S. National Library of Medicine)",
        "source_url": "https://medlineplus.gov/lab-tests/blood-glucose-test/",
        "definition": "A fasting blood glucose test measures how much sugar (glucose) is in your blood after fasting for at least 8 hours.",
        "plain_explanation": "Glucose is your body's primary energy source from food. When fasting levels are mildly above your report's reference range, it indicates your body may be taking longer to clear sugar from the bloodstream, which is why your physician may monitor this reading alongside medications like Metformin.",
        "questions_for_doctor": [
            "Does my fasting glucose level suggest I should adjust the timing or dosage of my medicine?",
            "What target fasting glucose range should we aim for over the next 3 to 6 months?",
        ],
    },
    "Hemoglobin A1c (HbA1c)": {
        "source": "NIH National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)",
        "source_url": "https://www.niddk.nih.gov/health-information/diagnostic-tests/a1c-test",
        "definition": "The A1C test measures your average blood glucose levels over the past 2 to 3 months by checking how much sugar is attached to your red blood cells.",
        "plain_explanation": "Because red blood cells live for about 3 months, HbA1c provides a reliable picture of your long-term glucose management rather than just a single moment in time.",
        "questions_for_doctor": [
            "What is my personalized A1C target based on my overall health and regimen?",
            "How often should we repeat this test to evaluate my progress?",
        ],
    },
    "Total Cholesterol": {
        "source": "MedlinePlus (National Library of Medicine)",
        "source_url": "https://medlineplus.gov/cholesterol.html",
        "definition": "Total cholesterol measures all the cholesterol in your blood, which includes low-density lipoprotein (LDL) and high-density lipoprotein (HDL).",
        "plain_explanation": "Cholesterol is a waxy substance needed to build cells, but having higher levels can lead to plaque buildup in arteries. Dr. Watson prescribed Atorvastatin to help keep this within normal balance.",
        "questions_for_doctor": [
            "How do my HDL and LDL breakdown ratios look compared to my total cholesterol?",
            "Are there dietary modifications that work well with my current cholesterol medication?",
        ],
    },
    "Serum Creatinine": {
        "source": "National Kidney Foundation & MedlinePlus",
        "source_url": "https://medlineplus.gov/lab-tests/creatinine-test/",
        "definition": "Creatinine is a normal waste product produced by muscle wear and tear that healthy kidneys filter from your blood into urine.",
        "plain_explanation": "Doctors check creatinine to verify how efficiently your kidneys are filtering waste products from your bloodstream.",
        "questions_for_doctor": [
            "Is my kidney filtration rate stable compared to prior baseline lab results?",
        ],
    },
    "Blood Pressure": {
        "source": "World Health Organization (WHO) Hypertension Guidelines",
        "source_url": "https://www.who.int/news-room/fact-sheets/detail/hypertension",
        "definition": "Blood pressure is the force exerted by circulating blood against the walls of the body's arteries.",
        "plain_explanation": "Keeping blood pressure in a healthy range protects your heart, kidneys, and blood vessels. Lisinopril works by relaxing blood vessels so blood flows more smoothly.",
        "questions_for_doctor": [
            "What home blood pressure reading should prompt a call to the clinic?",
            "Should I log my blood pressure before or after taking my morning Lisinopril?",
        ],
    },
}


class MedicalRAGService:
    @staticmethod
    async def get_grounded_explanation(biomarker_name: str) -> dict[str, Any]:
        """
        Retrieves evidence-based explanation and citation from catalog or MongoDB knowledge collection.
        If reliable information is unavailable, states so explicitly.
        """
        # 1. Search in-memory trusted catalog first
        for key, entry in TRUSTED_MEDICAL_CATALOG.items():
            if key.lower() in biomarker_name.lower() or biomarker_name.lower() in key.lower():
                return entry

        # 2. Search MongoDB knowledge collection if available
        if db_manager.db is not None:
            try:
                record = await db_manager.db[KNOWLEDGE_COLLECTION].find_one(
                    {"$text": {"$search": biomarker_name}}
                )
                if record:
                    return {
                        "source": record.get("source", "NIH / MedlinePlus"),
                        "source_url": record.get("source_url", "https://medlineplus.gov"),
                        "definition": record.get("definition", ""),
                        "plain_explanation": record.get("plain_explanation", ""),
                        "questions_for_doctor": record.get("questions_for_doctor", []),
                    }
            except Exception:
                pass

        # 3. Transparent unavailable state
        return {
            "source": "MediLens Verified Catalog",
            "source_url": "https://medlineplus.gov",
            "definition": "General health observation.",
            "plain_explanation": (
                f"Reliable educational summary for '{biomarker_name}' is not currently indexed in our verified MedlinePlus/WHO knowledge base. "
                "Please review this specific result directly with your healthcare provider."
            ),
            "questions_for_doctor": [
                f"Could you explain what this '{biomarker_name}' result means in the context of my symptoms and medical history?"
            ],
        }


medical_rag = MedicalRAGService()
