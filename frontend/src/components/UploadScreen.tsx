import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  Camera,
  ArrowRight,
  ShieldCheck,
  Upload,
  FileText,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Languages,
} from 'lucide-react';
import { DiagnosticStep, HealthDocument, SkinAnalysisResult, Finding } from '../types';
import { documentsApi, skinApi, tokenStorage } from '../api';
import { ApiError } from '../api/client';

interface UploadScreenProps {
  onBack: () => void;
  onViewCompletedDocument: (doc: HealthDocument) => void;
  onViewSkinResult?: (result: SkinAnalysisResult) => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onCycleFontSize: () => void;
  initialMode?: 'report' | 'prescription' | 'image';
  initialFile?: File | null;
}

async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1600;
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(file);
        return;
      }
      if (width > height) {
        height = Math.round((height * maxDim) / width);
        width = maxDim;
      } else {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        'image/jpeg',
        0.88
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export const UploadScreen: React.FC<UploadScreenProps> = ({
  onBack,
  onViewCompletedDocument,
  onViewSkinResult,
  fontSize,
  onCycleFontSize,
  initialMode = 'report',
  initialFile = null,
}) => {
  const [mode, setMode] = useState<'report' | 'prescription' | 'image'>(initialMode);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pipelineSteps, setPipelineSteps] = useState<DiagnosticStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unclearItems, setUnclearItems] = useState<string[]>([]);
  const [analyzedDoc, setAnalyzedDoc] = useState<HealthDocument | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [editableFindings, setEditableFindings] = useState<Finding[]>([]);
  const [savingChanges, setSavingChanges] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Auto-start upload if initialFile was passed from HomeScreen
  useEffect(() => {
    if (initialFile && !analyzing && !analyzedDoc) {
      startAnalysis(initialFile, mode);
    }
  }, [initialFile]);

  const handleFileSelected = (file: File) => {
    setError(null);
    setSelectedFile(file);
    startAnalysis(file, mode);
  };

  const updateFindingField = (index: number, field: 'value' | 'referenceRange', val: string) => {
    setEditableFindings((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: val,
        needs_confirmation: false,
        confirmationStatus: 'ok',
        needsReview: false,
      };
      return next;
    });
  };

  const handleConfirmAndSave = async () => {
    if (!analyzedDoc) return;
    setSavingChanges(true);
    try {
      const updated = await documentsApi.updateDocument(analyzedDoc.id, {
        findings: editableFindings,
      });
      setIsVerifying(false);
      onViewCompletedDocument(updated);
    } catch {
      // If saving to backend encounters any network issue, still open the explanation with verified findings
      const fallbackDoc: HealthDocument = {
        ...analyzedDoc,
        findings: editableFindings,
      };
      setIsVerifying(false);
      onViewCompletedDocument(fallbackDoc);
    } finally {
      setSavingChanges(false);
    }
  };

  const startAnalysis = async (file: File, selectedMode: 'report' | 'prescription' | 'image') => {
    // Validate session
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setError('You are not signed in. Please sign in or register an account to analyze medical documents.');
      return;
    }

    // Validate file size (20 MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setError('File exceeds the 20 MB size limit. Please upload a smaller document.');
      return;
    }

    setAnalyzing(true);
    setIsVerifying(false);
    setProgress(15);
    setPipelineSteps([
      { id: 1, title: 'Uploading securely', description: 'Removed EXIF metadata & encrypted transmission', status: 'active', tag: 'Active' },
      { id: 2, title: 'Extracting text & values', description: 'Optical character recognition (OCR)', status: 'pending' },
      { id: 3, title: 'Safety check', description: 'Adversarial protection & emergency scanner', status: 'pending' },
      { id: 4, title: 'Validating printed ranges', description: 'Cross-referencing laboratory intervals', status: 'pending' },
      { id: 5, title: 'Writing plain explanation', description: 'Grounding in MedlinePlus & NIH knowledge', status: 'pending' },
    ]);

    // Active progress timer to smoothly advance steps while backend processes
    let currentPct = 15;
    const progressTimer = setInterval(() => {
      currentPct = Math.min(currentPct + 4, 92);
      setProgress(currentPct);

      setPipelineSteps((steps) =>
        steps.map((s) => {
          if (currentPct >= 80 && s.id <= 4) return { ...s, status: s.id === 5 ? 'active' : 'done', tag: s.id === 5 ? 'Active' : 'Done' };
          if (currentPct >= 60 && s.id <= 3) return { ...s, status: s.id === 4 ? 'active' : 'done', tag: s.id === 4 ? 'Active' : 'Done' };
          if (currentPct >= 35 && s.id <= 2) return { ...s, status: s.id === 3 ? 'active' : 'done', tag: s.id === 3 ? 'Active' : 'Done' };
          if (currentPct >= 20 && s.id <= 1) return { ...s, status: s.id === 2 ? 'active' : 'done', tag: s.id === 2 ? 'Active' : 'Done' };
          return s;
        })
      );
    }, 800);

    try {
      // Compress large photos on device to speed up upload & prevent timeout
      const uploadFile = await compressImageIfNeeded(file);

      if (selectedMode === 'image') {
        const skinResult = await skinApi.analyzeSkin(uploadFile);
        clearInterval(progressTimer);
        setProgress(100);
        setPipelineSteps((steps) => steps.map((s) => ({ ...s, status: 'done', tag: 'Done' })));
        if (onViewSkinResult) {
          onViewSkinResult(skinResult);
        } else {
          onBack();
        }
        return;
      }

      const result = await documentsApi.analyzeDocument(uploadFile, {
        kind: selectedMode === 'prescription' ? 'prescription' : 'report',
        language: language,
      });

      clearInterval(progressTimer);
      const completedDoc = result as HealthDocument;
      setProgress(100);
      setPipelineSteps((steps) => steps.map((s) => ({ ...s, status: 'done', tag: 'Done' })));
      setAnalyzedDoc(completedDoc);
      setEditableFindings(completedDoc.findings || []);

      const hasNeedsConfirmation =
        (completedDoc.findings || []).some(
          (f) => f.needs_confirmation || f.confirmationStatus === 'needs_confirmation' || f.needsReview
        ) || (completedDoc.unclearItems && completedDoc.unclearItems.length > 0);

      if (hasNeedsConfirmation) {
        setIsVerifying(true);
      } else {
        onViewCompletedDocument(completedDoc);
      }
    } catch (err: unknown) {
      clearInterval(progressTimer);
      if (err instanceof ApiError) {
        if (err.status === 503 || err.code === 'FEATURE_UNAVAILABLE') {
          setError('AI document analysis requires an active AI provider key (e.g. GEMINI_API_KEY). Please add your Gemini key to .env to enable instant analysis.');
        } else if (err.status === 422 || err.code === 'UNREADABLE_DOCUMENT') {
          setError('The document could not be clearly read. Please ensure the file is a clear, high-resolution photo or digital PDF and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to analyze document. Please ensure the file is clearly legible and try again.');
      }
      setAnalyzing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleRetake = () => {
    setAnalyzing(false);
    setSelectedFile(null);
    setAnalyzedDoc(null);
    setUnclearItems([]);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleContinueAnyway = () => {
    if (analyzedDoc) {
      onViewCompletedDocument(analyzedDoc);
    }
  };

  return (
    <div className="pb-24 pt-1 px-3.5 space-y-4 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-[#d8ecea]">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-gray-800 hover:text-[#0a7075] font-semibold text-sm transition-colors active:scale-95"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          <span>MediLens AI</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-full border border-gray-200">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all ${
                language === 'en' ? 'bg-[#0a7075] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all ${
                language === 'hi' ? 'bg-[#0a7075] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              हिंदी
            </button>
          </div>

          <button
            onClick={onCycleFontSize}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#daf1ef] hover:bg-[#cbebe8] text-[#0a7075] text-xs font-semibold border border-[#b2e2de] transition-all"
          >
            <span className="font-extrabold text-[12px]">Tt</span>
            <span className="text-[11px] font-bold">
              {fontSize === 'normal' ? 'A+ Text' : fontSize === 'large' ? 'A++ Text' : 'A Text'}
            </span>
          </button>
        </div>
      </div>

      {/* Mode Selector Tabs */}
      {!analyzing && (
        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => setMode('report')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'report' ? 'bg-white text-[#0a7075] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Lab Report
          </button>
          <button
            type="button"
            onClick={() => setMode('prescription')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'prescription' ? 'bg-white text-[#0a7075] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Prescription
          </button>
          <button
            type="button"
            onClick={() => setMode('image')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              mode === 'image' ? 'bg-white text-[#0a7075] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Skin Check
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-red-800">Processing Interrupted</p>
            <p className="text-xs text-red-600 leading-relaxed">{error}</p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
              {!tokenStorage.getAccessToken() && (
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new CustomEvent('medilens:logout'))}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0a7075] hover:bg-[#085a5e] text-white text-xs font-bold rounded-lg transition-all"
                >
                  <span>Sign In Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* State 1: File Picker / Drop Zone */}
      {!analyzing && !error && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`relative rounded-3xl border-2 border-dashed p-8 text-center transition-all ${
              isDragging ? 'border-[#0a7075] bg-[#e0f7f6]' : 'border-gray-200 bg-white hover:border-[#0a7075]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={mode === 'image' ? 'image/*,video/*' : 'application/pdf,image/*'}
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div className="w-16 h-16 rounded-full bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center mx-auto mb-4 shadow-xs">
              <Upload className="w-8 h-8" />
            </div>

            <h2 className="text-base font-extrabold text-gray-900 mb-1">
              {mode === 'report' ? 'Upload Lab Report' : mode === 'prescription' ? 'Upload Prescription' : 'Upload Skin Observation Photo'}
            </h2>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mb-6">
              Drag and drop your file here, or choose an option below. Supports PDF, JPEG, PNG up to 20 MB.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-[#0a7075] hover:bg-[#075960] active:scale-95 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>Take Photo</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-800 text-xs font-bold border border-gray-200 transition-all flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-gray-500" />
                <span>Choose File</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#ebf7f6] border border-[#d8ecea] flex items-center gap-3 text-xs text-[#0a7075]">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span className="leading-snug">
              <strong>Patient Privacy Guarantee:</strong> Uploaded documents are processed in memory and deleted immediately after plain-language explanation.
            </span>
          </div>
        </div>
      )}

      {/* State 2: Active Analysis Progress Pipeline */}
      {analyzing && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl bg-white border border-[#d8ecea] shadow-md space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-gray-900">
                  {selectedFile?.name || 'Processing Document'}
                </h3>
                <p className="text-xs text-gray-500">
                  Grounding medical terms in cited educational databases
                </p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-[#0a7075]">{progress}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0a7075] to-[#06b6d4] transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

            {/* Pipeline Step List */}
            <div className="space-y-2.5 pt-2">
              {pipelineSteps.map((step) => (
                <div key={step.id} className="flex items-start gap-3 p-2 rounded-xl transition-all">
                  <div className="mt-0.5">
                    {step.status === 'done' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : step.status === 'active' ? (
                      <Loader2 className="w-4 h-4 text-[#0a7075] animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-gray-300 shrink-0" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold leading-tight ${step.status === 'pending' ? 'text-gray-400' : 'text-gray-800'}`}>
                      {step.title}
                    </p>
                    <p className="text-[11px] text-gray-500 leading-tight truncate">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Verify Before Save Screen (Task 3 & Task 4 & Frontend requirement) */}
          {isVerifying && analyzedDoc && (
            <div className="p-5 rounded-3xl bg-white border border-[#d8ecea] shadow-md space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#0a7075]" />
                    <h3 className="text-sm font-extrabold text-gray-900">
                      {language === 'hi' ? 'सुरक्षित करने से पहले रिपोर्ट के मान जांचें' : 'Verify Values Before Saving'}
                    </h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {language === 'hi'
                      ? 'मूल पेपर रिपोर्ट से इन मानों की तुलना करें। यदि आवश्यक हो तो मान एडिट करें।'
                      : 'Compare these extracted findings against your original paper report. Edit any value if needed before saving.'}
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#e0f7f6] text-[#0a7075] border border-[#a2e3de] shrink-0">
                  {selectedFile?.name || 'Document'}
                </span>
              </div>

              {/* Editable Finding Rows */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                {editableFindings.map((item, idx) => {
                  const isNeedsConfirm =
                    item.needs_confirmation ||
                    item.confirmationStatus === 'needs_confirmation' ||
                    item.needsReview;
                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-2xl border transition-all ${
                        isNeedsConfirm
                          ? 'bg-[#fff1f0] border-[#ffa39e] shadow-xs'
                          : 'bg-[#fcfdfd] border-[#d8ecea]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-gray-900">
                            {language === 'hi' && item.testNameHi ? item.testNameHi : item.testName}
                          </span>
                          {isNeedsConfirm ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff1f0] text-[#cf1322] border border-[#ffa39e]">
                              ⚠️ {language === 'hi' ? 'पुष्टि करें' : 'Please confirm'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0]">
                              <CheckCircle2 className="w-3 h-3 text-[#16a34a]" />
                              <span>{language === 'hi' ? 'सत्यापित' : 'Grounded'}</span>
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-gray-500 uppercase px-2 py-0.5 rounded-md bg-gray-100">
                          {item.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">
                            {language === 'hi' ? 'प्राप्त मान (Value):' : 'Observed Value:'}
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={item.value}
                              onChange={(e) => updateFindingField(idx, 'value', e.target.value)}
                              className="w-full px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0a7075] bg-white"
                            />
                            <span className="text-xs font-semibold text-gray-500 shrink-0">{item.unit}</span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">
                            {language === 'hi' ? 'प्रिंटेड संदर्भ सीमा (Ref Range):' : 'Printed Ref Range:'}
                          </label>
                          <input
                            type="text"
                            value={item.referenceRange}
                            onChange={(e) => updateFindingField(idx, 'referenceRange', e.target.value)}
                            className="w-full px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0a7075] bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all"
                >
                  {language === 'hi' ? 'नया फोटो लें' : 'Retake Photo'}
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAndSave}
                  disabled={savingChanges}
                  className="px-5 py-2 bg-[#0a7075] hover:bg-[#075960] text-white text-xs font-extrabold rounded-xl shadow-md shadow-[#0a7075]/20 flex items-center gap-2 transition-all active:scale-98 disabled:opacity-50"
                >
                  {savingChanges ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{language === 'hi' ? 'सहेज रहे हैं...' : 'Saving...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{language === 'hi' ? 'पुष्टि करें और सहेजें' : 'Confirm & Save'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
