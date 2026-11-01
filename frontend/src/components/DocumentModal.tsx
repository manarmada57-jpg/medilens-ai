import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Share2,
  ArrowRight,
  BookOpen,
  ShieldAlert,
  ExternalLink,
  MessageSquare,
  Send,
  Loader2,
  Pill,
  BookMarked,
  HeartPulse,
  Languages,
} from 'lucide-react';
import { HealthDocument, Source } from '../types';
import { documentsApi, ApiError } from '../api';

interface DocumentModalProps {
  document: HealthDocument | null;
  onClose: () => void;
  onOpenSelfCareGuide?: () => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({
  document,
  onClose,
  onOpenSelfCareGuide,
}) => {
  const [activeLang, setActiveLang] = useState<'en' | 'hi'>('en');
  const [copiedQuestionIndex, setCopiedQuestionIndex] = useState<number | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  // Ask question state
  const [userQuestion, setUserQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [qaList, setQaList] = useState<{ question: string; answer: string; sources: Source[] }[]>([]);

  // Sync active language when document opens
  useEffect(() => {
    if (document) {
      setActiveLang(document.language === 'hi' ? 'hi' : 'en');
    }
  }, [document]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!document) return null;

  const copyQuestion = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedQuestionIndex(index);
    setTimeout(() => setCopiedQuestionIndex(null), 2000);
  };

  const handleShare = async () => {
    setSharing(true);
    setShareError(null);
    try {
      await documentsApi.shareDocument(document.id);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2500);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setShareError(err.message);
      } else {
        setShareError('Sharing failed');
      }
      setTimeout(() => setShareError(null), 3500);
    } finally {
      setSharing(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userQuestion.trim() || asking) return;

    const q = userQuestion.trim();
    setUserQuestion('');
    setAsking(true);

    try {
      const res = await documentsApi.askQuestion(document.id, q);
      setQaList((prev) => [...prev, { question: q, answer: res.answer, sources: res.sources }]);
    } catch {
      setQaList((prev) => [
        ...prev,
        {
          question: q,
          answer: activeLang === 'hi'
            ? 'उत्तर प्राप्त करने में असमर्थ। कृपया सीधे अपने चिकित्सक से परामर्श लें।'
            : 'Unable to retrieve answer. Please consult your physician directly.',
          sources: [],
        },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const isHindi = activeLang === 'hi';
  const displaySummary = isHindi
    ? (document.plainLanguageSummaryHi || document.plainLanguageSummary)
    : (document.plainLanguageSummary || document.plainLanguageSummaryHi);
  const displayQuestions = isHindi && document.doctorQuestionsHi && document.doctorQuestionsHi.length > 0
    ? document.doctorQuestionsHi
    : (document.doctorQuestions || []);
  const displayConditionContext = isHindi
    ? (document.conditionContextHi || document.conditionContext)
    : (document.conditionContext || document.conditionContextHi);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div className="w-full max-w-lg lg:max-w-3xl bg-white rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-[#d8ecea] animate-in fade-in slide-in-from-bottom duration-200">
        {/* Urgent Emergency Warning Banner (if urgentFlags non-empty) */}
        {document.urgentFlags && document.urgentFlags.length > 0 && (
          <div className="p-4 bg-red-600 text-white flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <div className="text-xs">
              <span className="font-extrabold uppercase tracking-wide">
                {isHindi ? 'आपातकालीन चेतावनी:' : 'Critical Finding Detected:'}{' '}
              </span>
              <span>
                {document.urgentFlags.join(' · ')}.{' '}
                {isHindi ? 'तुरंत डॉक्टर से संपर्क करें।' : 'Seek medical evaluation promptly.'}
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-[#d8ecea] flex items-center justify-between z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center shrink-0">
              {document.type === 'prescription' ? <Pill className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="doc-modal-title" className="text-base font-extrabold text-gray-900 leading-tight">
                  {document.title}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                    document.badgeType === 'warning'
                      ? 'bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]'
                      : document.badgeType === 'active'
                      ? 'bg-[#e0f7f6] text-[#00756e] border border-[#a2e3de]'
                      : 'bg-[#e0f2fe] text-[#0369a1] border border-[#bae6fd]'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{document.badgeText}</span>
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {document.date} • {document.provider || 'Clinical Lab'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Switcher Button */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-full border border-gray-200">
              <button
                type="button"
                onClick={() => setActiveLang('en')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all ${
                  activeLang === 'en' ? 'bg-[#0a7075] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label="Switch to English explanation"
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setActiveLang('hi')}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-full transition-all ${
                  activeLang === 'hi' ? 'bg-[#0a7075] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
                aria-label="हिंदी में स्पष्टीकरण देखें"
              >
                हिंदी
              </button>
            </div>

            <button
              onClick={handleShare}
              disabled={sharing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#f0faf9] hover:bg-[#e0f7f6] text-xs font-semibold text-[#0a7075] transition-colors"
            >
              {shareSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-600" />
                  <span className="text-green-600 font-bold">{isHindi ? 'साझा किया गया' : 'Shared'}</span>
                </>
              ) : shareError ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span className="text-rose-600 font-bold">{shareError}</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{isHindi ? 'शेयर' : 'Share'}</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              aria-label="Close dialog"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Plain Language Summary Card */}
          {displaySummary && (
            <div className="rounded-2xl bg-gradient-to-br from-[#f0faf9] to-[#e6f7f6] border border-[#a2e3de] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-extrabold text-[#0a7075] uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isHindi ? 'सरल शब्दों में इसका क्या अर्थ है' : 'What this means in plain words'}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-[#0a7075] bg-white/70 px-2 py-0.5 rounded-md border border-[#a2e3de]">
                  <Languages className="w-3 h-3" />
                  <span>{isHindi ? 'हिंदी विवरण' : 'English View'}</span>
                </div>
              </div>
              <p className="text-xs lg:text-sm text-gray-800 leading-relaxed font-medium whitespace-pre-line">
                {displaySummary}
              </p>
            </div>
          )}

          {/* User Medical Condition Context */}
          {displayConditionContext && (
            <div className="rounded-2xl bg-[#eff6ff] border border-[#bfdbfe] p-4 flex items-start gap-3">
              <HeartPulse className="w-5 h-5 text-[#2563eb] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#1e40af] uppercase tracking-wide">
                  {isHindi ? 'आपकी सेहत और मेडिकल हिस्ट्री से संबंध' : 'Connection to Your Health Conditions'}
                </h4>
                <p className="text-xs text-[#1e3a8a] leading-relaxed">
                  {displayConditionContext}
                </p>
              </div>
            </div>
          )}

          {/* Prescribed Medications Section (if prescription document) */}
          {document.medicines && document.medicines.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#0a7075]" />
                <h3 className="text-xs font-bold tracking-wider text-gray-800 uppercase">
                  {isHindi ? 'डॉक्टर द्वारा लिखी गई दवाएं (खुराक व समय)' : 'Prescribed Medications (Dosage & Timing)'}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {document.medicines.map((med, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-[#d8ecea] bg-white shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-black text-gray-900">{med.name}</div>
                        <div className="text-xs font-bold text-[#0a7075]">
                          {med.strength || 'Standard strength'} • {med.dosage || '1 dose'}
                        </div>
                      </div>
                      <span className="inline-block text-[10.5px] font-bold px-2.5 py-0.5 rounded-full bg-[#e0f7f6] text-[#0a7075] border border-[#a2e3de]">
                        {med.frequency || 'Daily'}
                      </span>
                    </div>

                    {/* Food Instruction Badge */}
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-700 bg-gray-50 rounded-lg p-2 border border-gray-100">
                      <span>🍽️ {isHindi ? 'लेने का तरीका:' : 'Meal Rule:'}</span>
                      <span className="font-bold text-gray-900">
                        {med.withFood === 'after'
                          ? (isHindi ? 'खाने के बाद' : 'After meals')
                          : med.withFood === 'before'
                          ? (isHindi ? 'खाली पेट / खाने से पहले' : 'Before meals (empty stomach)')
                          : med.withFood === 'with'
                          ? (isHindi ? 'खाने के साथ' : 'With food')
                          : (isHindi ? 'पानी के साथ' : 'With water')}
                      </span>
                    </div>

                    {/* Plain Explanation of Purpose */}
                    <p className="text-xs text-gray-600 leading-relaxed bg-[#f8fafc] rounded-lg p-2 border border-gray-100">
                      💡 <span className="font-semibold">{isHindi ? 'उपयोग:' : 'Purpose:'}</span>{' '}
                      {isHindi && med.usedForHi ? med.usedForHi : (med.usedFor || med.generalInfo || 'Prescribed by doctor')}
                    </p>

                    {/* How to take safely */}
                    {(med.generalInfo || med.generalInfoHi) && (
                      <p className="text-[11.5px] text-gray-500 leading-snug">
                        {isHindi && med.generalInfoHi ? med.generalInfoHi : med.generalInfo}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Simplified Medical Terms in Everyday Words */}
          {document.medicalTermsExplained && document.medicalTermsExplained.length > 0 && (
            <div className="rounded-2xl border border-[#d8ecea] bg-[#fbfdfd] p-4 space-y-3">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4 text-[#0a7075]" />
                <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  {isHindi ? 'मेडिकल शब्दों का आसान अर्थ' : 'Medical Terms in Everyday Words'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {document.medicalTermsExplained.map((term, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#e2f1f0] text-xs space-y-0.5">
                    <span className="font-extrabold text-gray-900">
                      {isHindi && term.termHi ? term.termHi : term.term}:
                    </span>{' '}
                    <span className="text-gray-600">
                      {isHindi ? term.simpleHi : term.simpleEn}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Left Col: Extracted Biomarkers / Findings */}
            {document.findings && document.findings.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
                  {isHindi ? 'लैब टेस्ट और प्रिंटेड रेंज' : 'Extracted Biomarkers & Printed Ranges'}
                </h3>

                <div className="space-y-2.5">
                  {document.findings.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-[#d8ecea] bg-white shadow-2xs space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-xs font-extrabold text-gray-900">
                            {isHindi && item.testNameHi ? item.testNameHi : item.testName}
                          </div>
                          <div className="text-[11px] text-gray-500">
                            {isHindi ? 'प्रिंटेड संदर्भ सीमा:' : 'Printed Reference:'}{' '}
                            {item.referenceRange || 'Standard clinical range'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-black text-gray-900">
                            {item.value} <span className="text-xs font-normal text-gray-500">{item.unit}</span>
                          </div>
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              item.status === 'high' || item.status === 'elevated'
                                ? 'bg-[#fee2e2] text-[#b91c1c]'
                                : item.status === 'low'
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : 'bg-[#dcfce7] text-[#15803d]'
                            }`}
                          >
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {item.needsReview && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 rounded-md p-1.5 font-semibold">
                          ⚠️ {isHindi ? 'इस मान की तुलना अपनी कागजी रिपोर्ट से करें' : 'Check this value against your paper copy'}
                        </div>
                      )}

                      <p className="text-[11.5px] text-gray-600 bg-[#f8fafc] rounded-lg p-2 leading-relaxed border border-gray-100">
                        💡 {isHindi && item.explanationHi ? item.explanationHi : item.explanation}
                      </p>

                      {/* Source Link */}
                      {item.sources && item.sources.length > 0 && (
                        <div className="text-[10.5px] text-gray-400 flex items-center gap-1">
                          <span>Source:</span>
                          <a
                            href={item.sources[0].url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#0a7075] hover:underline inline-flex items-center gap-0.5 font-medium"
                          >
                            <span>{item.sources[0].name} — {item.sources[0].title}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Right Col: Doctor Questions & Ask MediLens */}
            <div className="space-y-5">
              {displayQuestions.length > 0 && (
                <div className="rounded-2xl border border-[#fecaca] bg-[#fff5f5] p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-[#dc2626]" />
                    <h3 className="text-xs font-bold text-[#991b1b] uppercase tracking-wider">
                      {isHindi ? 'डॉक्टर से पूछने के लिए महत्वपूर्ण सवाल' : 'Suggested Questions for Your Doctor'}
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {displayQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-start justify-between gap-3 p-3 bg-white rounded-xl border border-[#fecaca] text-xs text-gray-800"
                      >
                        <span className="leading-snug">{q}</span>
                        <button
                          onClick={() => copyQuestion(q, idx)}
                          title="Copy question"
                          aria-label="Copy question"
                          className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                        >
                          {copiedQuestionIndex === idx ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ask MediLens Clarifying Question */}
              <div className="p-4 rounded-2xl bg-white border border-[#d8ecea] shadow-xs space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <MessageSquare className="w-4 h-4 text-[#0a7075]" />
                  <span>{isHindi ? 'इस रिपोर्ट के बारे में सवाल पूछें' : 'Ask a question about this report'}</span>
                </div>

                {qaList.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-gray-50 text-xs space-y-1.5 border border-gray-100">
                    <div className="font-bold text-gray-800">Q: {item.question}</div>
                    <div className="text-gray-600 leading-relaxed">{item.answer}</div>
                    {item.sources.length > 0 && (
                      <div className="text-[10px] text-gray-400">
                        Cited from {item.sources.map((s) => s.name).join(', ')}
                      </div>
                    )}
                  </div>
                ))}

                <form onSubmit={handleAskQuestion} className="flex gap-2">
                  <input
                    type="text"
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    placeholder={isHindi ? 'उदा. खाली पेट शुगर का क्या अर्थ है?' : 'e.g. What does fasting glucose mean?'}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0a7075]/20 focus:border-[#0a7075]"
                  />
                  <button
                    type="submit"
                    disabled={asking || !userQuestion.trim()}
                    className="px-3 py-1.5 bg-[#0a7075] hover:bg-[#075960] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
                  >
                    {asking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </form>
              </div>

              {/* Related Clinical Self Care Guide CTA */}
              {onOpenSelfCareGuide && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      onClose();
                      onOpenSelfCareGuide();
                    }}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#0a7075] text-white hover:bg-[#085a5e] transition-all shadow-md shadow-[#0a7075]/20 group"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-tight">
                          {isHindi ? 'AI स्व-देखभाल गाइड देखें' : 'View AI Self-Care Guide'}
                        </div>
                        <div className="text-[11px] text-[#bbf0ec]">
                          {isHindi ? 'स्वास्थ्य दिनचर्या व जीवनशैली सुझाव' : 'Explore condition protocol & lifestyle tips'}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Full Disclaimer */}
          <div className="pt-4 border-t border-gray-100 text-[11px] text-gray-400 leading-relaxed">
            <p>
              {isHindi
                ? 'MediLens AI केवल स्वास्थ्य शिक्षा प्रदान करता है और यह चिकित्सकीय निदान या दवा का नुस्खा नहीं है। हमेशा अपने चिकित्सक से परामर्श लें।'
                : (document.disclaimer ||
                  'MediLens AI provides health education only and does NOT constitute medical diagnosis or prescription. Always consult your licensed physician before altering medications or treatment.')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
