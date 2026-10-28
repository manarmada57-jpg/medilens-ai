import React, { useRef } from 'react';
import {
  Camera,
  FolderOpen,
  Lock,
  ArrowRight,
  BarChart3,
  Pill,
  Clock,
  Check,
  FileSpreadsheet,
  Scan,
  ClipboardList,
  ChevronRight,
  Info,
  CheckCheck,
  CheckCircle2,
  FileText,
  Calendar,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Share2,
  Heart,
} from 'lucide-react';
import { Medication, HealthDocument, UserProfile, MedicalHistory } from '../types';
import confetti from 'canvas-confetti';

interface DesktopHomeScreenProps {
  profile: UserProfile;
  medications: Medication[];
  documents?: HealthDocument[];
  medicalHistory?: MedicalHistory | null;
  onTakeMedication: (id: string) => void;
  onSnoozeMedication: (id: string) => void;
  onSelectDocument: (doc: HealthDocument) => void;
  onNavigateToUpload: (mode?: 'report' | 'prescription' | 'image', file?: File) => void;
  onOpenSampleReport: () => void;
  onEditMedicalHistory?: () => void;
}

export const DesktopHomeScreen: React.FC<DesktopHomeScreenProps> = ({
  profile,
  medications,
  documents = [],
  medicalHistory,
  onTakeMedication,
  onSnoozeMedication,
  onSelectDocument,
  onNavigateToUpload,
  onOpenSampleReport,
  onEditMedicalHistory,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Find next upcoming medicine or first untaken
  const nextMedicine = medications.find((m) => !m.taken) || medications[0];

  const handleTakeNext = () => {
    if (nextMedicine) {
      onTakeMedication(nextMedicine.id);
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#0a7075', '#1d4ed8', '#10b981'],
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onNavigateToUpload('report', e.target.files[0]);
    }
  };

  const takenCount = medications.filter((m) => m.taken).length;
  const totalMeds = medications.length;
  const adherencePercent = totalMeds > 0 ? Math.round((takenCount / totalMeds) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Top Hero Banner (Full Width) ─────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0a7075] via-[#0d8288] to-[#085a5e] p-6 lg:p-8 text-white shadow-xl shadow-[#0a7075]/15">
        {/* Decorative ECG Medical Pulse Watermark */}
        <div className="pointer-events-none absolute right-0 bottom-0 top-0 w-1/2 opacity-10 flex items-center justify-end pr-4">
          <svg viewBox="0 0 500 150" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-full h-auto">
            <path d="M0,75 L120,75 L135,20 L150,130 L165,55 L180,85 L195,75 L500,75" />
          </svg>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Live Sync Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold backdrop-blur-md border border-white/20">
              <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse"></span>
              <span>Daily Health Sync • All systems active</span>
            </div>

            <h1 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              Good morning, {profile.name}
            </h1>

            <p className="text-sm text-[#e0f7f6] leading-relaxed">
              Your health profile is up-to-date. You have{' '}
              <strong className="text-white font-bold">{profile.activeReportsCount} understood reports</strong> and{' '}
              <strong className="text-white font-bold">{profile.upcomingMedsCount} upcoming medication dose</strong>{' '}
              scheduled for today.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-medium text-white/90 border border-white/15">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Field-Level Encrypted Storage</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-medium text-white/90 border border-white/15">
                <Check className="w-3.5 h-3.5 text-cyan-300" />
                <span>Plain English Medical Translations</span>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/20 text-xs font-medium text-white/90 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Caregiver Connected: Marcus R.</span>
              </div>
            </div>
          </div>

          {/* Quick CTA Buttons */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={onOpenSampleReport}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white text-[#0a7075] text-xs font-extrabold shadow-md hover:bg-[#f0fdfa] active:scale-98 transition-all"
            >
              <span>See Sample Lab Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigateToUpload('report')}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/30 backdrop-blur-xs transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Scan New Document</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 4 Key Interactive Metrics Cards ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-white rounded-2xl p-4 border border-[#d8ecea] shadow-xs hover:border-[#a2e3de] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Reports Understood</span>
            <div className="w-8 h-8 rounded-xl bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">{profile.activeReportsCount}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>100% translated to plain words</span>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white rounded-2xl p-4 border border-[#d8ecea] shadow-xs hover:border-[#a2e3de] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Medication Adherence</span>
            <div className="w-8 h-8 rounded-xl bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-gray-900">{adherencePercent}%</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-blue-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{takenCount} of {totalMeds} logged today</span>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white rounded-2xl p-4 border border-[#d8ecea] shadow-xs hover:border-[#a2e3de] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Next Dose</span>
            <div className="w-8 h-8 rounded-xl bg-[#fef3c7] text-[#b45309] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-gray-900 truncate">
            {nextMedicine ? nextMedicine.name : 'No doses today'}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-amber-700">
            <span>{nextMedicine ? `Due at ${nextMedicine.timeDisplay || 'Scheduled Time'} (${nextMedicine.instructions || 'as prescribed'})` : 'Regimen up to date'}</span>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white rounded-2xl p-4 border border-[#d8ecea] shadow-xs hover:border-[#a2e3de] transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Caregiver Sync</span>
            <div className="w-8 h-8 rounded-xl bg-[#ecfdf5] text-[#059669] flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-base font-extrabold text-gray-900 truncate">
            {profile.caregiverName}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>SMS updates enabled</span>
          </div>
        </div>
      </div>

      {/* ── 3-Column SaaS Content Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── Column 1: Interactive Upload & Clinical Tools ───────────────── */}
        <div className="space-y-6">
          {/* Upload Card */}
          <div className="rounded-2xl border-2 border-dashed border-[#57cfc5] bg-white p-6 text-center shadow-xs">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,image/*"
              className="hidden"
            />

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e0f7f6] text-[#0a7075] mb-3 shadow-2xs">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                <path d="M12 12v9" />
                <path d="m16 16-4-4-4 4" />
              </svg>
            </div>

            <h2 className="text-base font-bold text-gray-900">
              Upload Report or Prescription
            </h2>
            <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
              Drop your PDF lab result, take a photo with your mobile camera, or upload JPG/PNG.
            </p>

            <div className="mt-4 flex items-center justify-center gap-2.5">
              <button
                onClick={() => onNavigateToUpload('report')}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#0a7075] px-3.5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-[#085a5e] active:scale-98 transition-all"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#e6f7f6] border border-[#a2e3de] px-3.5 py-2.5 text-xs font-semibold text-[#0a7075] hover:bg-[#d8f2f0] active:scale-98 transition-all"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Choose File</span>
              </button>
            </div>

            <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
              <Lock className="w-3 h-3 text-gray-400" />
              <span>Documents encrypted & processed privately</span>
            </div>
          </div>

          {/* Quick Clinical Actions */}
          <div className="bg-white rounded-2xl border border-[#d8ecea] p-4 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Clinical AI Tools
              </h3>
              <span className="text-[11px] font-semibold text-[#0a7075]">Touch to explore</span>
            </div>

            {/* Action 1: Lab Report */}
            <div
              onClick={() => onNavigateToUpload('report')}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#a2e3de] hover:bg-[#f0faf9] cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#0a7075] text-white flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#0a7075] transition-colors">
                    Analyse Lab Report
                  </h4>
                  <p className="text-[11px] text-gray-500">Blood tests & metabolic panels translated</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#0a7075] transition-colors" />
            </div>

            {/* Action 2: Prescription */}
            <div
              onClick={() => onNavigateToUpload('prescription')}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#a2e3de] hover:bg-[#f0faf9] cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#1d4ed8] text-white flex items-center justify-center shrink-0">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">
                    Read Prescription
                  </h4>
                  <p className="text-[11px] text-gray-500">Verify dosages, timing & safety warnings</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1d4ed8] transition-colors" />
            </div>

            {/* Action 3: Health Image */}
            <div
              onClick={() => onNavigateToUpload('image')}
              className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#a2e3de] hover:bg-[#f0faf9] cursor-pointer transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#ea580c] text-white flex items-center justify-center shrink-0">
                  <Scan className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 group-hover:text-[#ea580c] transition-colors">
                    Check Health Image
                  </h4>
                  <p className="text-[11px] text-gray-500">X-rays, skin observations & imaging</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#ea580c] transition-colors" />
            </div>
          </div>
        </div>

        {/* ── Column 2: Next Medication & Doctor Discussion ─────────────── */}
        <div className="space-y-6">
          {/* Next Medicine Card */}
          {nextMedicine ? (
            <div className="rounded-2xl border border-[#d8ecea] bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#1d4ed8] uppercase">
                  <Clock className="w-4 h-4" />
                  <span>Next Scheduled Dose</span>
                </div>

                <div className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-1 text-[11px] font-semibold text-[#92400e] border border-[#fde68a]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#d97706] animate-pulse"></span>
                  <span>Today • {nextMedicine.timeDisplay || 'Scheduled Time'}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-extrabold text-gray-900">
                  {nextMedicine.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {nextMedicine.instructions} • {nextMedicine.loggedBy || 'As prescribed'}
                </p>
              </div>

              {/* Action Row */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleTakeNext}
                  disabled={nextMedicine.taken}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-bold shadow-xs transition-all ${
                    nextMedicine.taken
                      ? 'bg-[#10b981] text-white cursor-default'
                      : 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white active:scale-98'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>{nextMedicine.taken ? 'Confirmed Taken ✓' : 'Mark as Taken'}</span>
                </button>

                <button
                  onClick={() => onSnoozeMedication(nextMedicine.id)}
                  title="Snooze 15 minutes"
                  className="flex items-center justify-center w-12 h-11 rounded-xl bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] transition-all active:scale-95 border border-[#bae6fd]"
                >
                  <Clock className="w-4 h-4 stroke-[2]" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-6 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#f1f5f9] text-[#64748b] mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-gray-800">No scheduled doses today</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Add doctor-prescribed medications to receive scheduled reminders and track daily doses.
              </p>
            </div>
          )}

          {/* Health Profile Summary Card */}
          <div className="rounded-2xl border border-[#d8ecea] bg-white p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#0a7075]" />
                <h3 className="text-xs font-bold text-[#0a7075] uppercase tracking-wider">
                  Your Health Profile
                </h3>
              </div>
              {onEditMedicalHistory && (
                <button
                  onClick={onEditMedicalHistory}
                  className="text-xs font-semibold text-[#0a7075] hover:underline cursor-pointer"
                >
                  {medicalHistory ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>

            {medicalHistory ? (
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {medicalHistory.conditions && medicalHistory.conditions.length > 0 ? (
                    medicalHistory.conditions.map((cond, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#e0f7f6] text-[#00756e] font-bold text-xs border border-[#a2e3de]"
                      >
                        {cond}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-500">No chronic conditions listed</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-gray-600 border-t border-gray-100">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Allergies</span>
                    <span className="font-semibold text-gray-800">
                      {medicalHistory.noKnownAllergies
                        ? 'No known allergies'
                        : medicalHistory.specificAllergen || (medicalHistory.allergyType ? `Allergic (${medicalHistory.allergyType})` : 'None recorded')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase font-bold">Current Medications</span>
                    <span className="font-semibold text-gray-800">
                      {medicalHistory.currentMedicines && medicalHistory.currentMedicines.length > 0
                        ? `${medicalHistory.currentMedicines.length} listed`
                        : 'None recorded'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between py-1">
                <p className="text-xs text-gray-500">No medical history on file yet.</p>
                {onEditMedicalHistory && (
                  <button
                    onClick={onEditMedicalHistory}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0a7075] text-white text-xs font-semibold hover:bg-[#07595e] transition-colors"
                  >
                    Complete Intake
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Questions for Doctor Card (Derived from intake & lab tests) */}
          <div className="bg-gradient-to-br from-[#f0faf9] to-[#e6f7f6] rounded-2xl p-5 border border-[#cbebe8] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#0a7075]" />
                <h3 className="text-xs font-bold text-[#0a7075] uppercase tracking-wider">
                  Questions For Your Next Visit
                </h3>
              </div>
              <span className="text-[10px] font-bold bg-[#daf1ef] text-[#0a7075] px-2 py-0.5 rounded-full">
                Recent Panel
              </span>
            </div>

            <div className="space-y-2 text-xs text-gray-700">
              <div className="p-2.5 bg-white rounded-xl border border-[#d8ecea] flex items-start gap-2">
                <span className="font-bold text-[#0a7075]">1.</span>
                <p className="leading-snug">
                  "My eGFR was 92 mL/min. Is this stable compared to my previous test last year?"
                </p>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-[#d8ecea] flex items-start gap-2">
                <span className="font-bold text-[#0a7075]">2.</span>
                <p className="leading-snug">
                  "Should I continue monitoring key electrolyte levels in my diet?"
                </p>
              </div>
            </div>

            <button
              onClick={onOpenSampleReport}
              className="text-[11px] font-bold text-[#0a7075] hover:underline flex items-center gap-1"
            >
              <span>View full lab questions in report</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* ── Column 3: Recent Documents & Safety Disclaimer ─────────────── */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-[#d8ecea] p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 tracking-tight">Recent Documents</h2>
              {documents.length > 0 && (
                <button
                  onClick={onOpenSampleReport}
                  className="text-xs font-semibold text-[#0a7075] hover:underline"
                >
                  View all ({documents.length})
                </button>
              )}
            </div>

            <div className="space-y-2">
              {documents.length === 0 ? (
                <div className="p-6 text-center space-y-2 border border-dashed border-gray-200 rounded-xl">
                  <div className="w-9 h-9 rounded-full bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center mx-auto">
                    <FileText className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-gray-800">No documents yet</h4>
                  <p className="text-[11px] text-gray-500">
                    Upload your first lab report or prescription to see plain-English explanations.
                  </p>
                </div>
              ) : (
                documents.slice(0, 4).map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onSelectDocument(doc)}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-[#a2e3de] hover:bg-[#f9fefe] cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center shrink-0">
                        {doc.type === 'lab' ? (
                          <FileSpreadsheet className="w-4 h-4" />
                        ) : doc.type === 'prescription' ? (
                          <Pill className="w-4 h-4" />
                        ) : doc.type === 'imaging' ? (
                          <Scan className="w-4 h-4" />
                        ) : (
                          <ClipboardList className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-gray-900 group-hover:text-[#0a7075] transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-[11px] text-gray-500">{doc.date} • {doc.provider || doc.category}</p>
                        {doc.badgeText && (
                          <div className="mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              doc.badgeType === 'warning'
                                ? 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]'
                                : doc.badgeType === 'active'
                                ? 'bg-[#e0f7f6] text-[#00756e] border border-[#a2e3de]'
                                : 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
                            }`}>
                              {doc.badgeType === 'warning' && <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></span>}
                              {doc.badgeType === 'active' && <Check className="w-3 h-3 stroke-[2.5]" />}
                              {doc.badgeType === 'info' && <CheckCheck className="w-3 h-3" />}
                              <span>{doc.badgeText}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#0a7075] transition-colors" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Safety Disclaimer Notice */}
          <div className="rounded-2xl border border-dashed border-[#a2e3de] bg-[#f0faf9]/80 p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
            <p className="text-[11.5px] text-gray-600 leading-relaxed">
              <strong className="text-gray-800">MediLens AI is not a diagnosis tool.</strong> We translate complex clinical terminology into everyday English to help you communicate clearly with doctors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
