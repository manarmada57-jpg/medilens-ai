# MediLens AI: The Prompt That Completes Everything
path of floder is /Users/sama/Downloads/medilens-ai
> **How to use:** save this file as `docs/COMPLETE_PROMPT.md` in your repository and tell your AI coding tool: **"Read docs/COMPLETE_PROMPT.md and do Step R and Stage A only."** After each report, check the results yourself, then say **"next stage"**. Do not let the tool run several stages in one go.
>
> **Honest note:** no prompt can guarantee a project with zero bugs. This one defines "finished" as **tests and gates that must pass**, and it lists the few things only people can do (doctor review, legal review, real test reports, the pilot). When every gate in Part 9 is green and the human tasks in Part 10 are done, the project is a real, deployable product. After launch you still maintain it.
>
> **Built from my reviews of your code.** I could not run your app, so items marked **(verify)** are likely problems to confirm by running.

---

# PART 1: ROLE AND RULES THAT NEVER CHANGE

Act as a senior full-stack engineer (React + TypeScript, Python + FastAPI, MongoDB) with security and healthcare-product experience. You are finishing **MediLens AI – Understand Your Health, Clearly**: a patient-education app that explains medical reports and prescriptions in simple English or Hindi, builds medicine reminders, and gives awareness-level guidance from health photos or short videos.

1. **Never diagnose, prescribe, give dose advice or drug-interaction verdicts, or tell anyone to stop or change a medicine.** If a task conflicts with this, this rule wins.
2. **Never invent anything.** No made-up values, units, providers, doctors, medicines, pipeline steps, claims ("verified", "HIPAA", "256-bit"), or "success" messages. If something is not real yet, the feature must be **switched off** (HTTP 503 `FEATURE_UNAVAILABLE` + a clear message in the UI), never faked.
3. **Status (high / low / normal) comes from code comparing a value with the range printed on the report.** No printed range, or a range you cannot parse → `unknown`. Never default to `normal`.
4. **Any extracted value must appear in the source text**, otherwise set `needsReview: true`.
5. **Reminders are created only after the user confirms** what was read.
6. **No health content, extracted text, prompts, passwords or tokens** in logs, URLs, error trackers or analytics.
7. **Emergency signs** are handled by fixed rules before any AI text, with a visible urgent banner and the India numbers (112, ambulance 108) from `/meta/emergency`.

## Working method

- **One stage at a time.** After each stage run `ruff`, `mypy`, `pytest`, `eslint`, `tsc`, `vitest`, `npm run build`, `npm run check:static` and report: files changed, tests added (names), command output, anything skipped and why. Then stop and wait for "next stage".
- Every fix gets a test that **fails before and passes after**.
- Ask before: changing the stack or the API contract, changing a safety rule, or any step that costs money.
- Keep routes thin; logic in typed services; prompts in versioned files; secrets only in environment variables.
- Risky features get a **feature flag, default OFF in production** (`FEATURE_DOC_ANALYSIS`, `FEATURE_IMAGE_CHECK`, `FEATURE_PUSH`) until their gate passes.
- Keep `docs/STATUS.md` updated at the end of every stage: done, remaining, known issues, gate results.

## Fixed technology

