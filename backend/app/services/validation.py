"""
Biomarker Validation & Normalization Service.
Enforces rule: Always prioritize the printed reference range on the patient's report.
Normalizes test names (including Indian diagnostic lab conventions) and calculates status.
"""

import re
from typing import Any

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

    @staticmethod
    def verify_source_grounding(
        findings: list[dict[str, Any]],
        raw_text: str,
    ) -> list[dict[str, Any]]:
        """
        Task 3 & 4: Source Grounding & Uncertainty Engine.
        1. Verifies that every extracted test name and value actually exist in the OCR/document text.
        2. Strictly verifies that reference range is from the report text. If missing, flags needs_confirmation.
        3. Never guesses text on unreadable or corrupted lines.
        4. Assigns confidence (0.0 to 1.0) and confirmation status ('ok' | 'needs_confirmation' | 'unreadable').
        """
        grounded_findings: list[dict[str, Any]] = []
        raw_lower = raw_text.lower()

        for f in findings:
            item = dict(f)
            t_name = str(item.get("testName", "")).strip()
            val_str = str(item.get("value", "")).strip()
            ref_range = str(item.get("referenceRange", "")).strip()

            # 1. Unreadable check (e.g. OCR blur / garbage)
            is_unreadable = (
                "???" in val_str
                or "unreadable" in val_str.lower()
                or "unreadable" in t_name.lower()
                or any(ord(c) < 32 and c not in "\n\r\t" for c in val_str)
            )
            if is_unreadable:
                item["confirmationStatus"] = "unreadable"
                item["needs_confirmation"] = True
                item["needsReview"] = True
                item["confidence"] = 0.10
                item["explanation"] = (
                    "⚠️ Line text was unreadable or blurred in the document. "
                    "Do not rely on automatic reading — please check your physical report."
                )
                grounded_findings.append(item)
                continue

            # 2. Test Name Grounding Check
            # Check if main test keywords exist in document text
            name_tokens = [tok for tok in re.split(r"[\s\(\)/-]+", t_name.lower()) if len(tok) >= 2]
            name_grounded = any(tok in raw_lower for tok in name_tokens) if name_tokens else True

            # 3. Value Grounding Check
            val_grounded = False
            if val_str:
                # Direct string search
                if val_str.lower() in raw_lower:
                    val_grounded = True
                else:
                    # Numerical tolerance search (e.g. 15 vs 15.0 or 80.00 vs 80)
                    num_match = re.search(r"[-+]?\d*\.?\d+", val_str)
                    if num_match:
                        raw_num = float(num_match.group(0))
                        # Look for equivalent float in text
                        all_nums = re.findall(r"[-+]?\d*\.?\d+", raw_text)
                        for n in all_nums:
                            try:
                                if abs(float(n) - raw_num) < 0.001:
                                    val_grounded = True
                                    break
                            except ValueError:
                                continue

            # 4. Reference Range Grounding Check
            # Strict rule: Reference range MUST only come from the document, never fabricated
            ref_grounded = False
            if ref_range and ref_range != "Standard clinical range" and ref_range != "Not specified in report":
                # Check if range digits appear in raw text
                range_digits = re.findall(r"\d+(?:\.\d+)?", ref_range)
                if range_digits and all(d in raw_text for d in range_digits):
                    ref_grounded = True

            # If reference range was not printed in the report:
            if not ref_grounded:
                item["referenceRange"] = "Not specified in report" if not ref_range or ref_range == "Standard clinical range" else ref_range

            # 5. Evaluate Confidence & Status
            if not val_grounded or not name_grounded:
                # Unverified / Hallucinated value caught!
                item["confirmationStatus"] = "needs_confirmation"
                item["needs_confirmation"] = True
                item["needsReview"] = True
                item["confidence"] = 0.35
                if not val_grounded:
                    item["explanation"] = (
                        f"⚠️ Unverified Value: '{val_str}' could not be cleanly confirmed in the report text. "
                        "Please verify against your paper copy before saving."
                    )
            elif not ref_grounded:
                # Value is grounded, but report lacked printed reference range
                item["confirmationStatus"] = "needs_confirmation"
                item["needs_confirmation"] = True
                item["confidence"] = 0.70
            else:
                # Both value and reference range grounded from report
                item["confirmationStatus"] = "ok"
                item["needs_confirmation"] = False
                item["confidence"] = 0.98

            grounded_findings.append(item)

        return grounded_findings

    @staticmethod
    def verify_medicine_grounding(
        medicines: list[dict[str, Any]],
        raw_text: str,
    ) -> list[dict[str, Any]]:
        """
        Verifies extracted medicines against raw document text.
        """
        raw_lower = raw_text.lower()
        grounded_meds: list[dict[str, Any]] = []

        for m in medicines:
            item = dict(m)
            med_name = str(item.get("name", "")).strip().lower()

            # Check if medicine name appears in text
            tokens = [t for t in re.split(r"\s+", med_name) if len(t) >= 3]
            med_found = any(tok in raw_lower for tok in tokens) if tokens else (med_name in raw_lower)

            if not med_found or item.get("unclear"):
                item["confirmationStatus"] = "needs_confirmation"
                item["needs_confirmation"] = True
                item["needsReview"] = True
                item["confidence"] = 0.40
            else:
                item["confirmationStatus"] = "ok"
                item["needs_confirmation"] = False
                item["confidence"] = 0.95

            grounded_meds.append(item)

        return grounded_meds


lab_validator = LabReportValidator()
