# MediLens AI — Understand Your Health, Clearly

> **A secure, patient-friendly health education platform.** MediLens AI translates complex medical reports, prescriptions, and health photos into simple, understandable English or Hindi. It provides medicine reminders, tracks adherence, and offers grounded self-care guidance without ever diagnosing or altering a doctor's care plan.

---

## 1. Core Clinical Philosophy & Non-Negotiables

- **Never Diagnose:** MediLens AI strictly provides educational information and awareness. It never issues diagnostic verdicts or prognosis.
- **Never Alter Treatment:** The system never changes dosages, prescribes medicines, or overrides doctor instructions.
- **Printed Reference Ranges First:** Finding statuses (`normal`, `high`, `low`) are calculated strictly against printed ranges on the patient's lab report. If missing, status is marked `unknown`.
- **Citations Required:** Explanations cite trusted medical institutions: **MedlinePlus**, **World Health Organization (WHO)**, and **National Institutes of Health (NIH)**.
- **Emergency First:** Critical symptoms prompt pre-AI triage to direct users to national emergency lines (**112** unified / **108** ambulance in India).

---

## 2. Monorepo Architecture

```
medilens-ai/
├── frontend/                 # React 19 + TypeScript + Tailwind CSS v4 PWA
│   ├── src/                  # App components, typed API client, state
│   ├── public/               # Static assets & web manifest
│   ├── Dockerfile            # Production multi-stage Nginx container
│   ├── package.json          # Vite 6 + React 19 dependencies
│   └── tsconfig.json         # Strict TypeScript configuration
├── backend/                  # FastAPI 0.115 + Python 3.12 Backend API
│   ├── app/                  # Routers, schemas, security, database models
│   ├── tests/                # Pytest suite (unit & integration tests)
│   ├── scripts/              # Knowledge ingestion & administration tools
│   ├── requirements.txt      # Core runtime dependencies
│   └── requirements-dev.txt  # Test & linter dependencies
├── docs/                     # Documentation & Specifications
│   ├── MASTER_PROMPT.md      # Master project requirements & stage roadmap
│   ├── API_CONTRACT.md       # Shared API specification & data schemas
│   └── design/               # UI design screenshots & reference mockups
├── infra/                    # Infrastructure & Deployment Configs
│   └── nginx.conf            # Reverse proxy, SSL, and rate limiting
├── .github/workflows/        # Automated CI/CD Pipelines
│   └── ci.yml                # Backend & Frontend test, lint, and security checks
├── docker-compose.yml        # Development environment stack
├── docker-compose.prod.yml   # Production hardened stack
├── Makefile                  # Developer CLI commands
└── README.md                 # Project documentation
```

---

## 3. Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, TypeScript (strict), Vite 6, Tailwind CSS v4, Lucide Icons, Canvas Confetti |
| **Backend** | Python 3.12, FastAPI, Pydantic v2, Motor / PyMongo (Async) |
| **Database & Cache**| MongoDB 7.0 (authenticated, internal network), Redis 7.2 |
| **Security** | Argon2id hashing, Single-Use JWT Refresh Rotation, MultiFernet at-rest PHI encryption |
| **Document Processing**| PyMuPDF, pdfplumber, Tesseract OCR (`eng+hin`), OpenCV, Python-magic |
| **Testing & Quality**| Pytest, Pytest-Asyncio, Ruff, MyPy, Vitest |

---

## 4. Quick Start (Local Development)

### Prerequisites
- Docker & Docker Compose (v2.20+)
- Python 3.12+ (for local backend development)
- Node.js 22+ & npm (for local frontend development)

### 1. Clone & Setup Environment
```bash
cp .env.example .env
# Edit .env and supply your local or staging keys
```

### 2. Start Full Stack with Docker
```bash
make dev
```
- **Web App:** [http://localhost:3000](http://localhost:3000)
- **API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs) (enabled in development only)
- **API Health:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 5. Development Commands (`make`)

```bash
make help       # Show all available commands
make dev        # Run web, api, mongodb, and redis in Docker
make test       # Run backend pytest and frontend lint/tests
make lint       # Run Ruff, MyPy, and TypeScript checks
make seed       # Seed initial medical references (MedlinePlus/WHO/NIH)
make clean      # Clean Python/Node build caches
```

---

## 6. Shared API Contract

All backend routes and frontend clients strictly follow [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md).
- **Error format:** `{ "error": "<patient-friendly message>", "code": "MACHINE_CODE", "details": {...} }`
- **Authentication:** Bearer tokens with single-use refresh token rotation and family reuse revocation.
- **Dates & Times:** ISO 8601 with `Z` timezone; dose logs are localized and idempotent.

---

## 7. Security & Compliance
- **Zero PHI Logging:** Medical history, extracted text, prompts, and tokens are never written to server logs.
- **At-Rest Encryption:** Patient medical intake is encrypted using `MultiFernet` with key rotation support.
- **Database Isolation:** MongoDB runs with root authentication and is not exposed to the public internet.
