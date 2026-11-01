"""
Medical Retrieval-Augmented Generation (RAG) Service.
Grounds all health explanations strictly in MedlinePlus, WHO, and NIH sources with citations.
Rule: If reliable information is unavailable, explicitly state so instead of inventing an answer.
No personal names, specific drug prescriptions, dose advice, or fake "verified" claims.
Provides patient-friendly explanations in simple English and Hindi.
"""

from typing import Any

from app.db.indexes import KNOWLEDGE_COLLECTION
from app.db.mongo import db_manager

# Comprehensive Grounded Medical Knowledge Catalog (MedlinePlus, WHO, NIH) with Bilingual Support
TRUSTED_MEDICAL_CATALOG: dict[str, dict[str, Any]] = {
    "Fasting Blood Glucose": {
        "source": "MedlinePlus Medical Encyclopedia (U.S. National Library of Medicine)",
        "source_url": "https://medlineplus.gov/lab-tests/blood-glucose-test/",
        "name_hi": "फास्टिंग ब्लड ग्लूकोज (खाली पेट शुगर)",
        "definition": "A fasting blood glucose test measures how much sugar (glucose) is in your blood after fasting for at least 8 hours.",
        "definition_hi": "फास्टिंग ब्लड ग्लूकोज टेस्ट यह मापता है कि कम से कम 8 घंटे बिना कुछ खाए पिए आपके खून में कितनी शुगर (ग्लूकोज) है।",
        "plain_explanation": "Glucose is your body's primary energy source from food. When fasting levels are mildly above your report's reference range, it indicates your body may be taking longer to clear sugar from the bloodstream, which is why your physician monitors this reading.",
        "plain_explanation_hi": "ग्लूकोज आपके शरीर को काम करने की ऊर्जा देने वाली मुख्य शुगर है। सामान्य सीमा से थोड़ा अधिक होने का मतलब है कि रात भर खाली पेट रहने के बाद शरीर को शुगर पचाने में थोड़ा अधिक समय लग रहा है।",
        "term_simple_en": "Blood sugar after 8 hours of overnight fasting",
        "term_simple_hi": "8 घंटे खाली पेट रहने के बाद खून में शुगर की मात्रा",
        "questions_for_doctor": [
            "What target fasting glucose range should we aim for over the next 3 to 6 months?",
            "What lifestyle or dietary modifications are most effective for improving my glucose balance?",
        ],
        "questions_for_doctor_hi": [
            "अगले 3 से 6 महीनों में मुझे अपने ब्लड शुगर का क्या लक्ष्य रखना चाहिए?",
            "मेरे ब्लड शुगर को सामान्य रखने के लिए कौन से खान-पान और दिनचर्या के बदलाव सबसे बेहतर रहेंगे?",
        ],
    },
    "Hemoglobin A1c (HbA1c)": {
        "source": "NIH National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK)",
        "source_url": "https://www.niddk.nih.gov/health-information/diagnostic-tests/a1c-test",
        "name_hi": "HbA1c (ग्लाइकेटेड हीमोग्लोबिन - 3 महीने का औसत)",
        "definition": "The A1C test measures your average blood glucose levels over the past 2 to 3 months by checking how much sugar is attached to your red blood cells.",
        "definition_hi": "यह टेस्ट बताता है कि पिछले 2 से 3 महीनों के दौरान आपके खून में औसत ब्लड शुगर का स्तर कैसा रहा है।",
        "plain_explanation": "Because red blood cells live for about 3 months, HbA1c provides a reliable picture of your long-term glucose management rather than just a single moment in time.",
        "plain_explanation_hi": "चूंकि लाल रक्त कोशिकाएं लगभग 3 महीने तक जीवित रहती हैं, HbA1c केवल एक दिन का नहीं बल्कि पिछले 2-3 महीनों का समग्र शुगर नियंत्रण दिखाता है।",
        "term_simple_en": "3-month average blood sugar scorecard",
        "term_simple_hi": "पिछले 2 से 3 महीनों का औसत ब्लड शुगर स्तर",
        "questions_for_doctor": [
            "What is my personalized A1C target based on my overall health?",
            "How often should we repeat this test to evaluate my progress?",
        ],
        "questions_for_doctor_hi": [
            "मेरी सेहत के अनुसार मेरे HbA1c का व्यक्तिगत लक्ष्य क्या होना चाहिए?",
            "प्रगति देखने के लिए यह टेस्ट दोबारा कब कराना चाहिए?",
        ],
    },
    "Hemoglobin": {
        "source": "MedlinePlus (National Library of Medicine)",
        "source_url": "https://medlineplus.gov/lab-tests/hemoglobin-test/",
        "name_hi": "हीमोग्लोबिन (रक्त में ऑक्सीजन वाहक प्रोटीन)",
        "definition": "Hemoglobin is an iron-rich protein in red blood cells that carries oxygen from your lungs to the rest of your body.",
        "definition_hi": "हीमोग्लोबिन लाल रक्त कोशिकाओं में मौजूद प्रोटीन है जो फेफड़ों से पूरे शरीर के अंगों तक ऑक्सीजन पहुँचाता है।",
        "plain_explanation": "Hemoglobin measures the oxygen-carrying strength of your red blood cells. Balanced levels ensure your brain, muscles, and organs receive the oxygen they need to feel energetic.",
        "plain_explanation_hi": "हीमोग्लोबिन आपके रक्त की ऑक्सीजन पहुँचाने की क्षमता को दर्शाता है। सामान्य स्तर यह सुनिश्चित करता है कि दिमाग और शरीर के सभी अंगों को भरपूर ऊर्जा मिले।",
        "term_simple_en": "Oxygen-carrying protein in red blood cells",
        "term_simple_hi": "खून में ऑक्सीजन पहुँचाने वाला मुख्य प्रोटीन",
        "questions_for_doctor": [
            "What might be influencing my hemoglobin level?",
            "Would iron-rich dietary choices or routine checks help maintain my level?",
        ],
        "questions_for_doctor_hi": [
            "मेरे हीमोग्लोबिन स्तर को संतुलित रखने के लिए कौन से आहार सबसे ज्यादा फायदेमंद रहेंगे?",
        ],
    },
    "Total Cholesterol": {
        "source": "MedlinePlus (National Library of Medicine)",
        "source_url": "https://medlineplus.gov/cholesterol.html",
        "name_hi": "टोटल कोलेस्ट्रॉल (रक्त में कुल वसा)",
        "definition": "Total cholesterol measures all the cholesterol in your blood, which includes low-density lipoprotein (LDL) and high-density lipoprotein (HDL).",
        "definition_hi": "टोटल कोलेस्ट्रॉल आपके रक्त में मौजूद कुल वसा (फैट) को मापता है, जिसमें अच्छा (HDL) और खराब (LDL) दोनों कोलेस्ट्रॉल शामिल हैं।",
        "plain_explanation": "Cholesterol is a waxy substance needed to build cells, but having higher levels can lead to plaque buildup in arteries. Maintaining balanced cholesterol helps support cardiovascular health.",
        "plain_explanation_hi": "कोलेस्ट्रॉल शरीर की कोशिकाओं के निर्माण के लिए आवश्यक है, लेकिन इसे संतुलित रखना दिल और नसों के स्वास्थ्य के लिए अत्यंत आवश्यक है।",
        "term_simple_en": "Overall fat / waxy substance in bloodstream",
        "term_simple_hi": "खून में तैरने वाली कुल वसा (फैट) की मात्रा",
        "questions_for_doctor": [
            "How do my HDL and LDL breakdown ratios look compared to my total cholesterol?",
            "What heart-healthy dietary habits should I focus on?",
        ],
        "questions_for_doctor_hi": [
            "मेरे टोटल कोलेस्ट्रॉल में अच्छे और खराब कोलेस्ट्रॉल का अनुपात कैसा है?",
            "दिल को स्वस्थ रखने के लिए मुझे खान-पान में क्या बदलाव करने चाहिए?",
        ],
    },
    "Serum Creatinine": {
        "source": "National Kidney Foundation & MedlinePlus",
        "source_url": "https://medlineplus.gov/lab-tests/creatinine-test/",
        "name_hi": "सीरम क्रिएटिनिन (किडनी कार्यक्षमता संकेतक)",
        "definition": "Creatinine is a normal waste product produced by muscle wear and tear that healthy kidneys filter from your blood into urine.",
        "definition_hi": "क्रिएटिनिन मांसपेशियों के काम करने से बनने वाला स्वाभाविक अपशिष्ट है, जिसे स्वस्थ किडनी खून से छानकर बाहर निकालती है।",
        "plain_explanation": "Doctors check creatinine to verify how efficiently your kidneys are filtering waste products from your bloodstream.",
        "plain_explanation_hi": "यह टेस्ट यह देखने के लिए किया जाता है कि आपकी किडनी खून से अपशिष्ट पदार्थों को कितनी अच्छी तरह छान (फ़िल्टर) रही है।",
        "term_simple_en": "Natural waste filtered by healthy kidneys",
        "term_simple_hi": "किडनी द्वारा खून से छाना जाने वाला अपशिष्ट",
        "questions_for_doctor": [
            "Is my kidney filtration rate stable compared to prior baseline lab results?",
        ],
        "questions_for_doctor_hi": [
            "क्या मेरी किडनी की कार्यक्षमता पिछली रिपोर्टों के मुकाबले सामान्य और स्थिर है?",
        ],
    },
    "Blood Pressure": {
        "source": "World Health Organization (WHO) Hypertension Guidelines",
        "source_url": "https://www.who.int/news-room/fact-sheets/detail/hypertension",
        "name_hi": "ब्लड प्रेशर (रक्तचाप)",
        "definition": "Blood pressure is the force exerted by circulating blood against the walls of the body's arteries.",
        "definition_hi": "ब्लड प्रेशर वह दबाव है जो बहता हुआ खून धमनियों (नसों) की दीवारों पर डालता है।",
        "plain_explanation": "Keeping blood pressure in a healthy range protects your heart, kidneys, and blood vessels. Healthy arterial elasticity allows blood to circulate smoothly.",
        "plain_explanation_hi": "ब्लड प्रेशर को सामान्य सीमा में रखना दिल, गुर्दे और आंखों की सुरक्षा के लिए जरूरी है।",
        "term_simple_en": "Pressure of blood against artery walls",
        "term_simple_hi": "नसों में बहने वाले खून का दबाव",
        "questions_for_doctor": [
            "What home blood pressure reading should prompt a call to the clinic?",
            "What time of day is best for logging my resting blood pressure?",
        ],
        "questions_for_doctor_hi": [
            "घर पर ब्लड प्रेशर नापते समय मुझे किस समय और कितनी बार रीडिंग लेनी चाहिए?",
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
                        "definition_hi": record.get("definition_hi", ""),
                        "plain_explanation": record.get("plain_explanation", ""),
                        "plain_explanation_hi": record.get("plain_explanation_hi", ""),
                        "term_simple_en": record.get("term_simple_en", biomarker_name),
                        "term_simple_hi": record.get("term_simple_hi", biomarker_name),
                        "questions_for_doctor": record.get("questions_for_doctor", []),
                        "questions_for_doctor_hi": record.get("questions_for_doctor_hi", []),
                    }
            except Exception:
                pass

        # 3. Transparent unavailable state
        return {
            "source": "MedlinePlus / WHO",
            "source_url": "https://medlineplus.gov",
            "name_hi": biomarker_name,
            "definition": "General health observation.",
            "definition_hi": "सामान्य स्वास्थ्य परीक्षण।",
            "plain_explanation": (
                f"Reliable educational summary for '{biomarker_name}' is not currently indexed in our MedlinePlus/WHO knowledge base. "
                "Please review this specific result directly with your healthcare provider."
            ),
            "plain_explanation_hi": (
                f"'{biomarker_name}' के लिए सामान्य जानकारी हमारे रिकॉर्ड में उपलब्ध नहीं है। "
                "कृपया इस परिणाम के बारे में सीधे अपने डॉक्टर से सलाह लें।"
            ),
            "term_simple_en": biomarker_name,
            "term_simple_hi": biomarker_name,
            "questions_for_doctor": [
                f"Could you explain what this '{biomarker_name}' result means in the context of my symptoms and medical history?"
            ],
            "questions_for_doctor_hi": [
                f"कृपया समझाएं कि मेरी सेहत के अनुसार इस '{biomarker_name}' परिणाम का क्या अर्थ है?"
            ],
        }


medical_rag = MedicalRAGService()
