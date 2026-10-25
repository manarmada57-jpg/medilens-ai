# MediLens AI: Complete Build-to-Launch Master Prompt

## 1. Product Mission & Non-Negotiables
**MediLens AI – Understand Your Health, Clearly** is a patient-education platform that explains medical reports and prescriptions in simple English or Hindi, builds medicine reminders, and gives awareness-level guidance from health photos or short videos.

- **Never diagnose, never prescribe, never change or suggest changing a doctor's dose, never replace a doctor.** If any task conflicts with this, this rule wins.
- No fake data, fake results, fake confirmations or untrue claims anywhere in the UI or API.
- No health content, extracted text, prompts, passwords or tokens in logs, URLs, error trackers or analytics.
- High/low status comes from code comparing the value with the **printed** reference range; if no range is printed, status is `unknown`.
- Reminders are created only after the user confirms.

---

## 2. Product Decisions (Defaults Confirmed)
| Decision | Value | Notes |
|---|---|---|
| AI provider | Provider-independent adapter | Gemini adapter first, Claude/OpenAI pluggable |
| Hosting | Option B (Managed container host + MongoDB Atlas) | Pilot and early users, isolated networking |
| Clinician reviewer | "To be found" | Block public launch until licensed clinician signs off |
| Adults only | Yes (18+) | Pediatric use under adult caregiver supervision |
| Languages | English + Hindi | UI and clinical explanations |
| Domain name | Placeholder `medilens.example` | Production target |

---

## 3. Architecture & Monorepo
```
medilens-ai/
  frontend/               React app (PWA)
  backend/                FastAPI app, worker, scheduler, scripts, tests
  docs/                   MASTER_PROMPT.md, API_CONTRACT.md, threat-model.md, safety-case.md,
                          sources.md, runbooks/, adr/, design/
  infra/                  caddy/nginx config, deploy scripts, backup scripts
  .github/workflows/      ci.yml, build.yml, deploy.yml, security.yml
  docker-compose.yml      dev stack: web, api, worker, scheduler, mongo (auth on), redis
  docker-compose.prod.yml production stack
  .env.example            documented template (no real values)
  Makefile                make dev | test | lint | e2e | verify | seed | backup
  .gitignore .dockerignore .editorconfig README.md
```

---

## 4. Stage Progression & Gates
- **Stage 0: Repository hygiene.** Monorepo structure, clean caches, `.dockerignore`, `.editorconfig`, `Makefile`, CI workflow, rewritten READMEs. *(Gate: fresh clone → `make dev` works, CI green)*.
- **Stage 1: Fix the backend foundation.** Close B1–B18 with tests. Account endpoints, user preferences, audit logging, rate limits. *(Gate: concurrent signup gives 201 and 409; parallel refresh gives one success; reused token revokes family; no passwords/health in logs; production fails on weak keys)*.
- **Stage 2: First real end-to-end path.** Sign up, login, intake, dashboard, logout against real API with generated client. *(Gate: new user signs up, completes intake, reloads, and is still signed in with same data)*.
- **Stage 3: Medicines and reminders.** Exact times, dates, pill counts, schedule, idempotent dose logs, refill alerts, Web Push. *(Gate: reminders fire at right local time across midnight without duplicates)*.
- **Stage 4: Document pipeline.** Worker pipeline: PDF text, OCR (`eng+hin`), clarity check, strict schema extraction, printed range validation, safety check. *(Gate: accuracy targets met on test set; unreadable photos return retake request)*.
- **Stage 5: Knowledge and explanations.** MedlinePlus, WHO, NIH ingestion; Indian lab aliases; Indian brand-to-generic mapping; Hindi output. *(Gate: every explanation cites sources; attribution recorded)*.
- **Stage 6: Safety layer.** Output rule filter, pre-AI emergency triage, prompt injection defense, PHI minimization, red-team evaluations. *(Gate: 0 unsafe outputs on red-team set; clinician sign-off)*.
- **Stage 7: Image and video check.** Quality gate, 5 video frames, max 3 low/medium confidence conditions, urgency, no storage. *(Gate: poor images return retake; no output states a diagnosis)*.
- **Stage 8: Self-care, caregiver, export, settings.** Curated self-care, limited caregiver access, document sharing, trends, export, account deletion. *(Gate: caregiver sees only allowed data; export complete)*.
- **Stage 9: Production deployment and hardening.** Staging and production, Atlas backups, TLS, security headers, rate limits, runbooks.
- **Stage 10: Pilot, then launch.** 10–20 consenting users for 2–4 weeks.
