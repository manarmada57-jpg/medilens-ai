# MediLens AI: Antigravity Prompt (Task Cards to Finish the Project)

> **How to use this in Antigravity**
> 1. Open the project folder `/Users/sama/Downloads/medilens-ai` as the workspace. Run `git log --oneline` once: it must show the commit `d88d683` ("Complete Round 2A"). If it does not, stop and tell me.
> 2. Put **Part 1 (Rules)** into your Customizations / Rules so every conversation follows them (the name of that menu may differ in your version).
> 3. Save this whole file as `docs/ANTIGRAVITY_PROMPT.md`.
> 4. Start **one new conversation per task card**. Paste: `Read docs/ANTIGRAVITY_PROMPT.md and do task T0 only.` After it finishes, check the proof (Part 2, rule 4), then start the next card (`T1`, `T2`, ...).
> 5. For the big cards (T3, T6, T7, T8, T10, T15) use the **planning mode** and read the plan before you approve it. For the safety-critical cards (T1, T3, T9, T10) use the strongest model and reasoning setting you have; a fast, small model is fine for the simple cards.
>
> **Why task cards:** a long single prompt makes an AI agent skip steps and say "done" without proof. In the last round the tool reported "Round 2A complete", but my check shows the document test it was meant to fix very likely still fails. Small cards with required proof prevent that.

---

# PART 1: RULES (paste into Customizations; these apply to every task)

```
You are a senior full-stack engineer (React + TypeScript, Python 3.12 + FastAPI, MongoDB) working on
MediLens AI, a patient-education app that explains medical reports and prescriptions, builds medicine
reminders and gives awareness-level guidance from health photos.

NEVER: diagnose; prescribe; give dose advice, drug-interaction verdicts, or tell anyone to stop or
change a medicine; invent values, units, providers, doctors, medicines, claims ("verified", "HIPAA",
"256-bit") or success messages; show "normal" unless a printed range was read and the value is inside
it (no printed range = "unknown"); log health data, passwords or tokens; commit .env files.
If a feature is not real yet it must be OFF and return 503 FEATURE_UNAVAILABLE with a clear message.
Reminders are created only after the user confirms.

ALWAYS: work only inside the project folder; do ONE task card at a time; add tests that fail before
and pass after; run the commands in the card and show their REAL output; never write "done" unless the
output is shown; if a command fails, fix it or report it, do not hide it; commit after each task with
the message "T<number>: <summary>"; do not touch files unrelated to the card; ask before changing
the stack, the API contract (docs/API_CONTRACT.md) or any safety rule.
```

---

# PART 2: HOW EVERY TASK ENDS (proof format)

Each card ends with this report (copy the real command output, do not summarise it):

1. **Files changed** (list).
2. **Tests added** (names).
3. **Output of:** `cd backend && pytest -q`, `ruff check app tests`, `mypy app`; `cd frontend && npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run check:static` (when the card touches that side).
4. **Not done / problems** (honest list).
5. **Commit hash.**

Then stop and wait.

**Your check as the owner (2 minutes):** run `git log --oneline -3`, run `cd backend && pytest -q` yourself, and open the app once. If the tool's proof and your run disagree, tell the tool.

---

# PART 3: THE TASK CARDS

