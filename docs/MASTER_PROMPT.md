# MediLens AI — Master Build Specification & Roadmap

## 1. Product Mission & Non-Negotiables
**MediLens AI – Understand Your Health, Clearly** is a patient-education platform that explains medical reports and prescriptions in simple English or Hindi, builds medicine reminders, and gives awareness-level guidance from health photos or short videos.

**Core Non-Negotiable Safety Rules:**
- The system **never diagnoses**, **never prescribes**, **never changes a doctor's dose**, and **never replaces a doctor**.
- If any task conflicts with this, this rule wins.
- Safety, privacy, and honesty are requirements, not extras.
- The app must never show fake data, fake results, or claims that are not true.
- High/low status always comes from code comparing the value to the **printed range**; if no range is printed, status is `unknown`.
- A value that is not found in the source text is never shown as verified.
- Reminders are created only after the user confirms.
- Emergency signs are handled by fixed rules before any AI text is generated.
- No health content, password, token, or prompt in logs, URLs, error trackers, or analytics.
- Every AI explanation carries sources (MedlinePlus, WHO, NIH) or the "not available" message, plus the disclaimer.

---

## 2. Monorepo Structure
```
medilens-ai/
  frontend/                 # React 19 + TypeScript + Tailwind
  backend/                  # FastAPI app + worker + scheduler
  docs/                     # MASTER_PROMPT.md, API_CONTRACT.md, ADRs, runbooks, threat model
  infra/                    # nginx/caddy config, deploy scripts
  .github/workflows/        # ci.yml, deploy.yml
  docker-compose.yml        # dev stack: web, api, worker, mongo (auth on), redis
  docker-compose.prod.yml
  .env.example              # documented template at root
  .gitignore  .editorconfig  Makefile   # make dev | test | lint | seed
  README.md                 # real, current instructions
```

---

## 3. Technology Stack
- **Frontend:** React 19, TypeScript (strict), Vite 6, Tailwind CSS v4, Lucide Icons, Canvas Confetti.
- **Backend:** Python 3.12, FastAPI, Pydantic v2, MongoDB (authenticated, async motor/pymongo), Argon2id, PyJWT with rotation.
- **Worker / Background:** Redis + worker (ARQ / Celery) for OCR, validation, RAG, and scheduled dose alerts.
- **Documents & Vision:** PyMuPDF, pdfplumber, Tesseract OCR (`eng+hin`), OpenCV.
- **Clinical Knowledge:** MedlinePlus, World Health Organization (WHO), National Institutes of Health (NIH).
