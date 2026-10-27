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
} from 'lucide-react';
import { DiagnosticStep, HealthDocument, SkinAnalysisResult } from '../types';
import { documentsApi, skinApi } from '../api';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(initialFile);
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pipelineSteps, setPipelineSteps] = useState<DiagnosticStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [unclearItems, setUnclearItems] = useState<string[]>([]);
  const [analyzedDoc, setAnalyzedDoc] = useState<HealthDocument | null>(null);

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

  const startAnalysis = async (file: File, selectedMode: 'report' | 'prescription' | 'image') => {
    // Validate file size (20 MB limit)
    if (file.size > 20 * 1024 * 1024) {
      setError('File exceeds the 20 MB size limit. Please upload a smaller document.');
      return;
    }

    setAnalyzing(true);
    setProgress(15);
    setPipelineSteps([
      { id: 1, title: 'Uploading securely', description: 'Removed EXIF metadata & encrypted transmission', status: 'active', tag: 'Active' },
      { id: 2, title: 'Extracting text & values', description: 'Optical character recognition (OCR)', status: 'pending' },
      { id: 3, title: 'Safety check', description: 'Adversarial protection & emergency scanner', status: 'pending' },
      { id: 4, title: 'Validating printed ranges', description: 'Cross-referencing laboratory intervals', status: 'pending' },
      { id: 5, title: 'Writing plain explanation', description: 'Grounding in MedlinePlus & NIH knowledge', status: 'pending' },
    ]);

    try {
      if (selectedMode === 'image') {
        const skinResult = await skinApi.analyzeSkin(file);
        setPipelineSteps((steps) => steps.map((s) => ({ ...s, status: 'done', tag: 'Done' })));
        if (onViewSkinResult) {
          onViewSkinResult(skinResult);
        } else {
          onBack();
        }
        return;
      }

      const result = await documentsApi.analyzeDocument(file, {
        kind: selectedMode === 'prescription' ? 'prescription' : 'report',
      });

      const completedDoc = result as HealthDocument;
      setProgress(100);
      setPipelineSteps((steps) => steps.map((s) => ({ ...s, status: 'done', tag: 'Done' })));
      setAnalyzedDoc(completedDoc);

      if (completedDoc.unclearItems && completedDoc.unclearItems.length > 0) {
        setUnclearItems(completedDoc.unclearItems);
      } else {
        onViewCompletedDocument(completedDoc);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
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
            <button
              onClick={handleRetake}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-lg transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
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

          {/* Clarity Warning Card (if faint/unclear text detected) */}
          {unclearItems.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">Photo Clarity Check</h4>
                  <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
                    Certain sections could not be verified with 100% confidence:
                  </p>
                  <ul className="list-disc list-inside text-xs text-amber-800 mt-1 space-y-0.5">
                    {unclearItems.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="px-3 py-1.5 bg-white border border-amber-300 text-amber-900 text-xs font-bold rounded-lg hover:bg-amber-100 transition-all"
                >
                  Retake Photo
                </button>
                <button
                  type="button"
                  onClick={handleContinueAnyway}
                  className="px-3 py-1.5 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-all flex items-center gap-1"
                >
                  <span>Continue Anyway</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
