import React from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { SkinAnalysisResult } from '../types';

interface SkinResultModalProps {
  result: SkinAnalysisResult;
  onClose: () => void;
  emergencyNumber?: string;
}

export const SkinResultModal: React.FC<SkinResultModalProps> = ({
  result,
  onClose,
  emergencyNumber = '112',
}) => {
  const getUrgencyBadge = (urgency: SkinAnalysisResult['urgency']) => {
    switch (urgency) {
      case 'urgent':
        return {
          bg: 'bg-red-50 text-red-700 border-red-200',
          dot: 'bg-red-500',
          label: 'Requires Prompt Medical Attention',
          icon: AlertOctagon,
        };
      case 'soon':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: 'Schedule Doctor Visit Soon',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          dot: 'bg-teal-500',
          label: 'Routine Awareness / Monitor',
          icon: Info,
        };
    }
  };

  const urgencyStyle = getUrgencyBadge(result.urgency);
  const UrgencyIcon = urgencyStyle.icon;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-[#d8ecea] my-8 overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#f0f9f8] sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#0a7075] text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Health Photo Observation</h2>
              <p className="text-xs text-gray-500">Educational awareness • Not a medical diagnosis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white hover:bg-gray-100 text-gray-600 flex items-center justify-center border border-gray-200 shadow-xs transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Strict Non-Diagnostic Warning Banner */}
          <div className="rounded-2xl bg-amber-50/80 border border-amber-200 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 leading-relaxed">
              <strong className="font-bold">Important Medical Notice:</strong> {result.disclaimer || 'This AI observation is for patient awareness only and does not replace examination by a qualified dermatologist or physician.'}
            </div>
          </div>

          {/* Urgency Status */}
          <div className={`rounded-2xl border p-4 flex items-center justify-between ${urgencyStyle.bg}`}>
            <div className="flex items-center gap-2.5">
              <UrgencyIcon className="w-5 h-5 shrink-0" />
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider">Evaluation Urgency</div>
                <div className="text-sm font-extrabold">{urgencyStyle.label}</div>
              </div>
            </div>
            {result.urgency === 'urgent' && (
              <a
                href={`tel:${emergencyNumber}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call {emergencyNumber}</span>
              </a>
            )}
          </div>

          {/* Image Quality Assessment */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-600">Image Quality Check:</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                result.imageQuality === 'good' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {result.imageQuality}
              </span>
              <span className="text-gray-500 text-[11px]">{result.qualityNote}</span>
            </div>
          </div>

          {/* Observed Visual Signs */}
          {result.observedSigns && result.observedSigns.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Observed Visual Features
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.observedSigns.map((sign, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#e0f7f6] text-[#0a7075] text-xs font-medium border border-[#a2e3de]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{sign}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Possible Conditions to Discuss with Doctor */}
          {result.possibleConditions && result.possibleConditions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Possibilities for Doctor Discussion (Max 3)
                </h3>
                <span className="text-[11px] text-gray-400">Non-definitive</span>
              </div>
              <div className="space-y-2.5">
                {result.possibleConditions.map((cond, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-gray-200 bg-white hover:border-[#a2e3de] transition-colors space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-gray-900">{cond.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 uppercase">
                        {cond.confidence} likelihood
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {cond.whyItMayLookLikeThis}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Self-Care / Hygiene Tips */}
          {result.selfCareTips && result.selfCareTips.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Gentle Self-Care & Hygiene Tips
              </h3>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {result.selfCareTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0a7075] mt-1.5 shrink-0"></span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* When to See a Doctor */}
          {result.seeDoctorIf && result.seeDoctorIf.length > 0 && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4 space-y-2">
              <h3 className="text-xs font-bold text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>See a Doctor Immediately If You Experience:</span>
              </h3>
              <ul className="space-y-1 text-xs text-rose-800">
                {result.seeDoctorIf.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mt-1.5 shrink-0"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Medical Sources */}
          {result.sources && result.sources.length > 0 && (
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Clinical Grounding Sources
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[11px] font-medium text-gray-700 transition-colors"
                  >
                    <span>{src.name}: {src.title}</span>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[#0a7075] hover:bg-[#085a5e] text-white text-xs font-bold shadow-xs active:scale-98 transition-all"
          >
            Close Observation
          </button>
        </div>
      </div>
    </div>
  );
};
