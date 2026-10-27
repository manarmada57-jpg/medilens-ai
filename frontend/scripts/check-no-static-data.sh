#!/usr/bin/env bash
# check-no-static-data.sh
# Scans frontend source for static/fake data that must not reach production.
# Usage:  bash scripts/check-no-static-data.sh [src-dir]
# Exit 0 = clean.  Exit 1 = violations found.

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

# 1. mockData imports
check "mockData import" \
  "from ['\"](\.\./)*data/mockData" \
  "mockData\.ts"

# 2. Fake person names (Eleanor, Mitchell, Watson, Rao)
check "Fake person names (Dr. Watson/Rao, Eleanor, Mitchell)" \
  "Dr\.? ?(Watson|Rao)|Eleanor|Mitchell" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 3. Hardcoded lab/pharmacy names (Quest, CVS)
check "Hardcoded lab/pharmacy names (Quest, CVS)" \
  "\b(Quest|CVS)\b" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 4. Hardcoded drug names (Atorvastatin, Metformin, Lisinopril)
check "Hardcoded drug names (Atorvastatin, Metformin, Lisinopril)" \
  "Atorvastatin|Metformin|Lisinopril" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 5. Take <drug> directives
check "Take <drug> directives" \
  "Take (Metformin|Lisinopril|Atorvastatin)" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 6. Unverified/misleading marketing claims (Verified, HIPAA, 256-bit)
check "Unverified security/compliance claims (Verified, HIPAA, 256-bit)" \
  "Verified|HIPAA|256-?bit" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 7. Hardcoded times in JSX strings ([0-9]{1,2}:[0-9]{2} (AM|PM))
check "Hardcoded time literals" \
  "[0-9]{1,2}:[0-9]{2} ?(AM|PM)" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 8. Hardcoded dates (October 20xx)
check "Hardcoded dates (October 20xx)" \
  "October 20[0-9]{2}" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 9. US emergency number 911
check "US emergency number 911" \
  "tel:911|call 911|['\">\s]911['\"\s<]" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

# 10. Fake progress / simulated upload
check "Simulated upload (setTimeout mock)" \
  "setTimeout.*mock|setTimeout.*sample|openSampleReport|mockDocument" \
  "(mockData\.ts|\.test\.|\.spec\.|// )"

echo ""
echo "=== Summary ==="
echo "Violation categories: $VIOLATIONS"
echo "Total flagged lines:  $TOTAL"
echo ""

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✅  No static data violations found."
  exit 0
else
  echo "❌  Fix the above before Stage A gate can pass."
  exit 1
fi
