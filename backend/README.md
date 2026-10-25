# MediLens AI — Backend

> **Understand Your Health, Clearly**  
> A secure, patient-friendly health education platform built with Python 3.12, FastAPI, and MongoDB.

---

## ⚠️ Core Medical & Safety Philosophy
- **Never diagnose, prescribe, change medication doses, or override a physician.**
- Prioritize printed reference ranges on patient reports.
- Ground all explanations in trusted sources (**MedlinePlus**, **WHO**, **NIH**) with verifiable citations.
- Never log medical report text, AI prompts, or patient protected health information (PHI).
- Reject prompt-injection attempts and immediately flag life-threatening emergency signs.

---

## 📁 Project Architecture & Structure

```
backend/
├── Dockerfile                  # Multi-stage hardened Python 3.12 image (non-root runner)
├── docker-compose.yml          # Container stack (FastAPI app + authenticated MongoDB 7)
├── pyproject.toml              # Project metadata, Ruff & mypy strict typing configuration
├── requirements.txt            # Runtime dependencies
├── requirements-dev.txt        # Development, testing, & linting dependencies
├── .env.example                # Documented configuration template
├── .dockerignore               # Hardened image build exclusions
├── .gitignore                  # Repository exclusion rules
├── README.md                   # System documentation
│
├── app/
│   ├── main.py                 # FastAPI application factory, security headers & lifespan hooks
│   ├── scheduler.py            # APScheduler background medication & refill monitor
│   ├── core/
│   │   ├── config.py           # Pydantic v2 Settings with production secret guards
│   │   ├── deps.py             # Auth dependencies & Bearer JWT validation
│   │   ├── errors.py           # Standardized flat error envelopes & exception hierarchy
│   │   ├── logging.py          # Structured logging with sensitive data & JWT scrubbers
│   │   └── security.py         # Argon2id, rotating refresh tokens & MultiFernet encryption
│   ├── db/
│   │   ├── mongo.py            # Motor async connection manager (tz-aware UTC) & probes
│   │   └── indexes.py          # Schema-wide index definitions & TTL retention rules
│   ├── models/
│   │   ├── health.py           # Diagnostic & system health Pydantic schemas
│   │   ├── user.py             # User signup, login, tokens, preferences schemas
│   │   ├── profile.py          # Patient profile & encrypted medical history schemas
│   │   ├── medicine.py         # Medication schedules, dose logs, & refill schemas
│   │   └── document.py         # Health document, OCR findings, skin screening schemas
│   ├── routers/
│   │   ├── health.py           # /api/health (liveness) & /api/health/ready (readiness)
│   │   ├── auth.py             # /api/auth (signup, login, refresh, logout, me, password)
│   │   ├── profile.py          # /api/profile (medical history & display profile)
│   │   ├── medicines.py        # /api/medicines (CRUD, dose logging, snooze, refill alerts)
│   │   ├── documents.py        # /api/documents & /api/analyze/document (OCR & analysis)
│   │   ├── skin.py             # /api/analyze/skin (ABCDE educational screening)
│   │   └── selfcare.py         # /api/selfcare (evidence-based guides, export, delete)
│   ├── services/
│   │   ├── pdf.py              # PyMuPDF text & page extraction
│   │   ├── ocr.py              # Tesseract OCR engine with preprocessing
│   │   ├── rag.py              # Grounded knowledge retrieval & reference citation
│   │   ├── safety.py           # Prompt-injection defense & emergency warning scanner
│   │   └── validation.py       # Printed reference range & unit validation
│   └── ai/
│       ├── llm_client.py       # Provider-independent LLM client (Gemini, Claude, OpenAI)
│       └── prompts/            # Grounded educational explanation prompts
│
├── scripts/
│   ├── create_indexes.py       # Standalone index creation CLI
│   └── ingest_knowledge.py     # MedlinePlus, WHO, NIH knowledge ingest script
│
└── tests/
    ├── conftest.py             # Async fixtures, mock MongoDB, test client
    ├── unit/
    │   ├── test_config.py      # Configuration validation & production guard tests
    │   └── test_security.py    # Argon2id, JWT claims, family rotation, MultiFernet tests
    └── api/
        ├── test_health.py      # Liveness, readiness, & flat error envelope tests
        ├── test_auth.py        # Signup, login, refresh rotation, logout, me tests
        ├── test_profile.py     # Medical history encryption-at-rest & alias tests
        ├── test_medicines.py   # Medicine CRUD, dose logging, snooze, refill alerts
        ├── test_documents.py   # Document upload, OCR findings, safety, emergency rules
        └── test_skin_and_selfcare.py # Skin screening awareness, self-care, data export
```

---

## 🔒 Security & Privacy Highlights

