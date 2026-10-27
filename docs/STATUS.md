# MediLens AI — Project Status

Last Updated: 2026-10-27 (Task T0 Baseline & Environment Completed)

## T0: Baseline and Environment Report

### Local Setup & Environment
- **Workspace Path**: `/Users/sama/Downloads/medilens-ai`
- **Base Commit**: `c278175` ("feat(stage-a): complete Step R baseline and Stage A honest output & contract fixes")
- **Python Runtime**: Python 3.12.16 managed via `.python-version` (3.12) and dedicated `backend/.venv`.
- **Node Runtime**: Node.js 22+ with strict TypeScript, Vite 6, and Tailwind CSS v4.
- **Git Hygiene**: `.gitignore` confirmed ignoring `.env`, `dist/`, `.mypy_cache/`, `.ruff_cache/`, `__pycache__/`, `node_modules/`. All 5 static mockup screenshots in `docs/design/` deleted from git tracking.

### Baseline Command Execution Results

1. **Backend Unit & Integration Tests**:
   - Command: `cd backend && .venv/bin/pytest -q`
   - Result: `56 passed in 1.32s`
   - Failing tests: **None (0 failed)**.

2. **Backend Linting**:
   - Command: `cd backend && .venv/bin/ruff check app tests`
   - Result: `All checks passed!`

3. **Backend Static Type Checking**:
   - Command: `cd backend && .venv/bin/mypy app`
   - Result: `Success: no issues found in 33 source files`

4. **Frontend Type Checking**:
   - Command: `cd frontend && npx tsc --noEmit`
   - Result: `0 errors` (clean pass)

5. **Frontend Static Mock Data Scanner**:
   - Command: `cd frontend && bash scripts/check-no-static-data.sh src`
   - Result: `0 violations found` across all source files

6. **Frontend Production Build**:
   - Command: `cd frontend && npm run build`
   - Result: `built in 1.15s` (`dist/index.html`, CSS, JS chunks cleanly generated)

### API Surface Analysis
- **Total Backend Routes**: 43 distinct API paths (55 operations across 44 OpenAPI paths + 1 root `/` route)
- **Total Frontend API Calls**: 34 distinct API paths called across `frontend/src/api/*.ts`
- **Frontend Calls Without a Backend Route (2)**:
  - `POST /api/auth/password/forgot` (scheduled for Task T4)
  - `POST /api/auth/password/reset` (scheduled for Task T4)

---

## Task Cards Roadmap (docs/ANTIGRAVITY_PROMPT.md)

| Card | Task Name | Status | Proof Summary |
|---|---|---|---|
| **T0** | Baseline and Environment | ✅ COMPLETED | Python 3.12 venv, .env.example aligned, README updated, docs/design removed, 56/56 tests passing |
| **T1** | Fix the Lab Parser | ⏸️ PENDING | Target: pure `lab_parser.py`, printed range only, 8 parametrized test cases |
| **T2** | Honest Result Fields | ⏸️ PENDING | Target: real pipeline timings, doctor/provider text or null, needsReview badges |
| **T3** | Real AI Extraction + Prescriptions | ⏸️ PENDING | Target: LLM structured schema, 1-0-1 expansion, untrusted delimiters |
| **T4** | Security Batch | ⏸️ PENDING | Target: result encryption, password reset endpoints, rate limiting |
| **T5** | Safer Login Storage | ⏸️ PENDING | Target: HttpOnly cookies, in-memory tokens, refresh resilience |
| **T6** | Real Background Jobs | ⏸️ PENDING | Target: ARQ + Redis worker, async polling |
| **T7** | Medicines & Real Reminders | ⏸️ PENDING | Target: Timezone-aware schedule, real VAPID push keys |
| **T8** | Real Knowledge Base | ⏸️ PENDING | Target: MedlinePlus/WHO/NIH ingestion, Indian test/brand aliases |
| **T9** | Safety Layer & Evaluations | ⏸️ PENDING | Target: Emergency triage rules, red-team eval suite |
| **T10** | Image & Video Check | ⏸️ PENDING | Target: Feature flag OFF, Laplacian variance check |
| **T11** | Frontend Structure | ⏸️ PENDING | Target: React Router, error boundary, skeleton states |
| **T12** | Accessibility & Language | ⏸️ PENDING | Target: WCAG 2.1 AA, i18n English/Hindi, merge desktop duplicates |
| **T13** | Self-care, Settings, PWA | ⏸️ PENDING | Target: Dynamic condition pages, consent timestamps, PWA manifest |
| **T14** | Caregiver, Export, Delete | ⏸️ PENDING | Target: Caregiver invite/accept, complete account erasure |
| **T15** | Production Deployment | ⏸️ PENDING | Target: Multi-stage Dockerfile, CSP, backup restore drills |
| **T16** | Final Verification | ⏸️ PENDING | Target: make verify, end-to-end smoke test |
