"""
Comprehensive Hematology & Complete Blood Count (CBC) Service.
Extracts all 22+ standard hematology and pathology parameters from table and inline formats.
Provides in-depth educational explanations matching clinical reference standards in simple English and Hindi.
Includes 'What is it?', 'If Low', 'If High', 'Patient Condition', and 'Clinical Summary'.
Strict rule: Educational summary only — never diagnoses or prescribes.
"""

import re
from typing import Any

from app.services.validation import lab_validator

# Comprehensive Clinical Reference Catalog for CBC & Routine Pathology
CBC_REFERENCE_CATALOG: dict[str, dict[str, Any]] = {
    "Haemoglobin (Hb)": {
        "name_hi": "हीमोग्लोबिन (Haemoglobin - Hb)",
        "unit": "g/dL",
        "default_range": "13 - 17 g/dL",
        "what_is_it_en": (
            "Haemoglobin is an iron-containing protein present inside Red Blood Cells (RBCs). "
            "Its primary job is to carry oxygen from your lungs to all the organs and tissues in your body."
        ),
        "what_is_it_hi": (
            "Haemoglobin ek iron-containing protein hai jo Red Blood Cells (RBC) ke andar present hota hai. "
            "Iska main function lungs se oxygen lekar body ke different organs aur tissues tak pahunchana hai."
        ),
        "if_low_en": [
            "Anaemia (low blood count) may be present.",
            "Weakness, dizziness, or fatigue can occur.",
            "Breathlessness during exertion.",
            "Possible causes include iron, vitamin B12, or folate deficiency, or blood loss.",
        ],
        "if_low_hi": [
            "Anaemia (khoon ki kami) ho sakti hai.",
            "Weakness aur fatigue (kamzori ya thakan) ho sakta hai.",
            "Breathlessness ya dizziness ho sakti hai.",
            "Iron, vitamin B12 ya folate deficiency possible causes hain.",
        ],
        "if_high_en": [
            "Dehydration (low fluid intake).",
            "Smoking or chronic respiratory adaptations.",
            "High-altitude living.",
            "Certain blood or bone marrow conditions.",
        ],
        "if_high_hi": [
            "Dehydration (paani ki kami).",
            "Smoking ya respiratory conditions.",
            "High-altitude adaptation.",
            "Certain blood-related conditions.",
        ],
    },
    "Total Leucocyte Count (TLC)": {
        "name_hi": "टोटल ल्यूकोसाइट काउंट (Total WBC - TLC)",
        "unit": "/cumm",
        "default_range": "4000 - 10000 /cumm",
        "what_is_it_en": (
            "Leucocytes are commonly known as White Blood Cells (WBCs). They form the frontline defense of your immune system, "
            "protecting your body against bacteria, viruses, and foreign microorganisms."
        ),
        "what_is_it_hi": (
            "Leucocytes ko White Blood Cells (WBC) bhi kaha jata hai. Ye body ke immune system ka important part hain. "
            "Inka main function bacteria, viruses aur harmful microorganisms ke against body ko protect karna hai."
        ),
        "if_high_en": [
            "Bacterial or acute infection.",
            "Body inflammation or injury.",
            "Physical or emotional stress.",
            "Certain medications (e.g. corticosteroids).",
        ],
        "if_high_hi": [
            "Bacterial infection ya inflammation.",
            "Physical stress ya sharirik chot.",
            "Certain medications ke asar se.",
        ],
        "if_low_en": [
            "Certain viral infections (like dengue, viral fever).",
            "Medication-related immune suppression.",
            "Bone marrow conditions.",
        ],
        "if_low_hi": [
            "Some viral infections (jaise viral fever ya dengue).",
            "Medication-related effects.",
            "Bone marrow ya immune-related conditions.",
        ],
    },
    "Neutrophils": {
        "name_hi": "न्यूट्रोफिल्स (Neutrophils)",
        "unit": "%",
        "default_range": "40 - 80 %",
        "what_is_it_en": (
            "Neutrophils are the most common type of White Blood Cell. They act as rapid first-line defenders, "
            "quickly moving to infection sites to trap and destroy invading bacteria."
        ),
        "what_is_it_hi": (
            "Neutrophils WBC ka ek primary type hain. Ye bacteria aur harmful microorganisms ke against body ki first-line defence ka kaam karte hain."
        ),
        "if_high_en": [
            "Active bacterial infection.",
            "Tissue inflammation or healing.",
            "Physical trauma or strenuous exertion.",
        ],
        "if_high_hi": [
            "Bacterial infections, inflammation ya physical stress.",
        ],
        "if_low_en": [
            "Increased vulnerability to infections.",
            "Certain viral illnesses or medications affecting neutrophil production.",
        ],
        "if_low_hi": [
            "Infection ka risk badh sakta hai, especially agar count bahut low ho.",
        ],
    },
    "Lymphocytes": {
        "name_hi": "लिम्फोसाइट्स (Lymphocytes)",
        "unit": "%",
        "default_range": "20 - 40 %",
        "what_is_it_en": (
            "Lymphocytes are specialized immune cells (B-cells, T-cells, Natural Killer cells). They remember past infections, "
            "produce antibodies, and directly neutralize viruses and abnormal cells."
        ),
        "what_is_it_hi": (
            "Lymphocytes immune system ke cells hain jo viruses ko identify karne aur antibodies produce karke body ko protect karne mein help karte hain."
        ),
        "if_high_en": [
            "Viral infections (common cold, flu, viral illnesses).",
            "Chronic inflammation or immune recovery phase.",
        ],
        "if_high_hi": [
            "Viral infections aur immune responses.",
        ],
        "if_low_en": [
            "Steroid medications or immune suppression.",
            "Acute systemic infections.",
        ],
        "if_low_hi": [
            "Certain infections ya medication effects.",
        ],
    },
    "Eosinophils": {
        "name_hi": "ईोसिनोफिल्स (Eosinophils)",
        "unit": "%",
        "default_range": "1 - 6 %",
        "what_is_it_en": (
            "Eosinophils are White Blood Cells that respond specifically to allergic reactions (like skin rashes or asthma) "
            "and help protect against parasitic infections."
        ),
        "what_is_it_hi": (
            "Eosinophils White Blood Cells ka type hain jo allergic reactions (jaise allergy ya asthma) aur parasitic infections ke response mein participate karte hain."
        ),
        "if_high_en": [
            "Allergies, eczema, or allergic rhinitis.",
            "Asthma-related airway inflammation.",
            "Parasitic or fungal exposure.",
            "Drug reactions.",
        ],
        "if_high_hi": [
            "Allergies (khujli, chheenk, twacha ke rashes).",
            "Asthma ya saans ki allergy.",
            "Parasitic infections ya drug reactions.",
        ],
        "if_low_en": [
            "Isolated low eosinophils are generally considered clinically normal and safe.",
        ],
        "if_low_hi": [
            "Low eosinophil percentage aam taur par normal aur safe maana jata hai.",
        ],
    },
    "Monocytes": {
        "name_hi": "मोनोसाइट्स (Monocytes)",
        "unit": "%",
        "default_range": "2 - 10 %",
        "what_is_it_en": (
            "Monocytes are larger White Blood Cells that travel into body tissues and become macrophages, clearing cellular debris "
            "and persistent pathogens during infection recovery."
        ),
        "what_is_it_hi": (
            "Monocytes WBC ka type hain jo damaged cells aur harmful germs ko remove karne mein help karte hain."
        ),
        "if_high_en": [
            "Chronic infections or post-illness recovery phase.",
            "Systemic inflammatory conditions.",
        ],
        "if_high_hi": [
            "Chronic infections ya recovery phase.",
        ],
        "if_low_en": [
            "Bone marrow suppression or specific medications.",
        ],
        "if_low_hi": [
            "Certain medication effects.",
        ],
    },
    "Basophils": {
        "name_hi": "बेसोफिल्स (Basophils)",
        "unit": "%",
        "default_range": "0 - 1 %",
        "what_is_it_en": (
            "Basophils are rare White Blood Cells containing histamine and heparin that trigger inflammatory and allergic responses."
        ),
        "what_is_it_hi": (
            "Basophils allergic reactions aur inflammatory responses mein histamine release karte hain."
        ),
        "if_high_en": [
            "Allergic conditions or chronic inflammatory disorders.",
        ],
        "if_high_hi": [
            "Allergic ya inflammatory conditions.",
        ],
        "if_low_en": [
            "Normally near 0%, clinically insignificant.",
        ],
        "if_low_hi": [
            "Aam taur par 0-1% normal hota hai.",
        ],
    },
    "Absolute Neutrophils": {
        "name_hi": "एब्सोल्यूट न्यूट्रोफिल्स (Absolute Neutrophils - ANC)",
        "unit": "/cumm",
        "default_range": "2000 - 7000 /cumm",
        "what_is_it_en": (
            "Absolute Neutrophil Count (ANC) gives the actual physical number of neutrophils per cubic millimeter of blood, "
            "rather than just a relative percentage."
        ),
        "what_is_it_hi": (
            "ANC blood mein neutrophils ki actual quantity (sankhya) batata hai, jo infection fighting capacity ka direct measure hai."
        ),
        "if_high_en": ["Bacterial infection", "Acute inflammation"],
        "if_high_hi": ["Bacterial infection ya stress."],
        "if_low_en": ["Neutropenia (low neutrophil count, higher infection risk)"],
        "if_low_hi": ["Infection se ladne ki kshamata kam hona."],
    },
    "Absolute Lymphocytes": {
        "name_hi": "एब्सोल्यूट लिम्फोसाइट्स (Absolute Lymphocytes - ALC)",
        "unit": "/cumm",
        "default_range": "1000 - 3000 /cumm",
        "what_is_it_en": (
            "Absolute Lymphocyte Count (ALC) measures the actual number of viral-fighting lymphocytes in a unit of blood."
        ),
        "what_is_it_hi": (
            "ALC blood mein viral infection se ladne wale lymphocytes ki vastavik sankhya batata hai."
        ),
        "if_high_en": ["Recent viral infection", "Immune stimulation"],
        "if_high_hi": ["Viral infection ya immune response."],
        "if_low_en": ["Lymphopenia, immune suppression"],
        "if_low_hi": ["Immune system kamzor hona."],
    },
    "Absolute Eosinophils": {
        "name_hi": "एब्सोल्यूट ईोसिनोफिल्स (Absolute Eosinophils - AEC)",
        "unit": "/cumm",
        "default_range": "20 - 500 /cumm",
        "what_is_it_en": (
            "Absolute Eosinophil Count (AEC) quantifies allergy-mediating cells in blood. Commonly monitored in asthma and skin allergies."
        ),
        "what_is_it_hi": (
            "AEC allergy aur asthma se jude eosinophils ki vastavik sankhya darshata hai."
        ),
        "if_high_en": ["Active allergy", "Asthma flare-up", "Parasites"],
        "if_high_hi": ["Allergy, asthma ya parasitic exposure."],
        "if_low_en": ["Clinically insignificant"],
        "if_low_hi": ["Aam taur par normal."],
    },
    "Absolute Monocytes": {
        "name_hi": "एब्सोल्यूट मोनोसाइट्स (Absolute Monocytes - AMC)",
        "unit": "/cumm",
        "default_range": "200 - 1000 /cumm",
        "what_is_it_en": "Measures the absolute number of monocytes helping to clear debris and support chronic defenses.",
        "what_is_it_hi": "Ye monocytes ki vastavik sankhya batata hai.",
        "if_high_en": ["Chronic infection or recovery"],
        "if_high_hi": ["Purani infection ya theek hone ka dauran."],
        "if_low_en": ["Clinically rare"],
        "if_low_hi": ["Aam taur par normal."],
    },
    "RBC Count": {
        "name_hi": "आरबीसी काउंट (RBC Count - Red Blood Cells)",
        "unit": "million/cumm",
        "default_range": "4.5 - 5.5 million/cumm",
        "what_is_it_en": (
            "RBC Count measures the total quantity of Red Blood Cells in your bloodstream. "
            "RBCs are responsible for transporting oxygen from your lungs to every cell."
        ),
        "what_is_it_hi": (
            "RBC Count blood mein Red Blood Cells ki total quantity measure karta hai. RBC ka primary kaam oxygen transport karna hai."
        ),
        "if_low_en": [
            "Anaemia, nutritional deficiency (iron, B12), or blood loss.",
        ],
        "if_low_hi": [
            "Anaemia (khoon ki kami), blood loss ya nutritional deficiency.",
        ],
        "if_high_en": [
            "Dehydration, cigarette smoking, high altitude.",
        ],
        "if_high_hi": [
            "Dehydration, smoking ya high-altitude adaptation.",
        ],
    },
    "MCV": {
        "name_hi": "एमसीवी (MCV - Mean Corpuscular Volume)",
        "unit": "fL",
        "default_range": "81 - 101 fL",
        "what_is_it_en": (
            "MCV measures the average physical size and volume of an individual Red Blood Cell. "
            "It helps doctors determine whether red blood cells are normal in size (normocytic), small (microcytic), or enlarged (macrocytic)."
        ),
        "what_is_it_hi": (
            "MCV ek RBC ka average size ya volume measure karta hai. Ye doctors ko samajhne mein help karta hai ki RBC normal size ki hain, chhoti hain ya badi."
        ),
        "if_low_en": [
            "Microcytosis (smaller red blood cells).",
            "Iron deficiency: low iron stores can restrict hemoglobin production and reduce cell size.",
            "Thalassemia trait: an inherited genetic trait causing smaller cells.",
            "Chronic inflammatory conditions affecting iron utilization.",
            "Next recommended steps: Doctor may advise Serum Ferritin or Iron Profile.",
        ],
        "if_low_hi": [
            "Microcytosis: RBC ka average size normal se chhota hona.",
            "Iron Deficiency: Body mein iron ki kami hone se RBC chhoti ho sakti hain.",
            "Thalassemia Trait: Genetic condition jisme RBC chhoti hoti hain.",
            "Doctor ki salah: Serum Ferritin ya Iron Profile test karwana useful ho sakta hai.",
        ],
        "if_high_en": [
            "Macrocytosis (larger red blood cells).",
            "Vitamin B12 or folic acid deficiency.",
            "Liver conditions or thyroid sluggishness.",
        ],
        "if_high_hi": [
            "Vitamin B12 ya folate deficiency.",
            "Liver conditions ya certain medications.",
        ],
    },
    "MCH": {
        "name_hi": "एमसीएच (MCH - Mean Corpuscular Haemoglobin)",
        "unit": "pg",
        "default_range": "27 - 32 pg",
        "what_is_it_en": (
            "MCH measures the average amount of hemoglobin contained inside each individual Red Blood Cell."
        ),
        "what_is_it_hi": (
            "MCH ek RBC ke andar average haemoglobin ki quantity measure karta hai."
        ),
        "if_low_en": [
            "Hypochromic cells (paler RBCs).",
            "Often seen alongside low iron stores or hemoglobin disorders.",
        ],
        "if_low_hi": [
            "Iron deficiency aur certain haemoglobin disorders.",
        ],
        "if_high_en": [
            "Macrocytic anaemia where enlarged RBCs carry more total hemoglobin.",
        ],
        "if_high_hi": [
            "Badi RBCs mein MCH elevated ho sakta hai.",
        ],
    },
    "MCHC": {
        "name_hi": "एमसीएचसी (MCHC - Mean Corpuscular Haemoglobin Concentration)",
        "unit": "g/dL",
        "default_range": "31.5 - 34.5 g/dL",
        "what_is_it_en": (
            "MCHC measures the average concentration of hemoglobin relative to the total volume of red blood cells. "
            "In simple terms, it indicates how densely packed hemoglobin is within each cell."
        ),
        "what_is_it_hi": (
            "MCHC RBC ke andar haemoglobin ki average concentration measure karta hai. Simple language mein, ye batata hai ki RBC volume ke comparison mein haemoglobin kitna concentrated hai."
        ),
        "if_low_en": [
            "Severe iron deficiency or hypochromia.",
        ],
        "if_low_hi": [
            "Iron ki kami ya hypochromic cells.",
        ],
        "if_high_en": [
            "Elevated MCHC can occur with blood sample/laboratory measurement variations.",
            "Red blood cell membrane conditions (e.g. hereditary spherocytosis).",
            "Hemolysis (breakdown of RBCs).",
            "Recommended: A repeat CBC and peripheral blood smear can confirm accuracy.",
        ],
        "if_high_hi": [
            "Blood sample ya lab measurement variation.",
            "RBC membrane conditions (jaise spherocytosis) ya hemolysis.",
            "Recommended: Repeat CBC ya Peripheral Blood Smear se verify karna useful hota hai.",
        ],
    },
    "Haematocrit (HCT / PCV)": {
        "name_hi": "हेमाटोक्रिट (HCT / PCV - Packed Cell Volume)",
        "unit": "%",
        "default_range": "40 - 50 %",
        "what_is_it_en": (
            "Haematocrit (HCT), also called PCV, measures the percentage of your total blood volume that is composed of Red Blood Cells."
        ),
        "what_is_it_hi": (
            "Hematocrit blood ka woh percentage measure karta hai jo Red Blood Cells se occupied hota hai."
        ),
        "if_low_en": [
            "Anaemia, active blood loss, or overhydration.",
        ],
        "if_low_hi": [
            "Anaemia, blood loss ya overhydration possible causes hain.",
        ],
        "if_high_en": [
            "Dehydration, elevated RBC production, or smoking.",
        ],
        "if_high_hi": [
            "Dehydration ya increased RBC production.",
        ],
    },
    "RDW-CV": {
        "name_hi": "आरडीडब्ल्यू-सीवी (RDW-CV - Red Cell Distribution Width)",
        "unit": "%",
        "default_range": "11.6 - 14.0 %",
        "what_is_it_en": (
            "RDW-CV measures the variation in size among your Red Blood Cells. When cells are roughly the same uniform size, "
            "RDW is normal. When sizes vary widely (some small, some large), RDW increases."
        ),
        "what_is_it_hi": (
            "RDW-CV RBC ke size mein variation measure karta hai. Agar RBC alag-alag sizes ki hoti hain, toh RDW increase hota hai."
        ),
        "if_high_en": [
            "Early iron deficiency, B12 deficiency, or mixed nutritional deficiencies.",
        ],
        "if_high_hi": [
            "Iron deficiency, B12 deficiency ya folate deficiency.",
        ],
        "if_low_en": [
            "Indicates uniform cell size, generally normal.",
        ],
        "if_low_hi": [
            "Normal maana jata hai.",
        ],
    },
    "RDW-SD": {
        "name_hi": "आरडीडब्ल्यू-एसडी (RDW-SD - Red Cell Distribution Width)",
        "unit": "fL",
        "default_range": "39 - 46 fL",
        "what_is_it_en": (
            "RDW-SD is an alternate direct measurement of red blood cell size variation measured in femtoliters."
        ),
        "what_is_it_hi": (
            "RDW-SD bhi RBC ke size variation ko measure karta hai alag calculation method se."
        ),
        "if_high_en": ["Variation in RBC size (anisocytosis)"],
        "if_high_hi": ["RBC size mein badha hua variation."],
        "if_low_en": ["Uniform RBC size"],
        "if_low_hi": ["Normal."],
    },
    "Platelet Count": {
        "name_hi": "प्लेटलेट काउंट (Platelet Count - Thrombocytes)",
        "unit": "/cumm",
        "default_range": "150000 - 410000 /cumm",
        "what_is_it_en": (
            "Platelets are tiny cell fragments essential for normal blood clotting. "
            "When you get a cut or bruise, platelets clump together at the injury site to stem bleeding."
        ),
        "what_is_it_hi": (
            "Platelets blood clotting process mein important role play karte hain. Jab body mein cut ya injury hoti hai, platelets bleeding rokne mein help karte hain."
        ),
        "if_low_en": [
            "Thrombocytopenia: increased risk of easy bruising, petechiae, or prolonged bleeding.",
            "Can occur after viral illnesses (like dengue) or due to certain medications.",
        ],
        "if_low_hi": [
            "Thrombocytopenia: bleeding ya bruising ka risk badh sakta hai.",
            "Viral illnesses (jaise dengue) ya medications ke baad ho sakta hai.",
        ],
        "if_high_en": [
            "Thrombocytosis: increased risk of unwanted clotting.",
            "Often reactive to systemic inflammation, iron deficiency, or infection.",
        ],
        "if_high_hi": [
            "Thrombocytosis: abnormal clotting ka risk badh sakta hai.",
            "Inflammation ya iron deficiency ke response mein badh sakta hai.",
        ],
    },
    "MPV": {
        "name_hi": "एमपीवी (MPV - Mean Platelet Volume)",
        "unit": "fL",
        "default_range": "7.5 - 11.5 fL",
        "what_is_it_en": (
            "MPV measures the average size of your platelets. Younger platelets newly released from bone marrow are larger."
        ),
        "what_is_it_hi": (
            "MPV platelets ka average size measure karta hai. Nayi platelets aam taur par badi hoti hain."
        ),
        "if_high_en": ["Higher proportion of young, active platelets in circulation"],
        "if_high_hi": ["Young ya larger platelets ka proportion badha hona."],
        "if_low_en": ["Smaller platelets in circulation"],
        "if_low_hi": ["Smaller platelets ka proportion zyada hona."],
    },
    "PCT": {
        "name_hi": "पीसीटी (PCT - Plateletcrit)",
        "unit": "%",
        "default_range": "0.15 - 0.40 %",
        "what_is_it_en": (
            "Plateletcrit reflects the total volume percentage of blood occupied by platelets, analogous to haematocrit."
        ),
        "what_is_it_hi": (
            "Plateletcrit blood mein platelets ke total volume ka percentage batata hai."
        ),
        "if_high_en": ["Correlates with higher platelet mass"],
        "if_high_hi": ["Platelet mass badha hona."],
        "if_low_en": ["Correlates with lower platelet mass"],
        "if_low_hi": ["Platelet mass kam hona."],
    },
    "PDW": {
        "name_hi": "पीडीडब्ल्यू (PDW - Platelet Distribution Width)",
        "unit": "%",
        "default_range": "9.0 - 17.0 %",
        "what_is_it_en": (
            "PDW measures the variation in platelet size, indicating active platelet turnover."
        ),
        "what_is_it_hi": (
            "PDW platelets ke size mein variation measure karta hai."
        ),
        "if_high_en": ["Greater heterogeneity in platelet size"],
        "if_high_hi": ["Platelet size mein variation."],
        "if_low_en": ["Uniform platelet size"],
        "if_low_hi": ["Normal."],
    },
}

