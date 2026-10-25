# MediLens AI — Shared API Contract (Part C)

All paths are under `/api`. Authenticated routes need `Authorization: Bearer <access_token>`.
JSON is **camelCase** (except standard OAuth token properties which include both snake_case and camelCase aliases).
Errors: `{ "error": string, "code": string, "details"?: object }`.

---

## C1. Auth and account

```ts
// POST /auth/signup  body
{ name: string; email: string; password: string; timezone: string; language: 'en'|'hi'; acceptTerms: true }
// POST /auth/login   body
{ email: string; password: string }
// both return 200/201
{
  token: string;
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: {
    id: string;
    name: string;
    email: string;
    timezone: string;
    language: 'en'|'hi';
    fontSize: 'normal'|'large'|'xlarge';
  }
}

// POST /auth/refresh  { refresh_token } -> same response
// POST /auth/logout   { refresh_token } -> 200/204
// POST /auth/logout-all -> 200/204
// GET  /auth/me       -> { user }
// PATCH /auth/me      { name?, timezone?, language?, fontSize? } -> { user }
// DELETE /auth/me     { password } -> 204
// POST /auth/password/forgot { email } -> 202 (always)
// POST /auth/password/reset  { token, newPassword } -> 204
// POST /auth/google   { idToken } -> same as login
```

---

## C2. Profile (medical history) and summary

```ts
interface MedicalHistory {
  dob?: string;                       // YYYY-MM-DD, not in the future
  sex?: 'female'|'male'|'other'|'prefer_not_to_say';
  conditions: string[];               // max 50
  allergyType?: 'medicine'|'food'|'other'|'';
  noKnownAllergies: boolean;
  specificAllergen?: string;
  currentMedicines: { name: string; dosage: string }[];   // info only; does NOT create reminders
  pastSurgeries?: string;
}

// GET /profile -> { profile: MedicalHistory | null }
// PUT /profile (MedicalHistory) -> { profile: MedicalHistory }
// PUT /profile/pharmacy { name: string; phone: string } -> { pharmacy: { name: string; phone: string } }

// GET /summary
{
  name: string;
  caregiverName: string;
  caregiverLinked: boolean;
  activeReportsCount: number;
  upcomingMedsCount: number;
  nextDose: { medicineId: string; name: string; time: string; date: string } | null;
  refillAlertsCount: number;
  recentDocuments: DocumentListItem[]; /* max 3 */
}
```

---

## C3. Documents

```ts
// POST /analyze/document  multipart: file, kind=auto|report|prescription, language?   (or JSON { mimeType, base64, kind })
//   ?async=true -> 202 { id }       default (sync, waits up to 60 s) -> 200 DocumentDetail
// GET  /analyze/documents?q=&kind=&page=&pageSize=  -> { items: DocumentListItem[]; page; pageSize; total }
// GET  /analyze/documents/{id} -> DocumentDetail
// DELETE /analyze/documents/{id} -> 204
// POST /analyze/documents/{id}/ask { question } -> { answer, sources[] }
// POST /documents/{id}/share { caregiverId } -> 204

interface DocumentListItem {
  id: string;
  title: string;
  date: string; /* ISO UTC */
  category: string;
  provider: string;
  badgeText: string;
  badgeType: 'warning'|'active'|'success'|'info';
  type: 'lab'|'prescription'|'imaging'|'note';
  questionsCount?: number;
}

interface DocumentDetail extends DocumentListItem {
  status: 'processing'|'done'|'failed';
  progress: number;                                   // 0-100
  pipelineSteps: {
    id: 1|2|3|4|5;
    title: string;
    description: string;
    status: 'done'|'active'|'pending';
    tag?: string;
  }[];
  unclearItems: string[];                             // powers the clarity-check card
  plainLanguageSummary: string;
  findings: {
    testName: string;
    value: string;
    unit: string;
    referenceRange: string;
    status: 'normal'|'high'|'low'|'unknown';
    critical: boolean;
    explanation: string;
    whyItMatters?: string;
    needsReview: boolean;
    sources: Source[];
  }[];
  medicines?: ExtractedMedicine[];                    // prescriptions only
  doctorQuestions: string[];
  urgentFlags: string[];                              // non-empty => frontend shows urgent banner
  sources: Source[];
  disclaimer: string;
}

interface Source {
  name: 'MedlinePlus'|'WHO'|'NIH';
  title: string;
  url: string;
}

interface ExtractedMedicine {
  name: string;
  strength?: string;
  dosage: string|null;
  frequency: string|null;
  suggestedTimes: string[]; /* HH:MM */
  withFood?: 'before'|'after'|'with'|'any'|null;
  durationDays?: number|null;
  doctorInstructions?: string|null;
  usedFor?: string;
  generalInfo?: string;
  commonSideEffects: string[];
  generalCautions: string[];
  unclear: boolean;
  needsReview: boolean;
  sources: Source[];
}
```

