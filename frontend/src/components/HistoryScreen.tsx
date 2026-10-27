import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Pill,
  Scan,
  ClipboardList,
  Calendar,
  AlertTriangle,
  Heart,
  ChevronRight,
  ShieldCheck,
  Edit3,
  Search,
  UploadCloud,
  Sparkles,
  BookOpen,
  ArrowRight,
  User,
  Info,
} from 'lucide-react';
import { HealthDocument, MedicalHistory, UserProfile } from '../types';
import { SelfCareScreen } from './SelfCareScreen';

interface HistoryScreenProps {
  profile: UserProfile;
  medicalHistory: MedicalHistory | null;
  documents: HealthDocument[];
  onSelectDocument: (doc: HealthDocument) => void;
  onEditMedicalHistory: () => void;
  onNavigateToUpload: () => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onCycleFontSize: () => void;
  initialSubTab?: 'records' | 'selfcare';
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  profile,
  medicalHistory,
  documents,
  onSelectDocument,
  onEditMedicalHistory,
  onNavigateToUpload,
  fontSize,
  onCycleFontSize,
  initialSubTab = 'records',
}) => {
  const [subTab, setSubTab] = useState<'records' | 'selfcare'>(initialSubTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'lab' | 'prescription' | 'imaging' | 'note'>('all');

  // Real profile values without fake hardcoded defaults
  const effectiveDob = medicalHistory?.dob || 'Not provided';
  const effectiveSex = medicalHistory?.sex || 'Not specified';
  const effectiveConditions = medicalHistory?.conditions || [];
  const effectiveMedicines = medicalHistory?.currentMedicines || [];
  const effectiveAllergies = medicalHistory?.noKnownAllergies
    ? 'No known allergies'
    : medicalHistory?.specificAllergen
    ? `${medicalHistory.specificAllergen} (${medicalHistory.allergyType || 'allergy'})`
    : 'None recorded';
  const effectiveSurgeries = medicalHistory?.pastSurgeries || 'None recorded';

  // Filter documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'all' || doc.type === selectedCategory;
    const matchesQuery =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const getDocIcon = (type: HealthDocument['type']) => {
    switch (type) {
      case 'lab':
        return <FileSpreadsheet className="w-5 h-5 text-[#0a7075]" />;
      case 'prescription':
        return <Pill className="w-5 h-5 text-[#1d4ed8]" />;
      case 'imaging':
        return <Scan className="w-5 h-5 text-[#0284c7]" />;
      case 'note':
        return <ClipboardList className="w-5 h-5 text-[#0f766e]" />;
    }
  };

  return (
    <div className="pb-24 pt-1 px-3.5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-[#d8ecea]">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            User History & Records
          </h1>
          <p className="text-[11px] text-gray-500">
            {profile.name} • Medical records & health intake
          </p>
        </div>

        <button
          onClick={onCycleFontSize}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#daf1ef] hover:bg-[#cbebe8] text-[#0a7075] text-xs font-semibold border border-[#b2e2de] transition-all"
        >
          <span className="font-extrabold text-[12px]">Tt</span>
          <span className="text-[11px] font-bold">
            {fontSize === 'normal' ? 'A+' : fontSize === 'large' ? 'A++' : 'A'}
          </span>
        </button>
      </div>

      {/* Segmented Controller (Records vs Self-Care Guide) */}
      <div className="flex rounded-2xl bg-[#daf1ef]/80 p-1 border border-[#bceae5]">
        <button
          onClick={() => setSubTab('records')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'records'
              ? 'bg-[#0a7075] text-white shadow-md shadow-[#0a7075]/25'
              : 'text-[#0a7075] hover:bg-white/60'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Medical Profile & Records</span>
        </button>

        <button
          onClick={() => setSubTab('selfcare')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${
            subTab === 'selfcare'
              ? 'bg-[#0a7075] text-white shadow-md shadow-[#0a7075]/25'
              : 'text-[#0a7075] hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>AI Self-Care Guide</span>
        </button>
      </div>

      {/* SUBTAB 1: MEDICAL PROFILE & RECORDS */}
      {subTab === 'records' ? (
        <div className="space-y-4">
          {/* Card 1: Medical History Shared Before Dashboard */}
          <div className="rounded-3xl border border-[#d6ebe8] bg-white p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center">
                  <User className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#dcfce7] text-[10px] font-bold text-[#15803d] border border-[#bbf7d0]">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Shared Before Dashboard</span>
                  </div>
                  <h2 className="text-base font-extrabold text-gray-900 leading-tight mt-0.5">
                    Patient Medical History
                  </h2>
                </div>
              </div>

              <button
                onClick={onEditMedicalHistory}
                title="Edit Health Intake"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#e6f7f6] hover:bg-[#daf1ef] text-[#0a7075] text-xs font-bold border border-[#b5e3df] transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>

            {/* Intake Details Grid */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-xs">
              <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Date of Birth & Sex
                </span>
                <span className="font-bold text-gray-800 text-[11.5px] mt-0.5 block">
                  {effectiveDob} • {effectiveSex === 'female' ? 'Female' : effectiveSex === 'male' ? 'Male' : effectiveSex}
                </span>
              </div>

              <div className="bg-[#f8fafc] p-2.5 rounded-xl border border-gray-100">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                  Allergies
                </span>
                <span className="font-bold text-gray-800 text-[11.5px] mt-0.5 block truncate" title={effectiveAllergies}>
                  {effectiveAllergies}
                </span>
              </div>
            </div>

            {/* Known Medical Conditions */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                Known Medical Conditions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {effectiveConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#e0f7f6] text-[#00756e] font-bold text-[11px] border border-[#a2e3de]"
                  >
                    <Heart className="w-3 h-3 text-[#0a7075]" />
                    <span>{cond}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Current Medications */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
                Current Prescriptions & Dosages
              </span>
              <div className="flex flex-wrap gap-1.5">
                {effectiveMedicines.map((med, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#e0f2fe] text-[#0369a1] font-semibold text-[11px] border border-[#bae6fd]"
                  >
                    <Pill className="w-3 h-3" />
                    <span>{med.name} {med.dosage}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Past Surgeries & Major Health Events */}
            <div className="bg-[#f0faf9] p-2.5 rounded-xl border border-[#cbebe8] text-xs">
              <span className="text-[10px] text-[#0a7075] font-bold uppercase tracking-wider block">
                Past Surgeries & Clinical Background
              </span>
              <p className="text-[11.5px] text-gray-700 mt-0.5 leading-snug">
                {effectiveSurgeries}
              </p>
            </div>
          </div>

          {/* Card 2: AI Clinical Context Match Banner */}
          <div className="rounded-2xl bg-gradient-to-r from-[#0c6b73] to-[#075960] p-4 text-white shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold tracking-wide">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>AI Clinical Understanding Match</span>
              </span>
            </div>
            <h3 className="text-sm font-bold">
              Personalized Self-Care Guide Ready
            </h3>
            <p className="text-xs text-[#d5f4f1] leading-relaxed">
              Based on your health profile, MediLens AI has prepared your <strong>personalized self-care</strong> protocol.
            </p>
            <button
              onClick={() => setSubTab('selfcare')}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0c6b73] shadow-sm hover:bg-[#f0faf9] transition-all"
            >
              <span>View Self-Care Guide</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card 3: Document History (Uploaded using website & onboarding) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-base font-bold text-gray-900 tracking-tight">
                  Document History
                </h2>
                <p className="text-[11px] text-gray-500">
                  {documents.length} medical reports & prescriptions analyzed
                </p>
              </div>

              <button
                onClick={onNavigateToUpload}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#0a7075] text-white text-xs font-bold shadow-xs hover:bg-[#07595e] transition-all"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>+ Upload</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search reports by name, doctor, or test..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 bg-white text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
              {[
                { id: 'all', label: 'All (12)' },
                { id: 'lab', label: 'Lab Reports' },
                { id: 'prescription', label: 'Prescriptions' },
                { id: 'imaging', label: 'Imaging / Scans' },
                { id: 'note', label: 'Doctor Notes' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id as any)}
                  className={`px-3 py-1 rounded-full whitespace-nowrap text-xs transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-[#0a7075] text-white font-bold shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Documents List */}
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => onSelectDocument(doc)}
                  className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#e2efef] hover:border-[#b5e3df] hover:shadow-xs cursor-pointer transition-all active:scale-99"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#e0f7f6] flex items-center justify-center shrink-0">
                      {getDocIcon(doc.type)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {doc.date} • {doc.provider}
                      </p>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                            doc.badgeType === 'warning'
                              ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'
                              : doc.badgeType === 'active'
                              ? 'bg-[#e0f7f6] text-[#00756e] border-[#a2e3de]'
                              : doc.badgeType === 'success'
                              ? 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]'
                              : 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          <span>{doc.badgeText}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* SUBTAB 2: AI PERSONALIZED SELF-CARE GUIDE */
        <SelfCareScreen
          onBack={() => setSubTab('records')}
          fontSize={fontSize}
          onCycleFontSize={onCycleFontSize}
        />
      )}
    </div>
  );
};
