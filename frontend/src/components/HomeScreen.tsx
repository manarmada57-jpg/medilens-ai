import React, { useRef } from 'react';
import {
  Camera,
  FolderOpen,
  Lock,
  ArrowRight,
  BarChart3,
  Pill,
  Image as ImageIcon,
  Clock,
  Check,
  FileText,
  FileSpreadsheet,
  Scan,
  ClipboardList,
  ChevronRight,
  Info,
  CheckCheck,
  BellRing,
  HelpCircle,
  Heart,
} from 'lucide-react';
import { Medication, HealthDocument, UserProfile, MedicalHistory } from '../types';
import confetti from 'canvas-confetti';

interface HomeScreenProps {
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

export const HomeScreen: React.FC<HomeScreenProps> = ({
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
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0a7075', '#1d4ed8', '#10b981'],
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onNavigateToUpload('report', e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4 pb-20 pt-2 px-3.5">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c6b73] via-[#0b777f] to-[#075960] p-6 text-white shadow-lg shadow-[#0c6b73]/20">
        {/* Subtle Watermark Graphic */}
        <div className="pointer-events-none absolute -bottom-6 -right-6 opacity-15">
          <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 18h8" />
            <path d="M3 22h18" />
            <path d="M14 22a7 7 0 1 0 0-14h-1" />
            <path d="M9 14h2" />
            <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
            <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
          </svg>
        </div>

        <div className="relative z-10 space-y-3">
          {/* Daily Health Sync Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-xs border border-white/20">
            <span className="w-2 h-2 rounded-full bg-[#34d399] animate-pulse"></span>
            <span>Daily Health Sync</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Good morning, {profile.name}
            </h1>
            <p className="mt-1 text-sm text-[#e0f7f6] leading-snug">
              You have {profile.activeReportsCount} understood reports and {profile.upcomingMedsCount} upcoming medication dose today.
            </p>
          </div>

          {/* All vitals translated pill */}
          <div className="inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1.5 text-xs text-white/95 border border-white/15">
            <div className="flex items-center -space-x-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f87171] border border-black/30"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#fb923c] border border-black/30"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] border border-black/30"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] border border-black/30"></span>
            </div>
            <span className="font-medium text-[11.5px]">All vitals translated to plain words</span>
          </div>

          {/* See a sample report button */}
          <div className="pt-1">
            <button
              onClick={onOpenSampleReport}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-[#0c6b73] shadow-md hover:bg-[#f0fdfa] active:scale-98 transition-all"
            >
              <span>See a sample report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Upload Box with Dashed Border */}
      <div className="rounded-3xl border-2 border-dashed border-[#57cfc5] bg-white p-5 text-center shadow-xs">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,image/*"
          className="hidden"
        />

        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e0f7f6] text-[#0a7075] mb-3">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
            <path d="M12 12v9" />
            <path d="m16 16-4-4-4 4" />
          </svg>
        </div>

        <h2 className="text-base font-bold text-gray-900">
          Upload a report or prescription
        </h2>
        <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto">
          Drop PDF, take a photo with your phone camera, or upload JPG/PNG
        </p>

        {/* Buttons Row */}
        <div className="mt-4 flex items-center justify-center gap-2.5">
          <button
            onClick={() => onNavigateToUpload('report')}
            className="flex-1 max-w-[155px] flex items-center justify-center gap-1.5 rounded-full bg-[#0c6b73] px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#09575d] active:scale-98 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Take photo</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 max-w-[155px] flex items-center justify-center gap-1.5 rounded-full bg-[#e6f7f6] border border-[#a2e3de] px-3.5 py-2.5 text-xs font-semibold text-[#0c6b73] hover:bg-[#d8f2f0] active:scale-98 transition-all"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Choose file</span>
          </button>
        </div>

        <div className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <Lock className="w-3 h-3 text-gray-400" />
          <span>Documents processed privately with encrypted storage</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Quick Actions</h2>
          <button
            onClick={() => onNavigateToUpload('report')}
            className="text-xs font-medium text-[#0a7075] hover:underline"
          >
            Touch to explore
          </button>
        </div>

        {/* Action 1: Analyse a report */}
        <div
          onClick={() => onNavigateToUpload('report')}
          className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#e2efef] hover:border-[#b5e3df] hover:shadow-sm cursor-pointer transition-all active:scale-99"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#0c6b73] text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-snug">Analyse a report</h3>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                Blood tests, lab panels & urine results in plain words
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* Action 2: Read a prescription */}
        <div
          onClick={() => onNavigateToUpload('prescription')}
          className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#e2efef] hover:border-[#b5e3df] hover:shadow-sm cursor-pointer transition-all active:scale-99"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#1d4ed8] text-white flex items-center justify-center shadow-xs">
              <Pill className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-snug">Read a prescription</h3>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                Verify medicine names, dosages & schedule safely
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>

        {/* Action 3: Check health image */}
        <div
          onClick={() => onNavigateToUpload('image')}
          className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#e2efef] hover:border-[#b5e3df] hover:shadow-sm cursor-pointer transition-all active:scale-99"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#ea580c] text-white flex items-center justify-center shadow-xs">
              <ImageIcon className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 leading-snug">Check health image</h3>
              <p className="text-xs text-gray-500 leading-tight mt-0.5">
                X-rays, skin photos with clear non-diagnosis observations
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Next Medicine Card */}
      {nextMedicine ? (
        <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#1d4ed8] uppercase">
              <Clock className="w-4 h-4" />
              <span>NEXT MEDICINE</span>
            </div>

            <div className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2.5 py-0.5 text-[11px] font-semibold text-[#92400e] border border-[#fde68a]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]"></span>
              <span>Today • {nextMedicine.timeDisplay || 'Scheduled Time'}</span>
            </div>
          </div>

          <div>
            <h3 className="text-xl font-extrabold text-gray-900">
              {nextMedicine.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {nextMedicine.instructions} • {nextMedicine.loggedBy || 'As prescribed'}
            </p>
          </div>

          {/* Action Row */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={handleTakeNext}
              disabled={nextMedicine.taken}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold shadow-xs transition-all ${
                nextMedicine.taken
                  ? 'bg-[#10b981] text-white'
                  : 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white active:scale-98'
              }`}
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{nextMedicine.taken ? 'Confirmed Taken ✓' : 'Mark as Taken'}</span>
            </button>

            <button
              onClick={() => onSnoozeMedication(nextMedicine.id)}
              title="Snooze 15 minutes"
              className="flex items-center justify-center w-11 h-10 rounded-xl bg-[#e0f2fe] hover:bg-[#bae6fd] text-[#0369a1] transition-all active:scale-95 border border-[#bae6fd]"
            >
              <Clock className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#cbd5e1] bg-white p-5 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-[#f1f5f9] text-[#64748b] mx-auto flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-800">No scheduled doses today</h3>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Add doctor-prescribed medications to receive scheduled reminders and track daily doses.
          </p>
        </div>
      )}

      {/* Health Profile Summary Card */}
      <div className="rounded-2xl border border-[#d6ebe8] bg-white p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#0a7075] uppercase">
            <Heart className="w-4 h-4" />
            <span>YOUR HEALTH PROFILE</span>
          </div>
          {onEditMedicalHistory && (
            <button
              onClick={onEditMedicalHistory}
              className="text-xs font-semibold text-[#0a7075] hover:underline"
            >
              {medicalHistory ? 'Edit' : '+ Add'}
            </button>
          )}
        </div>

        {medicalHistory ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {medicalHistory.conditions && medicalHistory.conditions.length > 0 ? (
                medicalHistory.conditions.map((cond, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#e0f7f6] text-[#00756e] font-semibold text-[11px] border border-[#a2e3de]"
                  >
                    {cond}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500">No chronic conditions listed</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-gray-600 border-t border-gray-100">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Allergies</span>
                <span className="font-medium text-gray-800">
                  {medicalHistory.noKnownAllergies
                    ? 'None'
                    : medicalHistory.specificAllergen || (medicalHistory.allergyType ? `Allergic (${medicalHistory.allergyType})` : 'None')}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase font-bold">Current Meds</span>
                <span className="font-medium text-gray-800">
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
                className="px-3 py-1 rounded-full bg-[#0a7075] text-white text-xs font-semibold"
              >
                Complete Intake
              </button>
            )}
          </div>
        )}
      </div>

      {/* Recent Documents */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Recent documents</h2>
          {documents.length > 0 && (
            <button
              onClick={onOpenSampleReport}
              className="text-xs font-medium text-[#0a7075] hover:underline"
            >
              View all ({documents.length})
            </button>
          )}
        </div>

        {documents.length === 0 ? (
          <div className="p-5 bg-white rounded-2xl border border-[#e2efef] text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center mx-auto">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-gray-800">No documents analyzed yet</h3>
            <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
              Upload a lab report or prescription above to see plain-English explanations with MedlinePlus citations.
            </p>
          </div>
        ) : (
          documents.slice(0, 4).map((doc) => (
            <div
              key={doc.id}
              onClick={() => onSelectDocument(doc)}
              className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#e2efef] hover:border-[#b5e3df] hover:shadow-xs cursor-pointer transition-all active:scale-99"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center">
                  {doc.type === 'lab' ? (
                    <FileSpreadsheet className="w-5 h-5" />
                  ) : doc.type === 'prescription' ? (
                    <Pill className="w-5 h-5" />
                  ) : doc.type === 'imaging' ? (
                    <Scan className="w-5 h-5" />
                  ) : (
                    <ClipboardList className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{doc.title}</h3>
                  <p className="text-xs text-gray-500">{doc.date} • {doc.provider || doc.category}</p>
                  {doc.badgeText && (
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
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
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))
        )}
      </div>

      {/* Safety Disclaimer Notice */}
      <div className="rounded-2xl border border-dashed border-[#a2e3de] bg-[#f0faf9]/80 p-3.5 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
        <p className="text-[11.5px] text-gray-600 leading-relaxed">
          <strong className="text-gray-800">MediLens AI is not a diagnosis tool.</strong> We help you understand your doctor's records so you can communicate clearly with healthcare professionals and never miss important guidance.
        </p>
      </div>
    </div>
  );
};