Frontend: React 19, TypeScript strict, Vite, Tailwind v4, React Router, TanStack Query, `openapi-typescript` + `openapi-fetch`, `react-i18next`, Vitest + Testing Library, Playwright, ESLint with `jsx-a11y`. Backend: **Python 3.12 only** (add `.python-version`), FastAPI, Pydantic v2, MongoDB (PyMongo's native async client if you confirm Motor is deprecated; verify in current MongoDB docs), JWT + rotating refresh tokens, Argon2, ARQ + Redis for jobs. Documents/AI: PyMuPDF, pdfplumber, Tesseract (`eng+hin`), OpenCV, provider-independent `LLMClient` (Gemini, Claude, OpenAI adapters all implemented). Ops: Docker, GitHub Actions, Caddy or Nginx, Sentry with personal-data scrubbing.

---

# PART 2: STEP R: RECONCILE FIRST (before any new work)

I have seen two different snapshots of this project, and the newer one (commit `d88d683`, "Complete Round 2A") was lost in a later upload. Do this first:

1. Run `git log --oneline`. If `d88d683` or a commit named "Round 2A" is **missing**, check other copies of the project (`~/antigravity/...` and `~/Downloads/...`), find the one that has it, and continue from there. Never merge blindly; compare with `diff -rq`.
2. Confirm **one** working folder and one Python version (3.12). Create a clean virtual environment, install, and record the **baseline**: `pytest` result, `ruff`, `mypy`, `tsc`, `npm run build`, `npm run check:static` (also run the stricter version, see Stage A item 11), number of backend routes, number of frontend API calls that have no backend route.
3. Write the baseline into `docs/STATUS.md`. Fix nothing else yet.
4. Make sure `.env` files, `dist/`, caches (`.mypy_cache`, `.ruff_cache`, `__pycache__`) and `node_modules` are not committed or zipped. If an API key was ever shared, **rotate it**.

---

# PART 3: STAGE A: STOP THE FAKE OUTPUT (apply if not already present)

Verify each item in the code; apply only what is missing.

1. `documents.py`: no hard-coded values or fallbacks (the glucose 110, cholesterol 195, "Within Range", "Verified Diagnostic Laboratory", canned doctor questions). Unreadable file → 422 `UNREADABLE_DOCUMENT` ("Please upload a clearer photo or PDF"), store nothing.
2. Scanned PDFs: render pages to images (PyMuPDF, 200–300 DPI) and OCR them.
3. No AI provider key → 503 `FEATURE_UNAVAILABLE`; `/config` `aiAvailable` reflects the real state (remove any `or True`).
4. `skin.py`: until Stage G, return 503 `FEATURE_UNAVAILABLE` ("Image check is not available yet") and show that in the UI. Remove canned conditions.
5. `rag.py`, `scripts/ingest_knowledge.py`, `selfcare.py`, frontend self-care text: remove personal names and medicines (Dr. Watson, Metformin, Lisinopril, Atorvastatin), "Take <drug>", grapefruit, "verified" labels. Mark general self-care text "pending doctor review".
6. Auth models accept camelCase and snake_case (`alias_generator=to_camel`, `populate_by_name=True`); return camelCase; store the `timezone` and `language` sent at signup; the auth `user` includes `timezone`, `language`, `fontSize`. Add a contract test that posts exactly `{name,email,password,timezone,language,acceptTerms}`.
7. Update tests that locked in fake behaviour. Run `pytest` and make it pass.
8. Compose: no API keys passed to the Mongo container; if there is no real worker yet, remove the worker service from both compose files (it comes back in Stage C).
9. Frontend: no timer-based fake progress, no `alert()`, no swallowed errors (show them); `DocumentModal` shows an **error** when sharing fails.
10. Restore `package-lock.json`; use `npm ci` in CI and the Dockerfile; `vite` in devDependencies; `openapi-typescript` installed; delete unused `mockData.ts`.
11. Merge these patterns into `scripts/check-no-static-data.sh` and fix every hit (CI fails on any hit): `Quest`, `CVS`, `Atorvastatin`, `Metformin`, `Lisinopril`, `Dr\.? ?(Watson|Rao)`, `Eleanor`, `Mitchell`, `Verified`, `HIPAA`, `256-?bit`, `[0-9]{1,2}:[0-9]{2} ?(AM|PM)`, `October 20[0-9]{2}`, `Take (Metformin|Lisinopril)`, `tel:911`.
12. CI: environment variable names match `config.py`, Gitleaks fails the build, `pip-audit` and `npm audit` run, and a job runs tests against a **real MongoDB** service.

**Gate A:** `pytest` (including the real-Mongo job), `ruff`, `mypy`, `tsc`, build and `check:static` all pass; no fabricated value exists anywhere (search for the strings above).