# Recognition Patterns for multi-line and tabular laboratory reports
CBC_TEST_PATTERNS: list[tuple[str, str, str]] = [
    ("Haemoglobin (Hb)", r"^\s*(?:haemoglobin|hemoglobin|hb)\b", "g/dL"),
    ("Total Leucocyte Count (TLC)", r"^\s*(?:total\s+leucocyte\s+count|tlc|total\s+wbc|wbc\s+count)\b", "/cumm"),
    ("Absolute Neutrophils", r"^\s*(?:absolute\s+neutrophils?|anc)\b", "/cumm"),
    ("Absolute Lymphocytes", r"^\s*(?:absolute\s+lymphocytes?|alc)\b", "/cumm"),
    ("Absolute Eosinophils", r"^\s*(?:absolute\s+eosinophils?|aec)\b", "/cumm"),
    ("Absolute Monocytes", r"^\s*(?:absolute\s+monocytes?|amc)\b", "/cumm"),
    ("Neutrophils", r"^\s*neutrophils?\b", "%"),
    ("Lymphocytes", r"^\s*lymphocytes?\b", "%"),
    ("Eosinophils", r"^\s*eosinophils?\b", "%"),
    ("Monocytes", r"^\s*monocytes?\b", "%"),
    ("Basophils", r"^\s*basophils?\b", "%"),
    ("RBC Count", r"^\s*(?:rbc\s+count|total\s+rbc|red\s+blood\s+cells?)\b", "million/cumm"),
    ("MCV", r"^\s*(?:mcv|mean\s+corpuscular\s+volume)\b", "fL"),
    ("MCH", r"^\s*(?:mch|mean\s+corpuscular\s+ha?emoglobin)\b", "pg"),
    ("MCHC", r"^\s*(?:mchc|mean\s+corpuscular\s+ha?emoglobin\s+concentration)\b", "g/dL"),
    ("Haematocrit (HCT / PCV)", r"^\s*(?:hct|ha?ematocrit|pcv|packed\s+cell\s+volume)\b", "%"),
    ("RDW-CV", r"^\s*rdw-cv\b", "%"),
    ("RDW-SD", r"^\s*rdw-sd\b", "fL"),
    ("Platelet Count", r"^\s*(?:platelet\s+count|thrombocytes?)\b", "/cumm"),
    ("PCT", r"^\s*(?:pct|plateletcrit)\b", "%"),
    ("MPV", r"^\s*(?:mpv|mean\s+platelet\s+volume)\b", "fL"),
    ("PDW", r"^\s*(?:pdw|platelet\s+distribution\s+width)\b", "%"),
]


