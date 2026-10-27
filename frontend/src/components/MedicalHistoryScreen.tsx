import React, { useState, useRef } from 'react';
import {
  Heart,
  ShieldCheck,
  Calendar,
  AlertTriangle,
  Pill,
  FileText,
  UploadCloud,
  Info,
  ArrowRight,
  Plus,
  X,
} from 'lucide-react';
import { MedicalHistory } from '../types';

interface MedicalHistoryScreenProps {
  initialData?: MedicalHistory | null;
  onSave: (data: MedicalHistory) => void;
  onSkip: () => void;
}

export const MedicalHistoryScreen: React.FC<MedicalHistoryScreenProps> = ({
  initialData,
  onSave,
  onSkip,
}) => {
  // Form states
  const [dob, setDob] = useState(initialData?.dob || '');
  const [sex, setSex] = useState<MedicalHistory['sex'] | string>(initialData?.sex || '');
  const [conditions, setConditions] = useState<string[]>(
    initialData?.conditions ?? []
  );
  const [allergyType, setAllergyType] = useState<'medicine' | 'food' | 'other' | ''>(
    initialData?.allergyType || ''
  );
  const [noKnownAllergies, setNoKnownAllergies] = useState(
    initialData?.noKnownAllergies ?? false
  );
  const [specificAllergen, setSpecificAllergen] = useState(
    initialData?.specificAllergen || ''
  );

  // Medicines list
  const [medicines, setMedicines] = useState<{ name: string; dosage: string }[]>(
    initialData?.currentMedicines ?? []
  );
  const [medNameInput, setMedNameInput] = useState('');
  const [medDosageInput, setMedDosageInput] = useState('');

  // Past surgeries
  const [pastSurgeries, setPastSurgeries] = useState(initialData?.pastSurgeries || '');

  // Uploaded files
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(
    initialData?.uploadedFiles ?? []
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableConditions = [
    'Diabetes',
    'High blood pressure',
    'Asthma',
    'Heart condition',
    'Other',
    'None',
  ];

  const toggleCondition = (item: string) => {
    if (item === 'None') {
      if (conditions.includes('None')) {
        setConditions([]);
      } else {
        setConditions(['None']);
      }
      return;
    }

    setConditions((prev) => {
      const filtered = prev.filter((c) => c !== 'None');
      if (filtered.includes(item)) {
        return filtered.filter((c) => c !== item);
      } else {
        return [...filtered, item];
      }
    });
  };

  const handleAddMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medNameInput.trim()) return;
    setMedicines((prev) => [
      ...prev,
      {
        name: medNameInput.trim(),
        dosage: medDosageInput.trim() || 'Standard dose',
      },
    ]);
    setMedNameInput('');
    setMedDosageInput('');
  };

  const handleRemoveMedicine = (idx: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((f) => f.name);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (idx: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    onSave({
      dob,
      sex: (sex as MedicalHistory['sex']) || undefined,
      conditions,
      allergyType,
      noKnownAllergies,
      specificAllergen,
      currentMedicines: medicines,
      pastSurgeries,
      uploadedFiles,
    });
  };

  return (
    <div className="min-h-screen bg-[#e8f6f5] py-6 px-3 sm:px-6 flex flex-col justify-center items-center relative overflow-hidden font-sans">
      {/* Decorative leaf watermarks matching mockup */}
      <div className="pointer-events-none absolute -top-12 -right-12 w-64 h-64 text-[#a3d9d3] opacity-25">
        <svg viewBox="0 0 200 200" fill="currentColor">
          <path d="M40,160 Q80,40 160,20 Q120,120 40,160 Z" />
          <path d="M70,180 Q100,70 180,50 Q140,140 70,180 Z" />
        </svg>
      </div>
      <div className="pointer-events-none absolute -bottom-16 -left-16 w-72 h-72 text-[#a3d9d3] opacity-25">
        <svg viewBox="0 0 200 200" fill="currentColor">
          <path d="M160,40 Q120,160 40,180 Q80,80 160,40 Z" />
          <path d="M130,20 Q100,130 20,150 Q60,60 130,20 Z" />
        </svg>
      </div>

      {/* Main Card Container */}
      <div className="w-full max-w-4xl bg-white rounded-[28px] p-5 sm:p-8 shadow-xl border border-[#d6ebe8] relative z-10 space-y-6">
        {/* Top Header Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold text-[#0a7075] uppercase tracking-wide">
              Step 1 of 3 — Your health profile
            </span>
            <div className="flex items-center gap-2 mt-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Let's get to know your health
              </h1>
              <span className="text-[#0a7075] inline-flex">
                <Heart className="w-6 h-6 stroke-[2.2] text-[#0a7075] fill-[#0a7075]/15" />
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Share only what you're comfortable sharing. This helps us organize your health information.
            </p>
          </div>

          {/* Privacy badge */}
          <div className="self-start md:self-auto shrink-0 flex items-center gap-2.5 rounded-2xl bg-[#e6f7f4] border border-[#bfe7e2] px-4 py-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#0a7075] text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-gray-900 leading-tight">
                Your health information is private.
              </div>
              <div className="text-[11px] text-gray-600 leading-none mt-0.5">
                You control what you share.
              </div>
            </div>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="flex items-center justify-between max-w-xl mx-auto pt-1 pb-2">
          {/* Step 1 */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#0a7075] text-white flex items-center justify-center text-xs font-bold shadow-xs">
              1
            </div>
            <span className="text-xs font-bold text-[#0a7075]">Basic Details</span>
          </div>

          <div className="h-0.5 flex-1 bg-[#0a7075] mx-3"></div>

          {/* Step 2 */}
          <div className="flex items-center gap-2 opacity-60">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold">
              2
            </div>
            <span className="text-xs font-medium text-gray-600">Medical History</span>
          </div>

          <div className="h-0.5 flex-1 bg-gray-200 mx-3"></div>

          {/* Step 3 */}
          <div className="flex items-center gap-2 opacity-60">
            <div className="w-7 h-7 rounded-full border-2 border-gray-300 text-gray-600 flex items-center justify-center text-xs font-semibold">
              3
            </div>
            <span className="text-xs font-medium text-gray-600">Reports</span>
          </div>
        </div>

        {/* 2-Column Grid of Form Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Date of Birth */}
          <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-2xs space-y-2.5 hover:border-[#b2e2de] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 leading-tight">
                  Date of Birth <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Helps us provide more accurate insights.</p>
              </div>
            </div>

            <div className="relative pt-1">
              <input
                type="text"
                placeholder="DD / MM / YYYY"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075] focus:border-transparent transition-all"
              />
              <Calendar className="w-4 h-4 text-gray-400 absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          {/* Card 2: Sex assigned at birth */}
          <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-2xs space-y-2.5 hover:border-[#b2e2de] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="5" />
                  <path d="M12 13v8" />
                  <path d="M9 18h6" />
                </svg>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 leading-tight">
                  Sex assigned at birth <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Used for better health recommendations.</p>
              </div>
            </div>

            <div className="pt-1">
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075] focus:border-transparent bg-white transition-all cursor-pointer"
              >
                <option value="">Select option</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="intersex">Intersex</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Card 3: Known Medical Conditions */}
          <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-2xs space-y-2.5 hover:border-[#b2e2de] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ccfbf1] text-[#0f766e] flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 leading-tight">
                  Known Medical Conditions <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Select all that apply. If none, choose "None".
                </p>
              </div>
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2 pt-1">
              {availableConditions.map((cond) => {
                const isSelected = conditions.includes(cond);
                return (
                  <button
                    key={cond}
                    type="button"
                    onClick={() => toggleCondition(cond)}
                    className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                      isSelected
                        ? 'bg-[#e0f7f6] border border-[#0a7075] text-[#0a7075] font-bold shadow-2xs'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {cond}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card 4: Allergies */}
          <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-2xs space-y-2.5 hover:border-[#b2e2de] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ede9fe] text-[#6366f1] flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 leading-tight">
                  Allergies <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Select type and specify (if known).</p>
              </div>
            </div>

            {/* Type selector chips + No allergies checkbox */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {(['medicine', 'food', 'other'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setAllergyType(allergyType === type ? '' : type);
                    setNoKnownAllergies(false);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs capitalize transition-all ${
                    allergyType === type && !noKnownAllergies
                      ? 'bg-[#e0f7f6] border border-[#0a7075] text-[#0a7075] font-semibold'
                      : 'border border-gray-200 text-gray-700 bg-white hover:border-gray-300'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full border ${
                      allergyType === type && !noKnownAllergies
                        ? 'bg-[#0a7075] border-[#0a7075]'
                        : 'border-gray-400'
                    }`}
                  ></span>
                  <span>{type}</span>
                </button>
              ))}

              <label className="inline-flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer ml-1">
                <input
                  type="checkbox"
                  checked={noKnownAllergies}
                  onChange={(e) => {
                    setNoKnownAllergies(e.target.checked);
                    if (e.target.checked) {
                      setAllergyType('');
                      setSpecificAllergen('');
                    }
                  }}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-[#0a7075] focus:ring-[#0a7075]"
                />
                <span>No known allergies</span>
              </label>
            </div>

            {/* Specify Allergen */}
            <div>
              <input
                type="text"
                disabled={noKnownAllergies}
                placeholder="Specify allergen (e.g., penicillin, peanuts, etc.)"
                value={specificAllergen}
                onChange={(e) => setSpecificAllergen(e.target.value)}
                className={`w-full px-3.5 py-2 rounded-xl border text-xs focus:outline-none transition-all ${
                  noKnownAllergies
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'border-gray-200 text-gray-900 focus:ring-2 focus:ring-[#0a7075]'
                }`}
              />
            </div>
          </div>

          {/* Card 5: Current Medicines (Span 2) */}
          <div className="md:col-span-2 rounded-2xl border border-[#e2efef] bg-white p-4 shadow-2xs space-y-3 hover:border-[#b2e2de] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#dbeafe] text-[#2563eb] flex items-center justify-center shrink-0">
                <Pill className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 leading-tight">
                  Current Medicines <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Add the medicines you are currently taking.
                </p>
              </div>
            </div>

            {/* Input Row */}
            <form onSubmit={handleAddMedicine} className="flex flex-col sm:flex-row gap-2 pt-1">
              <input
                type="text"
                placeholder="Medicine name (e.g., Paracetamol)"
                value={medNameInput}
                onChange={(e) => setMedNameInput(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
              />
              <input
                type="text"
                placeholder="Dosage (e.g., 500mg)"
                value={medDosageInput}
                onChange={(e) => setMedDosageInput(e.target.value)}
                className="sm:w-44 px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075]"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#007f87] hover:bg-[#006e75] text-white text-xs font-bold shadow-xs active:scale-98 transition-all shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add medicine</span>
              </button>
            </form>

            {/* Added Medicines List / Empty State */}
            <div className="pt-1">
              {medicines.length === 0 ? (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 text-gray-400 text-xs">
                  <FileText className="w-4 h-4" />
                  <span>No medicines added yet</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {medicines.map((med, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f0faf9] border border-[#a2e3de] text-xs text-gray-800"
                    >
                      <Pill className="w-3.5 h-3.5 text-[#0a7075]" />
                      <span className="font-semibold text-gray-900">{med.name}</span>
                      <span className="text-gray-500 text-[11px]">{med.dosage}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveMedicine(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors ml-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 6: Past Surgeries / Major Health Events */}
          <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-2xs space-y-2.5 hover:border-[#b2e2de] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#dcfce7] text-[#16a34a] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 leading-tight">
                  Past Surgeries / Major Health Events <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">e.g., surgery, hospitalization, or major illness.</p>
              </div>
            </div>

            <div className="pt-1 relative">
              <textarea
                rows={3}
                maxLength={500}
                placeholder="Enter details (if any)..."
                value={pastSurgeries}
                onChange={(e) => setPastSurgeries(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0a7075] resize-none"
              ></textarea>
              <span className="absolute bottom-2.5 right-3 text-[10px] text-gray-400">
                {pastSurgeries.length}/500
              </span>
            </div>
          </div>

          {/* Card 7: Add Existing Reports or Prescriptions */}
          <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-2xs space-y-2.5 hover:border-[#b2e2de] transition-colors">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#e0f2fe] text-[#0284c7] flex items-center justify-center shrink-0">
                <UploadCloud className="w-4 h-4 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-900 leading-tight">
                  Add existing reports or prescriptions <span className="text-gray-400 font-normal">(Optional)</span>
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Upload PDF, JPG or PNG files (max 10MB each).</p>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              multiple
              accept=".pdf,image/*"
              className="hidden"
            />

            {/* Dashed Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#b2e2de] rounded-xl p-3.5 text-center cursor-pointer hover:bg-[#f0faf9] transition-all bg-white"
            >
              <div className="mx-auto w-8 h-8 rounded-full bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center mb-1">
                <UploadCloud className="w-4 h-4" />
              </div>
              <p className="text-xs text-gray-700 font-medium">Drag & drop files here or</p>
              <button
                type="button"
                className="mt-1.5 px-3 py-1 rounded-full bg-[#007f87] text-white text-[11px] font-semibold hover:bg-[#006e75] transition-all"
              >
                Choose files
              </button>
              <p className="text-[10px] text-gray-400 mt-1">
                Supported formats: PDF, JPG, PNG | Max size: 10MB
              </p>
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div className="space-y-1 pt-1">
                {uploadedFiles.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-[#f0faf9] rounded-lg border border-[#cceee9] text-xs text-gray-700"
                  >
                    <span className="truncate max-w-[200px] text-[11px] font-medium">{f}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-gray-100">
          {/* Note */}
          <div className="flex items-start gap-2 max-w-md">
            <Info className="w-4 h-4 text-[#0284c7] shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <strong className="text-gray-700">Please don't guess or make up information.</strong> If you're unsure, you can leave fields blank. We focus on what you share, not what you don't.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors px-2 py-1"
            >
              Skip for now
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#007f87] hover:bg-[#006e75] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-[#007f87]/20 active:scale-98 transition-all"
            >
              <span>Save and continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
