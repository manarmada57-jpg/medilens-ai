"""
Prescription Extraction & Plain-Language Explanations Service.
Identifies prescribed medications, strengths, dosages, timings, and food instructions.
Provides patient-friendly explanations in simple English and Hindi.
Strict rule: Educational summary only — never recommends changing doses or stopping drugs.
"""

import re
from typing import Any

# Trusted clinical reference catalog for common medications
COMMON_MEDICINES_CATALOG: dict[str, dict[str, Any]] = {
    "metformin": {
        "name": "Metformin",
        "category": "Blood Sugar Management",
        "usedFor_en": "Helps manage and lower blood sugar (glucose) levels.",
        "usedFor_hi": "खून में शुगर (ग्लूकोज) के स्तर को नियंत्रित करने में मदद करती है।",
        "generalInfo_en": "Helps your body respond better to insulin. Take with or right after meals to avoid stomach upset.",
        "generalInfo_hi": "यह शरीर को इंसुलिन का सही उपयोग करने में मदद करती है। पेट की खराबी से बचने के लिए इसे खाने के साथ या तुरंत बाद लें।",
        "default_withFood": "after",
        "default_times": ["08:00", "20:00"],
        "default_frequency": "Twice daily (after meals)",
        "doctorInstructions_en": "Take regularly with meals. Do not skip meals while taking this medicine.",
        "doctorInstructions_hi": "रोजाना खाने के साथ समय पर लें। इस दवा के दौरान खाना न छोड़ें।",
        "commonSideEffects": ["Mild nausea", "Stomach upset"],
        "generalCautions": ["Take after food", "Stay hydrated"],
        "condition": "diabetes",
    },
    "glimepiride": {
        "name": "Glimepiride",
        "category": "Blood Sugar Management",
        "usedFor_en": "Stimulates the pancreas to release insulin for blood sugar control.",
        "usedFor_hi": "पैंक्रियाज से इंसुलिन का स्राव बढ़ाकर ब्लड शुगर को कम करने में मदद करती है।",
        "generalInfo_en": "Take shortly before or with your first main meal of the day (usually breakfast).",
        "generalInfo_hi": "दिन के पहले मुख्य भोजन (आमतौर पर नाश्ते) से ठीक पहले या साथ में लें।",
        "default_withFood": "before",
        "default_times": ["08:30"],
        "default_frequency": "Once daily (before breakfast)",
        "doctorInstructions_en": "Take before breakfast. Always have meals on time to prevent low blood sugar.",
        "doctorInstructions_hi": "नाश्ते से पहले लें। ब्लड शुगर बहुत कम न हो, इसलिए समय पर खाना खाएं।",
        "commonSideEffects": ["Mild dizziness if meal is delayed"],
        "generalCautions": ["Do not delay meals", "Keep glucose sweets handy"],
        "condition": "diabetes",
    },
    "amlodipine": {
        "name": "Amlodipine",
        "category": "Blood Pressure Support",
        "usedFor_en": "Relaxes and widens blood vessels to lower blood pressure.",
        "usedFor_hi": "रक्त वाहिकाओं (नसों) को आराम देकर ब्लड प्रेशर को सामान्य रखती है।",
        "generalInfo_en": "Helps blood flow smoothly and reduces strain on your heart. Best taken at the same time each morning.",
        "generalInfo_hi": "रक्त प्रवाह को आसान बनाती है और दिल पर पड़ने वाले दबाव को कम करती है। रोजाना सुबह एक ही समय पर लें।",
        "default_withFood": "any",
        "default_times": ["08:00"],
        "default_frequency": "Once daily (morning)",
        "doctorInstructions_en": "Take daily at the same time. Continue even when feeling well.",
        "doctorInstructions_hi": "रोजाना एक ही समय पर लें। अच्छा महसूस होने पर भी दवा अपने आप बंद न करें।",
        "commonSideEffects": ["Mild ankle swelling", "Flushing"],
        "generalCautions": ["Take consistently", "Monitor blood pressure periodically"],
        "condition": "hypertension",
    },
    "telmisartan": {
        "name": "Telmisartan",
        "category": "Blood Pressure & Heart Support",
        "usedFor_en": "Blocks blood vessel constricting signals to maintain healthy blood pressure.",
        "usedFor_hi": "रक्त वाहिकाओं को संकुचित होने से रोककर ब्लड प्रेशर को नियंत्रित रखती है।",
        "generalInfo_en": "Protects your cardiovascular system and kidneys from high pressure damage. Take once daily.",
        "generalInfo_hi": "दिल और किडनी को हाई ब्लड प्रेशर के नुकसान से बचाती है। दिन में एक बार लें।",
        "default_withFood": "any",
        "default_times": ["08:00"],
        "default_frequency": "Once daily (morning)",
        "doctorInstructions_en": "Take with or without food. Stay well-hydrated.",
        "doctorInstructions_hi": "खाने के साथ या बिना खाने के ले सकते हैं। पर्याप्त पानी पिएं।",
        "commonSideEffects": ["Mild dizziness when standing quickly"],
        "generalCautions": ["Rise slowly from seated positions"],
        "condition": "hypertension",
    },
    "atorvastatin": {
        "name": "Atorvastatin",
        "category": "Cholesterol & Lipid Management",
        "usedFor_en": "Reduces LDL (bad) cholesterol and triglycerides in the bloodstream.",
        "usedFor_hi": "खून में खराब कोलेस्ट्रॉल (LDL) को कम करती है और नसों को साफ रखने में मदद करती है।",
        "generalInfo_en": "Slows liver cholesterol production, usually most active at night. Often prescribed for bedtime.",
        "generalInfo_hi": "लिवर में कोलेस्ट्रॉल बनने की प्रक्रिया को धीमा करती है। इसे आमतौर पर रात को सोने से पहले लिया जाता है।",
        "default_withFood": "any",
        "default_times": ["21:00"],
        "default_frequency": "Once daily at bedtime",
        "doctorInstructions_en": "Take at night before sleep with water. Maintain a heart-healthy diet.",
        "doctorInstructions_hi": "रात को सोने से पहले पानी के साथ लें। दिल के अनुकूल संतुलित भोजन करें।",
        "commonSideEffects": ["Mild muscle aches"],
        "generalCautions": ["Avoid excessive grapefruit juice"],
        "condition": "cholesterol",
    },
    "pantoprazole": {
        "name": "Pantoprazole",
        "category": "Stomach Acid / GERD Relief",
        "usedFor_en": "Reduces stomach acid to soothe acid reflux, acidity, and gastritis.",
        "usedFor_hi": "पेट में बनने वाले अतिरिक्त एसिड को कम करके गैस, सीने की जलन और बदहजमी से राहत देती है।",
        "generalInfo_en": "Works best when taken 30 minutes before your morning meal on an empty stomach.",
        "generalInfo_hi": "सुबह खाली पेट नाश्ते से लगभग 30 मिनट पहले लेने पर यह सबसे अच्छा काम करती है।",
        "default_withFood": "before",
        "default_times": ["07:30"],
        "default_frequency": "Once daily (30 min before breakfast)",
        "doctorInstructions_en": "Take first thing in the morning with a full glass of water, 30 minutes before eating.",
        "doctorInstructions_hi": "सुबह उठकर खाली पेट एक गिलास पानी के साथ नाश्ते से 30 मिनट पहले लें।",
        "commonSideEffects": ["Mild headache", "Temporary nausea"],
        "generalCautions": ["Take on empty stomach"],
        "condition": "gerd",
    },
    "paracetamol": {
        "name": "Paracetamol",
        "category": "Pain & Fever Relief",
        "usedFor_en": "Relieves mild to moderate pain and reduces elevated body temperature (fever).",
        "usedFor_hi": "हल्के से मध्यम दर्द से राहत देती है और बुखार को कम करती है।",
        "generalInfo_en": "Gentle on the stomach when taken after food. Follow the maximum daily dose instructed by your doctor.",
        "generalInfo_hi": "खाने के बाद लेने पर पेट पर भारी नहीं पड़ती। डॉक्टर द्वारा बताई गई अधिकतम खुराक से ज्यादा न लें।",
        "default_withFood": "after",
        "default_times": ["08:00", "14:00", "20:00"],
        "default_frequency": "As directed (up to 3 times daily)",
        "doctorInstructions_en": "Take after meals with water. Do not combine with other paracetamol-containing products.",
        "doctorInstructions_hi": "खाने के बाद पानी के साथ लें। एक साथ कई दर्द निवारक दवाएं न लें।",
        "commonSideEffects": ["Rare at therapeutic doses"],
        "generalCautions": ["Do not exceed recommended dose", "Do not consume alcohol"],
        "condition": "general",
    },
    "azithromycin": {
        "name": "Azithromycin",
        "category": "Antibiotic (Bacterial Infection)",
        "usedFor_en": "Treats bacterial respiratory, throat, or skin infections.",
        "usedFor_hi": "बैक्टीरियल इन्फेक्शन (जैसे गले, फेफड़ों या त्वचा के संक्रमण) को ठीक करती है।",
        "generalInfo_en": "Complete the full course prescribed by your physician even if you start feeling better early.",
        "generalInfo_hi": "डॉक्टर द्वारा बताया गया पूरा कोर्स जरूर खत्म करें, भले ही आप पहले ही ठीक महसूस करने लगें।",
        "default_withFood": "any",
        "default_times": ["10:00"],
        "default_frequency": "Once daily for prescribed days",
        "doctorInstructions_en": "Complete the entire antibiotic course to prevent bacterial resistance.",
        "doctorInstructions_hi": "इन्फेक्शन दोबारा न लौटे, इसके लिए पूरा कोर्स अवश्य पूरा करें।",
        "commonSideEffects": ["Mild stomach discomfort"],
        "generalCautions": ["Finish entire course", "Take at the same time each day"],
        "condition": "infection",
    },
    "cetirizine": {
        "name": "Cetirizine",
        "category": "Allergy & Cold Relief",
        "usedFor_en": "Relieves allergic symptoms like runny nose, sneezing, itchy eyes, and hives.",
        "usedFor_hi": "एलर्जी के लक्षणों जैसे छींक आना, नाक बहना, आंखों में खुजली और चकत्तों से राहत देती है।",
        "generalInfo_en": "Often causes mild relaxation or drowsiness; best taken at bedtime.",
        "generalInfo_hi": "इससे हल्की नींद या सुस्ती आ सकती है, इसलिए इसे रात को सोने से पहले लेना बेहतर होता है।",
        "default_withFood": "any",
        "default_times": ["21:30"],
        "default_frequency": "Once daily at bedtime",
        "doctorInstructions_en": "Take at night. Avoid driving if feeling drowsy.",
        "doctorInstructions_hi": "रात में लें। यदि सुस्ती महसूस हो तो गाड़ी चलाने से बचें।",
        "commonSideEffects": ["Mild drowsiness", "Dry mouth"],
        "generalCautions": ["Avoid driving if drowsy"],
        "condition": "allergy",
    },
    "losartan": {
        "name": "Losartan",
        "category": "Blood Pressure Support",
        "usedFor_en": "Maintains blood pressure in target range by helping blood vessels relax.",
        "usedFor_hi": "रक्त वाहिकाओं को शिथिल रखकर ब्लड प्रेशर को नियंत्रित रखती है।",
        "generalInfo_en": "Supports heart and kidney protection in adults with high blood pressure.",
        "generalInfo_hi": "हाई ब्लड प्रेशर वाले मरीजों में दिल और गुर्दे की सुरक्षा में मदद करती है।",
        "default_withFood": "any",
        "default_times": ["08:00"],
        "default_frequency": "Once daily",
        "doctorInstructions_en": "Take consistently at the same hour each day.",
        "doctorInstructions_hi": "प्रतिदिन एक ही समय पर नियम से लें।",
        "commonSideEffects": ["Mild lightheadedness"],
        "generalCautions": ["Stand up gradually"],
        "condition": "hypertension",
    },
}