class CBCAnalysisService:
    @staticmethod
    def extract_cbc_findings(text: str) -> list[dict[str, Any]]:
        """
        Robustly extracts all CBC and hematology parameters from tabular, multi-line, or inline formats.
        Evaluates status against printed reference ranges.
        """
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        findings: list[dict[str, Any]] = []
        already_matched: set[str] = set()

        for i, line in enumerate(lines):
            for test_name, pattern, default_unit in CBC_TEST_PATTERNS:
                if test_name in already_matched:
                    continue

                if re.search(pattern, line, re.IGNORECASE):
                    # Table scanner: inspect next lines
                    val: str | None = None
                    ref_range: str | None = None
                    unit = default_unit

                    # Check if value is on the same line (inline format: e.g. "Haemoglobin: 15 g/dL (13-17)")
                    same_line_remainder = line[re.search(pattern, line, re.IGNORECASE).end():]  # type: ignore[union-attr]
                    if same_line_remainder.strip():
                        val_m = re.search(r"[:\s]+(\d+(?:\.\d+)?)\s*([a-zA-Z/%]+)?", same_line_remainder)
                        if val_m:
                            val = val_m.group(1).strip()
                            if val_m.group(2):
                                unit = val_m.group(2).strip()
                        range_m = re.search(r"(\d+(?:\.\d+)?\s*[-–to]\s*\d+(?:\.\d+)?)", same_line_remainder)
                        if range_m:
                            ref_range = range_m.group(1).strip()

                    # If not found on same line, scan subsequent 1 to 5 lines
                    if not val or not ref_range:
                        for j in range(i + 1, min(len(lines), i + 6)):
                            sub = lines[j]
                            # Stop if another test header is encountered
                            if any(re.search(p, sub, re.IGNORECASE) for t, p, _ in CBC_TEST_PATTERNS if t != test_name):
                                break

                            # Check range pattern: e.g. "13 - 17", "4000-10000", "4.5 - 5.5"
                            if not ref_range:
                                range_match = re.search(r"(\d+(?:\.\d+)?\s*[-–to]\s*\d+(?:\.\d+)?)", sub)
                                if range_match:
                                    ref_range = range_match.group(1).strip()
                                    continue

                            # Check standalone numeric value: e.g. "15", "5000", "80.00", "37.50"
                            if not val:
                                val_match = re.search(r"^(\d+(?:\.\d+)?)$", sub)
                                if val_match:
                                    val = val_match.group(1).strip()
                                    continue

                            # Check known units
                            if sub.lower() in ["%", "fl", "pg", "/cumm", "g/dl", "million/cumm", "mil-"]:
                                if sub.lower() == "mil-" and j + 2 < len(lines) and "cumm" in lines[j + 2].lower():
                                    unit = "million/cumm"
                                elif sub.lower() != "mil-":
                                    unit = sub

                    catalog_info = CBC_REFERENCE_CATALOG.get(test_name, {})
                    effective_range = ref_range or catalog_info.get("default_range", "Standard clinical range")
                    effective_val = val or "Normal"

                    # Evaluate status strictly against printed range
                    status_eval = "normal"
                    if val:
                        status_eval = lab_validator.evaluate_status(val, effective_range)

                    what_is_it_en = catalog_info.get("what_is_it_en", f"{test_name} is a standard blood count parameter.")
                    what_is_it_hi = catalog_info.get("what_is_it_hi", f"{test_name} ek standard blood count parameter hai.")

                    # Build patient condition observation
                    if status_eval in ("high", "elevated"):
                        patient_condition_en = f"Your {test_name} reading ({effective_val} {unit}) is above the reference range ({effective_range})."
                        patient_condition_hi = f"Patient ka {test_name} ({effective_val} {unit}) reference range ({effective_range}) se high hai."
                    elif status_eval == "low":
                        patient_condition_en = f"Your {test_name} reading ({effective_val} {unit}) is below the reference range ({effective_range})."
                        patient_condition_hi = f"Patient ka {test_name} ({effective_val} {unit}) reference range ({effective_range}) se slightly low hai."
                    else:
                        patient_condition_en = f"Your {test_name} reading ({effective_val} {unit}) is within the normal reference range ({effective_range})."
                        patient_condition_hi = f"Patient ka {test_name} ({effective_val} {unit}) normal reference range ke andar hai."

                    findings.append({
                        "testName": test_name,
                        "testNameHi": catalog_info.get("name_hi") or test_name,
                        "value": str(effective_val),
                        "unit": unit,
                        "referenceRange": effective_range,
                        "status": status_eval,
                        "critical": False,
                        "explanation": f"{patient_condition_en} {what_is_it_en}",
                        "explanationHi": f"{patient_condition_hi} {what_is_it_hi}",
                        "whyItMatters": what_is_it_en,
                        "whyItMattersHi": what_is_it_hi,
                        "whatIsIt": what_is_it_en,
                        "whatIsItHi": what_is_it_hi,
                        "ifHigh": catalog_info.get("if_high_en", []),
                        "ifHighHi": catalog_info.get("if_high_hi", []),
                        "ifLow": catalog_info.get("if_low_en", []),
                        "ifLowHi": catalog_info.get("if_low_hi", []),
                        "needsReview": False,
                        "sources": [
                            {
                                "name": "MedlinePlus",
                                "title": f"Understanding Complete Blood Count ({test_name})",
                                "url": "https://medlineplus.gov/lab-tests/complete-blood-count-cbc/",
                            }
                        ],
                    })
                    already_matched.add(test_name)
                    break

        return findings

    @staticmethod
    def build_clinical_cbc_summary(
        findings: list[dict[str, Any]],
        user_conditions: list[str] | None = None,
    ) -> tuple[str, str]:
        """
        Constructs the detailed clinical summary exactly matching the 15-page standard interpretation PDF.
        Separates Normal findings and Findings Requiring Attention, then provides an Overall Interpretation.
        """
        normal_findings: list[dict[str, Any]] = []
        attention_findings: list[dict[str, Any]] = []

        for f in findings:
            if f.get("status") in ("high", "low", "elevated"):
                attention_findings.append(f)
            else:
                normal_findings.append(f)

        # English Clinical Summary
        en_lines: list[str] = ["📋 CBC Report – Detailed Medical Interpretation\n"]

        # 1. Normal Findings List
        if normal_findings:
            en_lines.append("✅ Normal Findings:")
            for nf in normal_findings:
                en_lines.append(f"  • {nf['testName']}: {nf['value']} {nf['unit']} (Ref: {nf['referenceRange']})")
            en_lines.append("")

        # 2. Findings Requiring Attention
        if attention_findings:
            en_lines.append("⚠️ Findings Requiring Attention:")
            for af in attention_findings:
                en_lines.append(f"  • {af['testName']}: {af['value']} {af['unit']} [{af['status'].upper()}] (Ref: {af['referenceRange']})")
                if af.get("status") == "low" and af.get("ifLow"):
                    reasons = "; ".join(af["ifLow"][:2])
                    en_lines.append(f"    Possible reasons: {reasons}")
                elif af.get("status") in ("high", "elevated") and af.get("ifHigh"):
                    reasons = "; ".join(af["ifHigh"][:2])
                    en_lines.append(f"    Possible reasons: {reasons}")
            en_lines.append("")
        else:
            en_lines.append("✅ All extracted parameters are currently within normal laboratory intervals.\n")

        # 3. Overall Interpretation
        en_lines.append("🩺 Overall Interpretation:")
        if attention_findings:
            attention_names = ", ".join([a["testName"] for a in attention_findings])
            en_lines.append(
                f"Most blood count parameters are within normal laboratory reference ranges. "
                f"However, results for {attention_names} require clinical correlation and review with your physician. "
                "This report alone does not establish a diagnosis — your doctor may consider verifying with a repeat test or iron profile if indicated."
            )
        else:
            en_lines.append(
                "Your complete blood count demonstrates reassuring stability across all cell lines. "
                "Continue to maintain a balanced diet and discuss routine baseline metrics at your next periodic checkup."
            )

        # 4. User Health Condition Relevance
        if user_conditions:
            conds_str = ", ".join([c.replace("-", " ").title() for c in user_conditions])
            en_lines.append(
                f"\n🏥 Connection to Your Health Profile:\n"
                f"Given your recorded history of {conds_str}, healthy oxygen transport and stable blood counts "
                f"provide valuable baseline support for cardiovascular and metabolic vitality."
            )

        en_summary = "\n".join(en_lines)

        # Hindi / Hinglish Clinical Summary
        hi_lines: list[str] = ["📋 सीबीसी रिपोर्ट – विस्तृत मेडिकल विवरण (CBC Detailed Interpretation)\n"]

        if normal_findings:
            hi_lines.append("✅ सामान्य परिणाम (Normal Findings):")
            for nf in normal_findings:
                name_hi = nf.get("testNameHi") or nf["testName"]
                hi_lines.append(f"  • {name_hi}: {nf['value']} {nf['unit']} (सामान्य सीमा: {nf['referenceRange']})")
            hi_lines.append("")

        if attention_findings:
            hi_lines.append("⚠️ ध्यान देने योग्य परिणाम (Findings Requiring Attention):")
            for af in attention_findings:
                name_hi = af.get("testNameHi") or af["testName"]
                status_txt = "कम (Low)" if af.get("status") == "low" else "अधिक (High)"
                hi_lines.append(f"  • {name_hi}: {af['value']} {af['unit']} [{status_txt}] (सामान्य सीमा: {af['referenceRange']})")
                if af.get("status") == "low" and af.get("ifLowHi"):
                    reasons = "; ".join(af["ifLowHi"][:2])
                    hi_lines.append(f"    संभावित कारण: {reasons}")
                elif af.get("status") in ("high", "elevated") and af.get("ifHighHi"):
                    reasons = "; ".join(af["ifHighHi"][:2])
                    hi_lines.append(f"    संभावित कारण: {reasons}")
            hi_lines.append("")
        else:
            hi_lines.append("✅ जांचे गए सभी परिणाम वर्तमान में प्रयोगशाला की सामान्य सीमा के भीतर हैं।\n")

        hi_lines.append("🩺 समग्र व्याख्या (Overall Interpretation):")
        if attention_findings:
            attention_names_hi = ", ".join([a.get("testNameHi") or a["testName"] for a in attention_findings])
            hi_lines.append(
                f"अधिकांश ब्लड काउंट पैरामीटर सामान्य सीमा के भीतर हैं। "
                f"हालांकि, {attention_names_hi} पर डॉक्टर से परामर्श लेना और जरूरत पड़ने पर दोबारा जांच कराना उपयोगी रहेगा। "
                "यह रिपोर्ट अकेले कोई बीमारी साबित नहीं करती है।"
            )
        else:
            hi_lines.append(
                "आपके ब्लड काउंट के सभी प्रमुख घटक स्थिर और सामान्य स्थिति दर्शाते हैं। "
                "संतुलित खान-पान जारी रखें और नियमित स्वास्थ्य जांच के समय अपने डॉक्टर से सलाह लें।"
            )

        if user_conditions:
            conds_str = ", ".join([c.replace("-", " ").title() for c in user_conditions])
            hi_lines.append(
                f"\n🏥 आपके स्वास्थ्य रिकॉर्ड के अनुसार:\n"
                f"आपकी प्रोफाइल में दर्ज स्थिति ({conds_str}) को ध्यान में रखते हुए, सामान्य ब्लड काउंट आपकी "
                f"समग्र रोग प्रतिरोधक क्षमता और दिल के स्वास्थ्य को सहारा देते हैं।"
            )

        hi_summary = "\n".join(hi_lines)

        return en_summary, hi_summary


cbc_service = CBCAnalysisService()
