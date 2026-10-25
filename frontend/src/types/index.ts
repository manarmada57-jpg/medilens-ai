export interface Source {
  name: 'MedlinePlus' | 'WHO' | 'NIH';
  title: string;
  url: string;
}

export interface Finding {
  testName: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: 'normal' | 'high' | 'low' | 'unknown' | 'elevated';
  critical?: boolean;
  explanation: string;
  whyItMatters?: string;
  needsReview?: boolean;
  sources?: Source[];
}

export interface ExtractedMedicine {
  name: string;
  strength?: string;
  dosage: string | null;
  frequency: string | null;
  suggestedTimes: string[];
  withFood?: 'before' | 'after' | 'with' | 'any' | null;
  durationDays?: number | null;
  doctorInstructions?: string | null;
  usedFor?: string;
  generalInfo?: string;
  commonSideEffects?: string[];
  generalCautions?: string[];
  unclear?: boolean;
  needsReview?: boolean;
  sources?: Source[];
}

export interface DiagnosticStep {
  id: number;
  title: string;
  description: string;
  status: 'done' | 'active' | 'pending';
  tag?: string;
}

export interface HealthDocument {
  id: string;
  title: string;
  date: string;
  category: string;
  provider: string;
  badgeText: string;
  badgeType: 'warning' | 'active' | 'success' | 'info';
  questionsCount?: number;
  type: 'lab' | 'prescription' | 'imaging' | 'note';
  status?: 'processing' | 'done' | 'completed' | 'failed';
  progress?: number;
  pipelineSteps?: DiagnosticStep[];
  unclearItems?: string[];
  summary?: string;
  findings?: Finding[];
  medicines?: ExtractedMedicine[];
  plainLanguageSummary?: string;
  doctorQuestions?: string[];
  urgentFlags?: string[];
  sources?: Source[];
  disclaimer?: string;
  needsReview?: boolean;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  notes?: string;
  times?: string[];
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  timeDisplay: string;
  taken: boolean;
  takenAt?: string;
  category: string;
  loggedBy?: string;
  advisory?: string;
  dueStatus?: string;
  dueStatusType?: 'normal' | 'due-soon' | 'taken' | 'upcoming' | 'missed';
  pillsLeft?: number;
  pillsTotal?: number;
  startDate?: string;
  endDate?: string;
  pharmacy?: string;
  phone?: string;
}

export interface Dose {
  medicineId: string;
  name: string;
  dosage: string;
  instructions: string;
  advisory?: string;
  category?: string;
  time: string; // HH:MM
  date: string;
  timeSlot: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  timeDisplay: string;
  status: 'pending' | 'taken' | 'snoozed' | 'skipped' | 'missed';
  takenAt?: string;
  snoozedUntil?: string;
  loggedBy?: string;
  dueStatus: string;
  dueStatusType: 'normal' | 'due-soon' | 'taken' | 'upcoming' | 'missed';
}

export interface RefillAlert {
  id: string;
  medicationName: string;
  pillsLeft: number;
  daysRemaining: number;
  pharmacy: string;
  prescriptionNumber?: string;
  phone?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  timezone: string;
  language: 'en' | 'hi';
  fontSize: 'normal' | 'large' | 'xlarge';
}

export interface AuthResponse {
  token: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface UserProfile {
  name: string;
  role: string;
  caregiverName: string;
  caregiverLinked: boolean;
  activeReportsCount: number;
  upcomingMedsCount: number;
}

export interface MedicalHistory {
  dob?: string;
  sex?: 'female' | 'male' | 'other' | 'prefer_not_to_say';
  conditions: string[];
  allergyType?: 'medicine' | 'food' | 'other' | '';
  noKnownAllergies: boolean;
  specificAllergen?: string;
  currentMedicines: { name: string; dosage: string }[];
  pastSurgeries?: string;
  documentIds?: string[];
  uploadedFiles?: string[]; // deprecated alias
}

export interface PossibleCondition {
  name: string;
  confidence: 'low' | 'medium';
  whyItMayLookLikeThis: string;
}

export interface SkinAnalysisResult {
  imageQuality: 'good' | 'fair' | 'poor';
  qualityNote: string;
  observedSigns: string[];
  possibleConditions: PossibleCondition[];
  possibleContributingFactors: string[];
  selfCareTips: string[];
  seeDoctorIf: string[];
  urgency: 'routine' | 'soon' | 'urgent';
  sources: Source[];
  disclaimer: string;
  abcdeGuide?: {
    parameter: string;
    criterion: string;
    guideline: string;
    status: string;
  }[];
  questionsForDermatologist?: string[];
}

export interface SelfCareSection {
  heading: string;
  items: string[];
}

export interface SelfCareDetail {
  id: string;
  title: string;
  sections: SelfCareSection[];
  redFlags: string[];
  sources: Source[];
  disclaimer: string;
}

export interface EmergencyMeta {
  primary: string;
  ambulance: string;
}

export interface AppConfig {
  maxDocBytes: number;
  maxImageBytes: number;
  maxVideoBytes: number;
  maxVideoSeconds: number;
  docTypes: string[];
  mediaTypes: string[];
  aiAvailable: boolean;
}

export interface DashboardSummary {
  name: string;
  caregiverName: string;
  caregiverLinked: boolean;
  activeReportsCount: number;
  upcomingMedsCount: number;
  nextDose: {
    medicineId: string;
    name: string;
    time: string;
    date: string;
  } | null;
  refillAlertsCount: number;
  recentDocuments: HealthDocument[];
}
