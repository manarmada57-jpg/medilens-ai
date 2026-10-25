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
  CheckCircle2,
  PhoneCall,
  Activity,
} from 'lucide-react';
import { HealthDocument, MedicalHistory, UserProfile } from '../types';
import { SelfCareScreen } from './SelfCareScreen';

interface DesktopHistoryScreenProps {
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

export const DesktopHistoryScreen: React.FC<DesktopHistoryScreenProps> = ({
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
    <div className="space-y-6">
      {/* ── Subtab Controller Pills (Full Width Segmented Control) ────────── */}
      <div className="bg-white rounded-2xl p-1.5 border border-[#d8ecea] shadow-xs flex items-center gap-2 max-w-xl">
        <button
          onClick={() => setSubTab('records')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all ${
            subTab === 'records'
              ? 'bg-[#0a7075] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#0a7075] hover:bg-[#f0faf9]'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Medical Profile & Records</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              subTab === 'records' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => setSubTab('selfcare')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-extrabold transition-all ${
            subTab === 'selfcare'
              ? 'bg-[#0a7075] text-white shadow-xs'
              : 'text-gray-600 hover:text-[#0a7075] hover:bg-[#f0faf9]'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>AI Self-Care Guide</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              subTab === 'selfcare' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            Personalized
          </span>
        </button>
      </div>

      {/* ── 2-Column Desktop Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── Left Sidebar (4 cols): Patient Passport ─────────────────────── */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-[#d8ecea] shadow-xs space-y-4">
            {/* Demographic Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0a7075] to-[#14b8a6] text-white flex items-center justify-center font-extrabold text-base shadow-xs">
                  {profile.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-gray-900">{profile.name} Mitchell</h3>
                  <p className="text-[11px] text-gray-500">
                    DOB: {effectiveDob} • Sex: {effectiveSex}
                  </p>
                </div>
              </div>

              <button
                onClick={onEditMedicalHistory}
                title="Edit Intake Information"
                className="w-8 h-8 rounded-lg bg-[#e0f7f6] text-[#0a7075] hover:bg-[#cbebe8] flex items-center justify-center transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            {/* Intake Verification Badge */}
            <div className="flex items-center gap-2 bg-[#f0fdf4] border border-[#bbf7d0] px-3 py-2 rounded-xl text-xs text-[#166534]">
              <ShieldCheck className="w-4 h-4 text-[#16a34a] shrink-0" />
              <div className="text-[11px] leading-tight">
                <span className="font-bold">Clinical Intake Verified</span>
                <span className="block text-gray-500 font-normal">Synced with patient records</span>
              </div>
            </div>

            {/* Diagnosed Conditions */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Chronic Health Conditions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {effectiveConditions.map((cond, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-[#e0f7f6] text-[#0a7075] font-bold text-xs border border-[#a2e3de]"
                  >
                    {cond}
                  </span>
                ))}
              </div>
            </div>

            {/* Active Medications List */}
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                Active Medications
              </span>
              <div className="space-y-1.5">
                {effectiveMedicines.map((med, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                  >
                    <span className="font-bold text-gray-800">{med.name}</span>
                    <span className="text-gray-500 font-medium">{med.dosage}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Allergies & Surgeries */}
            <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
              <div>
                <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                  Allergies:
                </span>
                <span className="text-gray-600 font-medium">{effectiveAllergies}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                  Surgical / Orthopedic History:
                </span>
                <span className="text-gray-600 font-medium">{effectiveSurgeries}</span>
              </div>
            </div>

            {/* Caregiver Emergency Contact */}
            <div className="p-3 bg-[#f8fafc] rounded-xl border border-gray-100 text-xs space-y-1">
              <span className="font-bold text-gray-700 block text-[11px] uppercase tracking-wider">
                Emergency Caregiver
              </span>
              <p className="text-gray-600">{profile.caregiverName} (Son)</p>
              <div className="flex items-center gap-1 text-[11px] text-[#0a7075] font-semibold">
                <PhoneCall className="w-3 h-3" /> +1 (555) 019-2834
              </div>
            </div>

            {/* Update History Button */}
            <button
              onClick={onEditMedicalHistory}
              className="w-full py-2.5 px-4 rounded-xl border border-[#a2e3de] bg-[#f0faf9] hover:bg-[#e0f7f6] text-[#0a7075] font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Medical Intake</span>
            </button>
          </div>
        </div>

        {/* ── Right Content Area (8 cols) ─────────────────────────────────── */}
        <div className="lg:col-span-8">
          {subTab === 'records' ? (
            <div className="space-y-6">
              {/* Search & Filter Header */}
              <div className="bg-white rounded-2xl p-5 border border-[#d8ecea] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">Medical Records & Documents</h2>
                    <p className="text-xs text-gray-500">
                      All lab panels, prescriptions, and physician notes indexed and translated
                    </p>
                  </div>
                  <button
                    onClick={onNavigateToUpload}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0a7075] hover:bg-[#085a5e] text-white text-xs font-bold transition-all shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Upload Record</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Search documents by test name, clinic, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:border-[#0a7075] focus:ring-1 focus:ring-[#0a7075]"
                  />
                </div>

                {/* Filter Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Documents' },
                    { id: 'lab', label: 'Lab Reports' },
                    { id: 'prescription', label: 'Prescriptions' },
                    { id: 'imaging', label: 'Imaging / X-Rays' },
                    { id: 'note', label: 'Clinical Notes' },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setSelectedCategory(chip.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedCategory === chip.id
                          ? 'bg-[#0a7075] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document List */}
              <div className="space-y-3">
                {filteredDocuments.length === 0 ? (
                  <div className="bg-white rounded-2xl p-8 border border-[#d8ecea] text-center space-y-2">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                    <p className="text-sm font-bold text-gray-700">No documents match your query</p>
                    <p className="text-xs text-gray-400">Try adjusting your filters or upload a new report</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => onSelectDocument(doc)}
                      className="bg-white rounded-2xl p-4 border border-[#d8ecea] hover:border-[#a2e3de] hover:shadow-xs cursor-pointer transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-[#e0f7f6] flex items-center justify-center shrink-0">
                          {getDocIcon(doc.type)}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#0a7075] transition-colors">
                            {doc.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {doc.date} • {doc.provider}
                          </p>
                          <div className="mt-1.5">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                                doc.badgeType === 'warning'
                                  ? 'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]'
                                  : doc.badgeType === 'active'
                                  ? 'bg-[#e0f7f6] text-[#00756e] border-[#a2e3de]'
                                  : 'bg-[#e0f2fe] text-[#0369a1] border-[#bae6fd]'
                              }`}
                            >
                              {doc.badgeText}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#0a7075] opacity-0 group-hover:opacity-100 transition-opacity">
                          Read plain translation
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#0a7075] transition-colors" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Render AI Self-Care Guide Component */
            <div className="bg-white rounded-2xl border border-[#d8ecea] p-6 shadow-xs">
              <SelfCareScreen
                onBack={() => setSubTab('records')}
                fontSize={fontSize}
                onCycleFontSize={onCycleFontSize}
                onNavigateToUpload={onNavigateToUpload}
                initialCondition={
                  effectiveConditions[0]?.toLowerCase().includes('migraine')
                    ? 'migraine'
                    : effectiveConditions[0]?.toLowerCase().includes('diabetes')
                    ? 'diabetes'
                    : 'migraine'
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