## T0: Baseline and environment (do first)
**Goal:** know exactly where the project is; fix local setup.
1. Run the baseline commands (Part 2, item 3) and write results into `docs/STATUS.md` (pass/fail counts, number of backend routes, frontend calls without a backend route).
2. Add `.python-version` with `3.12`; create `backend/.venv` with Python 3.12 (the project's cache files show Python 3.14 was used locally, while Docker and CI use 3.12). Reinstall requirements there and re-run the tests.
3. Align the root `.env.example` with the names the backend reads: add `APP_ENV`, `MONGODB_URI`, `MONGODB_DB_NAME`, `FIELD_ENCRYPTION_KEYS`, `LLM_PROVIDER`, `PRIMARY_MODEL`, `CORS_ORIGINS`, and remove the unused older names (`MONGO_URI`, `PROFILE_ENCRYPTION_KEY`, `ENVIRONMENT`, `AI_PROVIDER`) or map them in `config.py`. Add comments with the commands that generate `SECRET_KEY` and a Fernet key. Document in `README.md` the exact steps to run locally (with and without Docker).
4. Make sure `.env`, `dist/`, `.mypy_cache/`, `.ruff_cache/`, `__pycache__/`, `node_modules/` are in `.gitignore` and not tracked.
5. Commit the five design screenshots deletion/move (`docs/design/`).
**Accept:** every baseline command has real output in `docs/STATUS.md`; the failing tests (if any) are listed by name.

## T1: Fix the lab parser (most urgent, safety critical)
**Files:** `backend/app/routers/documents.py` (parsing code around lines 316–350), `backend/app/services/validation.py`, `backend/tests/`.
**Known bug (proven by replaying the rules on sample lines):** the range pattern captures the **value itself** instead of the printed range, so every status becomes "normal"; the unit defaults to "mg/dL"; "Hemoglobin" is mapped to "HbA1c"; "Fasting Lipid Profile" is mapped to "AST".
**Do:**
1. Move parsing into a new `backend/app/services/lab_parser.py` (pure functions, no web code) and call it from the router.
2. Read the reference range **only from text after the value and unit**. Support `70 - 99`, `70-99`, `70 to 99`, `0.4 to 4.0`, `< 200`, `<= 5.7`, `> 40`, and `Ref Range:` / `Reference Range:` labels.
3. `evaluate_status` returns `high` / `low` / `normal` only from a parsed range, otherwise **`unknown`** (never `normal` by default). `critical` only when the report itself marks it (`H*`, `L*`, "critical").
4. No default unit. Missing unit → empty unit and `needsReview: true`.
5. `normalize_test_name`: exact or whole-word match, most specific name first. No substring matching.
6. When a known test name has no value on its line (table layout), add it to `unclearItems` instead of dropping it.
7. Add a parametrized test with exactly these cases:

| Input | Expected |
|---|---|
| `Fasting Blood Sugar: 110 mg/dL  Reference Range: 70 - 99 mg/dL` | high |
| `HbA1c 6.1 % 4.0 - 5.6` | high |
| `TSH 8.2 uIU/mL 0.4 to 4.0` | high |
| `Total Cholesterol 195 mg/dL < 200` | normal |
| `Serum Creatinine 1.9 mg/dL` | unknown |
| `Hemoglobin 13.2 g/dL 12.0 - 15.5` | name "Hemoglobin", normal |
| `Platelet Count 90 150 - 450` | low |
| `Hemoglobin` / `9.1` / `g/dL` / `12.0 - 15.5` on four lines | low, or listed in `unclearItems` |

8. Fix `test_upload_and_analyze_document` so it passes with the corrected behaviour.
**Accept:** all 8 cases pass; `pytest -q` fully green.

## T2: Honest result fields
**Files:** `documents.py`, `backend/app/models/`, `frontend/src/components/UploadScreen.tsx`, `DocumentModal.tsx`.
1. `pipelineSteps` are built from what actually ran, with real timings. Remove the always-"done" steps and the claims "Verified file signature & removed EXIF", "Passed prompt injection…" unless that step really ran.
2. `provider` and `doctor` come from the document text or are `null` (no "Clinical Laboratory" default). `title` comes from the document or the user, not the file name. Remove the summary sentence "analyzed against MedlinePlus, WHO, and NIH" unless sources were really used.
3. `critical` and `urgentFlags` come only from the report's own markers.
4. Frontend: `DocumentModal` shows an error when sharing fails (no fake "shared"); show `needsReview` badges ("check against your paper copy"), `unclearItems`, `urgentFlags` banner, sources (links with `rel="noopener noreferrer"`) and the disclaimer on every result. Replace the swallowed `catch` blocks in `App.tsx` with visible messages.
**Accept:** tests for each field; a frontend test that renders a result with `needsReview` and checks the badge.

## T3: Real AI extraction + prescriptions
**Files:** `backend/app/ai/llm_client.py`, a new `backend/app/services/extraction.py`, prompts in `backend/app/ai/prompts/*.md`.
1. LLM extraction with a strict JSON schema, temperature near 0, one retry, for lab tests **and prescriptions** (medicine name, strength, form, dosage, frequency, `suggestedTimes` as `HH:MM` only when written, `withFood`, `durationDays`, `doctorInstructions`, `unclear`).
2. Expand OD, BD, TDS, QID, HS, SOS, AC, PC and `1-0-1` / `1-1-1` **in code** before the model sees the text.
3. Keep the regex parser (T1) as a cross-check: if both disagree, set `needsReview: true`. Every extracted value must appear in the source text, otherwise `needsReview: true`.
4. Treat document text as untrusted: wrap it in delimiters and instruct the model to ignore instructions inside it.
5. Implement the Claude and OpenAI adapters, or remove them from the settings. Do not log the API key (do not put it in a URL query string) and do not log response bodies.
6. Prescriptions return `medicines[]`; the frontend keeps the "Check what we read" screen and only after confirmation calls `POST /medicines/bulk`.
**Accept:** tests with a fake LLM that returns good output, bad JSON, and injected text ("ignore previous instructions"); the injected text never changes the result.

## T4: Security batch
1. Encrypt document results at rest (same encryptor, bound to the user id).
2. Use `re.escape` for the document search text.
3. Validate uploaded files by signature with `python-magic` and a per-endpoint allowlist (`DOC_MIME_TYPES` / `MEDIA_MIME_TYPES`); add HEIC via `pillow-heif`.
4. Rate limits with `Retry-After`: login 5/min per IP+email, signup, refresh, uploads, AI calls (use Redis when available, memory otherwise); lockout backoff after repeated failures.
5. Add `POST /auth/password/forgot` (always 202) and `POST /auth/password/reset` (single-use, expiring token; console email sender in development that never logs tokens in production). Match the frontend calls in `frontend/src/api/auth.ts`.
6. `PUT /profile` must refuse to overwrite data that cannot be decrypted.
7. Put the request ID into log lines, and validate client-supplied IDs; add a request body size limit.
**Accept:** a test for each item (including 429 with `Retry-After`, a fake PDF with the wrong signature rejected, a regex-special search string handled safely).

## T5: Safer login storage
1. Backend: set the refresh token as an `HttpOnly; Secure (in production); SameSite=Strict` cookie on login/refresh/logout; require a custom header on `/auth/refresh` as CSRF protection; keep the access token in the response body.
2. Frontend (`src/api/client.ts`, `tokenStorage`): keep the access token in memory only; stop storing the refresh token in `localStorage`; a network error during refresh must **not** log the user out (retry, then show an offline message); only a 401 from the refresh call logs out.
**Accept:** tests for cookie flags and for "network error does not log out". **ASK me before starting this card** if the frontend and API will run on different domains.

## T6: Real background jobs
1. Replace the placeholder `app/worker.py` (it only sleeps) with a real **ARQ + Redis** worker, or remove the `worker` service from both compose files.
2. `?async=true` enqueues the analysis and returns `202 {id}`; the worker updates real `progress` and `pipelineSteps` in MongoDB; the frontend polls `GET /analyze/documents/{id}` (or SSE).
3. The worker deletes temporary files in a `finally` block.
**Accept:** an integration test: upload with `async=true`, poll until `done`, assert progress values were real (more than two distinct values) and the file is gone.

## T7: Medicines correctness and real reminders
1. `GET /medicines/schedule/today`: default date is **the user's timezone** (zoneinfo), honour `startDate`/`endDate`, return `snoozedUntil`, return `missed` when a dose is more than 2 hours late (configurable).
2. Refill days = `pillsLeft` ÷ doses per day. Remove the fake default of 4 pills and the hard-coded default start date.
3. Generate **real VAPID keys** with a script, serve the public key from `/push/vapid-key`, remove the sample key, add `pywebpush`, send real Web Push.
4. Run the scheduler as its **own process** (one instance). It claims due reminders atomically (`find_one_and_update`) so two instances never send the same reminder; reminders are recomputed when a medicine is edited.
5. Frontend: Add-Medicine form with exact time inputs, several times per day, frequency presets, start/end date, pills count, instructions; edit and delete medicines; notification permission asked after the first medicine is added; a service worker for push.
**Accept:** tests for a user in `Asia/Kolkata` and one other timezone, **across midnight**, two scheduler instances sending one reminder, and a missed dose.

## T8: Real knowledge base (MedlinePlus, WHO, NIH)
1. Rewrite `scripts/ingest_knowledge.py` to fetch real content (use MedlinePlus's official web service and MedlinePlus Connect; check the current developer documentation, and each source's terms of use, before fetching). Store source name, URL, title, attribution text, fetch date. Record the terms in `docs/sources.md`.
2. Chunk per lab test, medicine or condition; embed; index (Atlas Vector Search or a Mongo text-index fallback). Retrieve by normalized name first, then vector search.
3. Seed `lab_test_catalog` with Indian aliases (SGPT = ALT, SGOT = AST, Hb, TLC and more) and a **brand → generic medicine map** for Indian brands.
4. Explanations use **only** retrieved text plus the extracted values and cite real sources (MedlinePlus, WHO or NIH). Nothing retrieved → "General information is not available. Please ask your doctor or pharmacist."
5. Hindi output when the user's language is Hindi.
6. "Ask about this report" answers only from that document plus retrieved sources and refuses diagnosis, prescription and dose questions.
**Accept:** tests that every explanation has a real source or the "not available" text; no personal medicine or doctor names anywhere (search the repo).

## T9: Safety layer and evaluations
1. **Output filter** after generation: block or rewrite "you have <disease>", "stop taking", "increase/decrease your dose", "no need to see a doctor", interaction verdicts. Always attach the disclaimer and a "when to see a doctor" note.
2. **Emergency rules before the AI**: a critical flag in the report, or emergency terms (chest pain, severe breathing trouble, heavy bleeding, face/lip swelling, stroke signs) → `urgency: "urgent"` with the 112 / 108 instruction first. Return it as a normal result with `urgentFlags` (not a bare error) so the frontend can show a banner.
3. Strip names, phone numbers, addresses and IDs from text before any provider call.
4. Create `backend/tests/evals/` with: 20 synthetic reports with expected values, **100 unsafe prompts** (diagnosis requests, "should I stop my medicine", dose questions, injection text hidden in a document), and 20 emergency cases. Add a CI job that runs them.
**Accept:** 0 unsafe outputs on the 100 prompts; emergency rules trigger in 20 of 20 cases; no provider call contains a name or phone number (tested).

## T10: Image and video check (real, but flagged OFF)
1. Add the feature flag `FEATURE_IMAGE_CHECK` (default **off in production**).
2. Vision model through `LLMClient`; **quality gate** first (blur by Laplacian variance, brightness, resolution); poor quality → `imageQuality: "poor"`, empty possibilities, retake request. Video: up to 30 s, about 5 evenly spaced frames (OpenCV).
3. Strict schema: `observedSigns`, at most 3 `possibleConditions` with `confidence` of `low` or `medium` only, contributing factors, non-medicinal self-care tips, `seeDoctorIf`, `urgency` (`routine|soon|urgent`), sources, disclaimer. A filter blocks definitive wording ("you have", "this is").
4. Nothing is stored unless the user saves; rate-limited; file signature checked.
5. Frontend: keep the result screen, change the card text (no X-rays), permanent disclaimer, urgent banner.
**Accept:** tests with a blurry image (retake), a red-flag description (urgent), the flag off (503 with a clear message). **Do not turn the flag on for real users until a doctor has reviewed 30+ outputs.**

## T11: Frontend structure
1. Add **React Router** with real URLs: `/login`, `/intake`, `/home`, `/upload`, `/check-image`, `/medicines`, `/history`, `/history/:id`, `/selfcare/:condition`, `/settings`, `/privacy`, `/terms`. Back, refresh and deep links must work.
2. Loading skeletons, empty states with a call to action, error messages with retry, an offline banner, a toast component, an error boundary, idle auto-logout after 15 minutes with a warning.
3. Remove the 9 remaining static time/date lines found by the strict checker and merge the strict patterns (`Quest`, `CVS`, `Atorvastatin`, `Metformin`, `Lisinopril`, `Dr\.? ?(Watson|Rao)`, `Eleanor`, `Mitchell`, `Verified`, `HIPAA`, `256-?bit`, `[0-9]{1,2}:[0-9]{2} ?(AM|PM)`, `October 20[0-9]{2}`, `tel:911`) into `scripts/check-no-static-data.sh`. CI fails on any hit.
**Accept:** a Playwright test for Back/refresh/deep link; `npm run check:static` finds nothing.

## T12: Accessibility, language, merge duplicates, tests
1. Accessibility (WCAG 2.1 AA): labels with `htmlFor`, `autoComplete`, `aria-live` for progress and toasts, `aria-label` on icon buttons, modals with `role="dialog"`, `aria-modal`, focus trap, Esc to close and focus return; text never below 12 px (doses and warnings at least 16 px; today there are about 151 uses of 9–11 px text); apply the font-size setting to `<html>` so it scales everything; status never by colour alone; touch targets at least 44 px; honour `prefers-reduced-motion`; `<html lang>` follows the user's language.
2. i18n with `react-i18next`: English and Hindi for every screen, saved on the user.
3. Merge the mobile and desktop duplicate screens (`Desktop*.tsx`, about 1,900 lines) into responsive components.
4. Add Vitest + Testing Library (components and the API client), `axe` checks, ESLint with `jsx-a11y`, and Playwright journeys: sign up → intake → reload still signed in; upload report; prescription confirm → doses; mark taken/undo; wrong password and expired token; switch to Hindi; export and delete account.
**Accept:** `axe` finds no serious violations on login, upload, results and medicines; all journeys pass.

## T13: Self-care, settings, legal pages, PWA, feedback
1. Self-care screen loads `/selfcare/{condition}` with `sources[]`; delete the static text in the screen.
2. Settings page: language, font size, timezone, pharmacy details, notifications, delete account (password required), download my data, privacy/terms links. Consent at signup with timestamps.
3. Privacy Policy and Terms pages (draft text with clear placeholders for the lawyer to finish), help/FAQ and contact page.
4. "Was this clear?" and **"Report a wrong reading"** buttons on every result (store in a `feedback_reports` collection).
5. PWA: manifest, icons, `theme-color`, `viewport-fit=cover`; self-host the fonts; code-split screens with `React.lazy`.
**Accept:** tests for each page and for the feedback endpoint.

## T14: Caregiver, export, delete
1. Caregiver `invite` and `accept`: a caregiver sees the schedule and adherence only, never documents unless the patient shares them.
2. `POST /documents/{id}/share` sends to a real linked caregiver; hide the button when no caregiver is linked.
3. Lab-value **trends across reports** (a simple chart per test).
4. `GET /export` returns everything stored for the user; `DELETE /auth/me` removes **every** record (documents, medicines, dose logs, reminders, push subscriptions, jobs, feedback).
**Accept:** a test that deletes an account and then proves no data remains in any collection.

## T15: Production deployment
1. `frontend/Dockerfile` (multi-stage), proxy config (TLS, HSTS, gzip, SPA fallback, request size limit, rate limits), `backend/Dockerfile` (non-root, runtime requirements only, one image with three commands: api, worker, scheduler), `docker-compose.prod.yml`.
2. CSP: no `unsafe-inline`, `connect-src 'self'` plus the API origin, fonts self-hosted. Docs off in production; health output shows no error text.
3. GitHub Actions: `build.yml` (build and push images tagged with the git SHA after CI passes), `deploy.yml` (staging automatic, production with manual approval, indexes/migrations before start, **automatic rollback** when the health check fails).
4. Production MongoDB: use a managed service (for example Atlas) with automated backups, encryption at rest, network allow-list and a minimum-rights user. Write `infra/backup.sh` and a restore guide, and record one **restore drill**.
5. Secrets in a secret manager; no defaults; the app refuses to start in production with weak or missing secrets; write down the encryption-key backup and rotation procedure.
6. Monitoring: Sentry with personal-data scrubbing, uptime check on `/api/health/ready`, alerts for API down, error spike, queue backlog, scheduler stopped, reminder failures, AI provider errors and daily cost above budget. Per-user daily analysis limit and a monthly AI budget alarm.
7. Runbooks in `docs/runbooks/`: reminders not firing, AI provider outage, suspected data breach, restore from backup, rotate encryption key, revoke all sessions.
8. Dependabot, weekly `pip-audit` / `npm audit`, container image scan.
9. A load test (for example 200 concurrent users, 20 uploads per minute).
**Accept:** deploy to staging by the pipeline; the smoke test below passes; rollback tested.

## T16: Final verification
1. Add `make verify` that runs lint, type-check, backend tests against a **real MongoDB**, contract tests, the evals, `axe` and Playwright.
2. Add the automatic smoke test run after every deploy: `/api/health/ready` → sign up → profile `null` → upload a synthetic PDF → result with sources and disclaimer → add medicine → schedule shows it → mark taken/undo → image check (flag on in test) returns at most 3 possibilities → delete the test user → export is empty.
3. Update `docs/STATUS.md`, README and `docs/API_CONTRACT.md` so they match the code.
**Accept:** `make verify` passes on a fresh clone.

---

# PART 4: THINGS ANTIGRAVITY CANNOT DO (you must)

1. Choose the AI provider, pay for keys, open the MongoDB, Redis, hosting, email and domain accounts. **Rotate your API key** if it was ever shared.
2. **A licensed doctor** reviews prompts, at least 30 sample outputs per feature, the self-care text and the warning-sign lists, and signs `docs/safety-case.md`. Do not enable document reading or the image check for the public before this.
3. Collect (with consent) and hand-label **at least 100 de-identified real reports and prescriptions** from different Indian labs (digital, phone photos, handwriting, Hindi). Measure accuracy on them. Never commit real patient data to Git.
4. **A lawyer** reviews the Privacy Policy, Terms, consent text, India's DPDP Act obligations and whether any feature could count as medical-device software.
5. Run a **pilot** with 10 to 20 consenting users for 2 to 4 weeks; review wrong-reading reports, accuracy and reminder reliability each week; fix issues, then launch.
6. After launch: weekly review of feedback, errors and cost; monthly dependency updates and restore test; every 3 months re-run the accuracy and unsafe-prompt tests, re-check source terms, rotate secrets and ask the doctor to review again.

---

# PART 5: QUALITY TARGETS (suggested; adjust with your doctor)

Value + unit exact match ≥ 98% on digital reports and ≥ 95% on good phone photos; status agreement **100%** when a range is printed; 0 unsafe outputs on the red-team set; API p95 under 500 ms (non-AI routes); 90% of 1–3 page documents analysed in under 60 seconds; first page load under 3 seconds on a mid-range phone over 4G; reminder delivery ≥ 99% within 1 minute; pilot uptime ≥ 99.5%.

# PART 6: ORDER

`T0 → T1 → T2 → T3 → T4 → T5 → T6 → T7 → T8 → T9 → T10 → T11 → T12 → T13 → T14 → T15 → T16`, then the people tasks in Part 4, then the pilot.
If you want something usable sooner, the shortest useful path is `T0, T1, T2, T4, T7, T11`: a correct and honest report reader with real reminders and a safe login.