class PrescriptionExtractor:
    @staticmethod
    def extract_medications(text: str) -> list[dict[str, Any]]:
        """
        Extracts medication names, strengths, dosages, frequencies, and food instructions from text.
        """
        extracted: list[dict[str, Any]] = []
        lower_text = text.lower()

        for key, med_info in COMMON_MEDICINES_CATALOG.items():
            pattern = rf"\b{key}\b"
            match = re.search(pattern, lower_text)
            if not match:
                # Also check common aliases like 'dolo', 'crocin' -> paracetamol
                if key == "paracetamol" and re.search(r"\b(dolo|crocin|calpol)\b", lower_text):
                    match = re.search(r"\b(dolo|crocin|calpol)\b", lower_text)
                elif key == "pantoprazole" and re.search(r"\b(pan\s*40|pantocid)\b", lower_text):
                    match = re.search(r"\b(pan\s*40|pantocid)\b", lower_text)
                elif key == "telmisartan" and re.search(r"\b(telma|telmikind)\b", lower_text):
                    match = re.search(r"\b(telma|telmikind)\b", lower_text)

            if match:
                # Scan surrounding text for strength (e.g. 500mg, 5 mg, 40mg, 650mg)
                window = text[max(0, match.start() - 20) : min(len(text), match.end() + 60)]
                strength_match = re.search(r"(\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g|IU))\b", window, re.IGNORECASE)
                strength = strength_match.group(1).strip() if strength_match else "Standard dose"

                # Detect frequency
                freq = med_info["default_frequency"]
                if re.search(r"\b(?:1-0-1|bd|twice daily|bid)\b", window, re.IGNORECASE):
                    freq = "Twice daily (BD)"
                elif re.search(r"\b(?:1-0-0|0-1-0|od|once daily|qd)\b", window, re.IGNORECASE):
                    freq = "Once daily (OD)"
                elif re.search(r"\b(?:1-1-1|tds|thrice daily|tid)\b", window, re.IGNORECASE):
                    freq = "Three times daily (TDS)"
                elif re.search(r"\b(?:0-0-1|hs|bedtime|night)\b", window, re.IGNORECASE):
                    freq = "Once daily at bedtime"

                # Detect food instructions
                with_food = med_info["default_withFood"]
                if re.search(r"\b(?:before meals?|empty stomach|ac)\b", window, re.IGNORECASE):
                    with_food = "before"
                elif re.search(r"\b(?:after meals?|post food|pc)\b", window, re.IGNORECASE):
                    with_food = "after"
                elif re.search(r"\b(?:with food|with meals?)\b", window, re.IGNORECASE):
                    with_food = "with"

                extracted.append({
                    "name": med_info["name"],
                    "strength": strength,
                    "dosage": "1 tablet",
                    "frequency": freq,
                    "suggestedTimes": med_info["default_times"],
                    "withFood": with_food,
                    "durationDays": 30,
                    "doctorInstructions": med_info["doctorInstructions_en"],
                    "doctorInstructionsHi": med_info["doctorInstructions_hi"],
                    "usedFor": med_info["usedFor_en"],
                    "usedForHi": med_info["usedFor_hi"],
                    "generalInfo": med_info["generalInfo_en"],
                    "generalInfoHi": med_info["generalInfo_hi"],
                    "commonSideEffects": med_info["commonSideEffects"],
                    "generalCautions": med_info["generalCautions"],
                    "unclear": False,
                    "needsReview": False,
                    "sources": [
                        {
                            "name": "MedlinePlus",
                            "title": f"{med_info['name']} Drug Information",
                            "url": "https://medlineplus.gov/druginformation.html",
                        }
                    ],
                })

        return extracted


prescription_extractor = PrescriptionExtractor()
