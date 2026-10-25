# MediLens AI — Frontend

> **Understand Your Health, Clearly**
> React 19 + TypeScript + Tailwind CSS v4 Progressive Web App (PWA).

---

## 1. Core Principles
- **Patient-First Transparency:** Explains medical findings in everyday words without clinical jargon.
- **Strict Non-Diagnostic Role:** Never diagnoses or recommends medication changes; directs critical findings to doctors.
- **Privacy by Design:** Zero storage of sensitive health documents in client-side logs or analytics.
- **Zero Mock Data in Production:** All dashboard views, document lists, and schedules connect to the backend API (`/api`).

---

## 2. Directory Structure
```
frontend/
├── Dockerfile                  # Multi-stage production container (Node build -> Nginx)
├── nginx.conf                  # Nginx proxy & security headers
├── package.json                # Dependencies & scripts
├── tsconfig.json               # Strict TypeScript configuration
├── vite.config.ts              # Vite 6 config with /api proxy & Tailwind v4
├── .env.example                # Frontend environment template
├── index.html                  # HTML entrypoint with viewport & fonts
│
├── public/
│   ├── favicon.ico
│   └── assets/aistudio/        # Application assets (3D capsule graphic)
│
└── src/
    ├── main.tsx                # React root mount
    ├── App.tsx                 # Root router & application orchestrator
    ├── index.css               # Tailwind CSS & accessibility font scaling
    │
    ├── types/
    │   └── index.ts            # Strict TypeScript interfaces matching API contract
    │
    ├── api/                    # Single-source-of-truth API client layer
    │   ├── client.ts           # Typed fetch wrapper, token refresh queue, flat error parsing
    │   ├── auth.ts             # Signup, login, refresh, logout, profile
    │   ├── profile.ts          # Medical history intake & pharmacy settings
    │   ├── summary.ts          # Dashboard metrics & active reports
    │   ├── documents.ts        # Multipart upload, OCR analysis, Q&A, sharing
    │   ├── medicines.ts        # Medicine CRUD, dose logging, snooze, refill alerts
    │   ├── skin.ts             # Educational skin observation screening
    │   ├── selfcare.ts         # MedlinePlus/WHO/NIH condition self-care guides
    │   └── meta.ts             # Emergency hotlines (112/108) & system config
    │
    └── components/             # Reusable UI & Screen Views
        ├── AuthScreen.tsx      # Sign In / Sign Up with consent & password validation
        ├── MedicalHistoryScreen.tsx # 3-step medical history intake
        ├── HomeScreen.tsx      # Mobile dashboard overview
        ├── DesktopHomeScreen.tsx # Desktop multi-column dashboard
        ├── DesktopLayout.tsx   # Responsive desktop navigation shell
        ├── UploadScreen.tsx    # Drag-and-drop, camera OCR & analysis pipeline
        ├── MedicinesScreen.tsx # Medication schedule & dose completion
        ├── DesktopMedicinesScreen.tsx # Desktop medication regimen view
        ├── HistoryScreen.tsx   # Patient document repository & filtering
        ├── DesktopHistoryScreen.tsx # Desktop records repository
        ├── SelfCareScreen.tsx  # Grounded condition guides & emergency actions
        ├── DocumentModal.tsx   # Detailed document reader, Q&A & citations
        ├── SkinResultModal.tsx # Non-diagnostic skin observation results
        ├── PharmacyModal.tsx   # Tap-to-call, copy Rx, & mark refilled
        ├── AddMedicineModal.tsx # Add medicine form with times & pill tracking
        ├── Header.tsx          # Mobile header & profile menu
        └── BottomNav.tsx       # Mobile navigation bar
```

---

## 3. Development Commands

```bash
npm install        # Install frontend dependencies
npm run dev        # Start Vite dev server on port 3000 (proxies /api to backend)
npm run build      # Compile production bundle to dist/
npm run lint       # Run TypeScript static check (tsc --noEmit)
npm run gen:api    # Generate schema types from backend openapi.json
```

---

## 4. Environment Variables
Copy `.env.example` to `.env`:
```bash
VITE_API_URL=http://localhost:8000/api
VITE_USE_MOCKS=false
```