---

## C4. Image / video screening

```ts
// POST /analyze/skin  multipart: file (image or video), note?, language?
{
  imageQuality: 'good'|'fair'|'poor';
  qualityNote: string;
  observedSigns: string[];
  possibleConditions: {
    name: string;
    confidence: 'low'|'medium'; // never 'high'
    whyItMayLookLikeThis: string;
  }[]; // max 3, empty if imageQuality === 'poor'
  possibleContributingFactors: string[];
  selfCareTips: string[];
  seeDoctorIf: string[];
  urgency: 'routine'|'soon'|'urgent';
  sources: Source[];
  disclaimer: string;
}
```

---

## C5. Medicines, reminders, refills

```ts
interface MedicineInput {
  name: string;
  dosage: string;
  instructions?: string;
  notes?: string;
  times: string[]; /* HH:MM, at least 1 */
  startDate: string;
  endDate?: string;
  pillsTotal?: number;
  pillsLeft?: number;
  category?: string;
  advisory?: string;
  source?: 'manual'|'prescription';
  sourceDocId?: string;
}

// GET /medicines -> { medicines: Medicine[] }
// POST /medicines -> 201 { medicine: Medicine }
// PUT /medicines/{id} -> { medicine: Medicine }
// DELETE /medicines/{id} -> 204
// POST /medicines/bulk { medicines: MedicineInput[] } -> 201 { medicines: Medicine[] }

// GET /medicines/schedule/today?date=YYYY-MM-DD  -> { doses: Dose[] }
interface Dose {
  medicineId: string;
  name: string;
  dosage: string;
  instructions: string;
  advisory?: string;
  category?: string;
  time: string; /* HH:MM */
  date: string;
  timeSlot: 'MORNING'|'AFTERNOON'|'EVENING'|'NIGHT';
  timeDisplay: string; /* "8:00 AM" */
  status: 'pending'|'taken'|'snoozed'|'skipped'|'missed';
  takenAt?: string;
  snoozedUntil?: string;
  loggedBy?: string;
  dueStatus: string;
  dueStatusType: 'normal'|'due-soon'|'taken'|'upcoming'|'missed';
}

// POST /medicines/{id}/log { date, time, status: 'taken'|'snoozed'|'skipped'|'pending' } -> 204 (pending = undo)
// GET /medicines/stats/adherence?days=7 -> { days: { date: string; scheduled: number; taken: number }[] }
// GET /medicines/refill-alerts -> { alerts: { id: string; medicationName: string; pillsLeft: number; daysRemaining: number; pharmacy?: { name: string; phone: string } }[] }
// GET /push/vapid-key -> { publicKey: string }
// POST /push/subscribe (PushSubscription JSON) -> 204
// DELETE /push/subscribe -> 204
```

---

## C6. Self-care, config, export

```ts
// GET /selfcare -> { conditions: { id: 'migraine'|'type-2-diabetes'|'hypertension'; title: string }[] }
// GET /selfcare/{condition} -> { id: string; title: string; sections: { heading: string; items: string[] }[]; redFlags: string[]; sources: Source[]; disclaimer: string }
// GET /meta/emergency?country=IN -> { primary: '112', ambulance: '108' }
// GET /config -> { maxDocBytes: number; maxImageBytes: number; maxVideoBytes: number; maxVideoSeconds: number; docTypes: string[]; mediaTypes: string[]; aiAvailable: boolean }
// GET /export -> application/json download of everything stored for this user
// GET /health -> { ok: boolean; ai: boolean }
```
