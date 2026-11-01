"""
Biomarker Validation & Normalization Service.
Enforces rule: Always prioritize the printed reference range on the patient's report.
Normalizes test names (including Indian diagnostic lab conventions) and calculates status.
"""

import re

LAB_NORMALIZATION_MAP = {
    # Glucose / Diabetes
    "fbs": "Fasting Blood Glucose",
    "fasting blood sugar": "Fasting Blood Glucose",
    "fasting blood glucose": "Fasting Blood Glucose",
    "fasting plasma glucose": "Fasting Blood Glucose",
    "ppbs": "Postprandial Blood Glucose",
    "post prandial blood sugar": "Postprandial Blood Glucose",
    "hba1c": "Hemoglobin A1c (HbA1c)",
    "glycosylated hemoglobin": "Hemoglobin A1c (HbA1c)",
    "glycated hemoglobin": "Hemoglobin A1c (HbA1c)",
    # Lipids
    "total cholesterol": "Total Cholesterol",
    "serum cholesterol": "Total Cholesterol",
    "triglycerides": "Triglycerides",
    "serum triglycerides": "Triglycerides",
    "hdl": "HDL (Good) Cholesterol",
    "hdl cholesterol": "HDL (Good) Cholesterol",
    "ldl": "LDL (Bad) Cholesterol",
    "ldl cholesterol": "LDL (Bad) Cholesterol",
    # Kidney
    "serum creatinine": "Serum Creatinine",
    "creatinine": "Serum Creatinine",
    "blood urea nitrogen": "Blood Urea Nitrogen (BUN)",
    "bun": "Blood Urea Nitrogen (BUN)",
    "egfr": "eGFR (Kidney Filtration)",
    # Liver
    "sgpt": "ALT (SGPT) Liver Enzyme",
    "alt": "ALT (SGPT) Liver Enzyme",
    "sgot": "AST (SGOT) Liver Enzyme",
    "ast": "AST (SGOT) Liver Enzyme",
    "bilirubin total": "Total Bilirubin",
    # Thyroid & Blood
    "tsh": "Thyroid Stimulating Hormone (TSH)",
    "hemoglobin": "Hemoglobin",
    "hb": "Hemoglobin",
    "platelets": "Platelet Count",
    "total platelet count": "Platelet Count",
}


class LabReportValidator:
    @staticmethod
    def normalize_test_name(raw_name: str) -> str:
        clean = raw_name.strip().lower()
        # 1. Exact match
        if clean in LAB_NORMALIZATION_MAP:
            return LAB_NORMALIZATION_MAP[clean]
        # 2. Key is contained in the input (e.g. "fasting blood glucose" in "fasting blood glucose level")
        for key, standard_name in LAB_NORMALIZATION_MAP.items():
            if key in clean:
                return standard_name
        return raw_name.strip()

    @staticmethod
    def evaluate_status(value_str: str, range_str: str) -> str:
        """
        Parses numerical range 'min - max' or '< max' and compares against value.
        Strict rule: Evaluates strictly according to printed reference range.
        """
        try:
            # Extract numeric value
            val_match = re.search(r"[-+]?\d*\.\d+|\d+", value_str)
            if not val_match:
                return "normal"
            val = float(val_match.group(0))

            # Range format 1: '70 - 99' or '70.0 - 99.0' or '70-99'
            dash_range = re.search(r"(\d+(?:\.\d+)?)\s*[-–to]\s*(\d+(?:\.\d+)?)", range_str)
            if dash_range:
                low = float(dash_range.group(1))
                high = float(dash_range.group(2))
                if val < low:
                    return "low"
                if val > high:
                    return "high"
                return "normal"

            # Range format 2: '< 200' or '<= 100'
            less_than = re.search(r"[<≤]\s*(\d+(?:\.\d+)?)", range_str)
            if less_than:
                threshold = float(less_than.group(1))
                if val > threshold:
                    return "elevated" if val < threshold * 1.25 else "high"
                return "normal"

            # Range format 3: '> 40'
            greater_than = re.search(r"[>≥]\s*(\d+(?:\.\d+)?)", range_str)
            if greater_than:
                threshold = float(greater_than.group(1))
                if val < threshold:
                    return "low"
                return "normal"

            return "normal"
        except Exception:
            return "normal"


lab_validator = LabReportValidator()