1. **Argon2id Password Hashing:** Constant-time verification prevents account enumeration timing attacks.
2. **Rotating Refresh Tokens:** Atomic rotation with token family tracking; detects token reuse and invalidates all active sessions in the family.
3. **Field-Level Encryption (MultiFernet):** Sensitive patient medical history is encrypted before database write using authenticated AES-128-CBC + HMAC-SHA256 with user-ID binding. Supports seamless zero-downtime key rotation.
4. **Timezone-Aware Operations:** All database timestamps and scheduler operations are timezone-aware (UTC), supporting patient-local medication schedules.
5. **No PHI in Logs:** Structured logging scrubs JWT tokens, medical text, and validation input values.
6. **Production Safeguards:** Application startup fails immediately if secrets are weak, missing, or default placeholders when `APP_ENV=production`.
7. **Strict Error Envelope:** Consistent flat error responses (`{"error": "...", "code": "..."}`) compatible with frontend error handlers.

---

## 🚀 Quickstart & Setup

### Option 1: Docker Compose (Recommended)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```
3. Generate secure secrets in `.env`:
   ```bash
   # Generate SECRET_KEY:
   openssl rand -hex 32

   # Generate FIELD_ENCRYPTION_KEYS:
   python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

   # Generate MONGO_ROOT_PASSWORD:
   openssl rand -hex 24
   ```
4. Start the stack:
   ```bash
   docker compose up --build
   ```
5. Endpoints:
   - **Swagger Docs:** `http://localhost:8000/docs` (disabled in production)
   - **Liveness:** `http://localhost:8000/api/health`
   - **Readiness:** `http://localhost:8000/api/health/ready`

---

### Option 2: Local Python Environment

1. Create a Python 3.12 virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```
2. Install runtime and development dependencies:
   ```bash
   pip install -r requirements-dev.txt
   ```
3. Copy and configure `.env`:
   ```bash
   cp .env.example .env
   ```
4. Run tests, linter, and type checks:
   ```bash
   pytest -v
   ruff check .
   mypy app
   ```
5. Start development server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

---

## 📡 API Reference Overview

### Authentication (`/api/auth`)
| Method | Path | Summary | Contract |
|---|---|---|---|
| `POST` | `/api/auth/signup` | Register new user | Returns `{token, access_token, refresh_token, token_type, expires_in, user: {id, name, email}}` |
| `POST` | `/api/auth/login` | Log in | Returns token pair + user object |
| `POST` | `/api/auth/refresh` | Rotate refresh token | Issues new token pair, revokes used token |
| `POST` | `/api/auth/logout` | Revoke session | Accepts `{refresh_token}`, revokes family |
| `POST` | `/api/auth/logout-all` | Revoke all sessions | Requires auth, invalidates all sessions |
| `GET` | `/api/auth/me` | Current user details | Returns id, name, email, timezone, language, font_size |
| `PATCH` | `/api/auth/me` | Update preferences | Updates name, timezone, language, font_size |
| `DELETE` | `/api/auth/me` | Delete account | Requires password; cascades delete across all data |
| `POST` | `/api/auth/password/change` | Change password | Requires old password; revokes all sessions |

### Profile & Medical History (`/api/profile`)
| Method | Path | Summary | Contract |
|---|---|---|---|
| `GET` | `/api/profile` | Get medical history | Returns `{"profile": <MedicalHistory or null>}` |
| `PUT` | `/api/profile` | Save medical history | Encrypts at field level; returns `{"profile": <data>}` |
| `GET` | `/api/profile/me` | Get display profile | Name, caregiver status, dashboard document/med counts |
| `PUT` | `/api/profile/me` | Update display profile | Updates display name, caregiver name/linking |
| `GET` | `/api/profile/export` | Export patient data | Returns complete JSON archive of user data |

### Medicines & Reminders (`/api/medicines`)
| Method | Path | Summary |
|---|---|---|
| `GET` | `/api/medicines` | List patient active medications |
| `POST` | `/api/medicines` | Add medication |
| `DELETE` | `/api/medicines/{id}` | Deactivate medication |
| `POST` | `/api/medicines/{id}/take` | Log dose taken; decrements pills count |
| `POST` | `/api/medicines/{id}/snooze` | Snooze medication reminder |
| `GET` | `/api/medicines/refill-alerts` | Refill alerts (< 7 pills remaining) |
| `GET` | `/api/medicines/stats` | Adherence statistics & streak |

### Document Analysis (`/api/analyze` & `/api/documents`)
| Method | Path | Summary |
|---|---|---|
| `POST` | `/api/analyze/document` | Upload PDF/image, OCR, safety check, extract lab values |
| `GET` | `/api/documents` | List uploaded documents |
| `GET` | `/api/documents/{id}` | Document details and extracted findings |
| `GET` | `/api/documents/{id}/progress` | Real-time processing progress |
| `POST` | `/api/analyze/skin` | Educational ABCDE skin screening photo analysis |

### Health Probes (`/api/health`)
| Method | Path | Summary |
|---|---|---|
| `GET` | `/api/health` | Liveness probe (`{"ok": true, "status": "ok"}`) |
| `GET` | `/api/health/ready` | Readiness probe (evaluates MongoDB ping) |
