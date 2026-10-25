#!/usr/bin/env bash
# check-no-static-data.sh
# Scans frontend source for static/fake data that must not reach production.
# Usage:  bash scripts/check-no-static-data.sh [src-dir]
# Exit 0 = clean.  Exit 1 = violations found.
#
# Categories checked:
#   1. mockData imports
#   2. Fake person names (Eleanor, Mitchell, Watson, Rao)
#   3. Hardcoded drug names used as identity (Lisinopril, Metformin, Atorvastatin)
#   4. Fake document file names (Quest_Metabolic_Panel)
#   5. Drug safety verdicts written in JSX
#   6. US emergency number (911) in JSX strings
#   7. Hardcoded "HIPAA" compliance claims
#   8. Simulated progress / fake upload (setTimeout.*open.*mock)
#   9. Direct array index access for medication lists
#  10. Hardcoded doses in JSX (e.g. "Metformin 500mg" in a string literal)

SRC="${1:-src}"
VIOLATIONS=0
TOTAL=0

check() {
  local label="$1"
  local pattern="$2"
  local exclude="${3:-^$}"   # optional exclude pattern
  local results
  results=$(grep -rn --include="*.ts" --include="*.tsx" -E "$pattern" "$SRC" 2>/dev/null \
            | grep -vE "$exclude" \
            | grep -v "//.*check-no-static-data: ignore" \
            | grep -v "mockData.ts" \
            | grep -v "check-no-static-data.sh")

  local count
  count=$(echo "$results" | grep -c . 2>/dev/null || true)
  TOTAL=$((TOTAL + count))

  if [ "$count" -gt 0 ]; then
    echo ""
    echo "❌  [$label] — $count line(s):"
    echo "$results" | head -20
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
}

echo "=== MediLens AI — Static Data Checker ==="
echo "Scanning: $SRC"
echo ""

# 1. mockData imports (from production component files)
check "mockData import" \
  "from ['\"](\.\./)*data/mockData" \
  "mockData\.ts"

# 2. Fake person names
check "Fake person names (Eleanor/Mitchell/Watson/Rao)" \
  "(Eleanor|Mitchell|Watson|Rao)" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 3. Hardcoded drug names as identity strings (not in option/select elements)
check "Hardcoded drug names in JSX strings" \
  "(Lisinopril|Atorvastatin|Metformin)\s+[0-9]" \
  "(mockData\.ts|\.test\.|\.spec\.|option value)"

# 4. Fake document file names
check "Fake document filenames" \
  "Quest_Metabolic_Panel|fake_report|sample_report" \
  "(mockData\.ts|\.test\.|\.spec\.)"

# 5. Drug safety verdicts in JSX
check "Drug safety verdicts in JSX" \
  "safe to take together|no drug interactions|interaction-free" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 6. US emergency number 911 in string literals
check "US emergency number 911 in JSX" \
  "['\">\s]911['\"\s<]|call 911" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 7. HIPAA compliance claims
check "HIPAA compliance claims" \
  "HIPAA" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 8. setTimeout simulating upload/analysis
check "Simulated upload (setTimeout opening mock)" \
  "setTimeout.*mock\|setTimeout.*sample\|openSampleReport\|mockDocument" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 9. Direct positional medication array access in JSX
check "Direct positional medication array access [0]/[1]/[2]" \
  "medications\[[012]\]" \
  "(mockData\.ts|\.test\.|\.spec\.|// |find\(|refillAlerts)"

# 10. Hardcoded doses in JSX string literals
check "Hardcoded dose strings in JSX" \
  '"(Metformin|Lisinopril|Atorvastatin) [0-9]+(mg|mcg)"' \
  "(mockData\.ts|\.test\.|\.spec\.|option|placeholder)"

echo ""
echo "=== Summary ==="
echo "Violation categories: $VIOLATIONS"
echo "Total flagged lines:  $TOTAL"
echo ""

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✅  No static data violations found."
  exit 0
else
  echo "❌  Fix the above before Stage 2 gate can pass."
  exit 1
fi
