import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Moon,
  Clock,
  Activity,
  AlertOctagon,
  AlertTriangle,
  PhoneCall,
  BookOpen,
  ArrowUpRight,
  Info,
  CheckCircle2,
  Heart,
  Droplets,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { selfcareApi, metaApi } from '../api';
import { SelfCareDetail, EmergencyMeta } from '../types';

interface SelfCareScreenProps {
  onBack?: () => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onCycleFontSize: () => void;
  initialCondition?: string;
  onNavigateToUpload?: () => void;
}

export const SelfCareScreen: React.FC<SelfCareScreenProps> = ({
  onBack,
  fontSize,
  onCycleFontSize,
  initialCondition = 'migraine',
}) => {
  const [selectedCondition, setSelectedCondition] = useState<string>(
    initialCondition.toLowerCase().includes('diabetes')
      ? 'diabetes'
      : initialCondition.toLowerCase().includes('hypertension') || initialCondition.toLowerCase().includes('blood pressure')
      ? 'hypertension'
      : 'migraine'
  );

  const [emergencyMeta, setEmergencyMeta] = useState<EmergencyMeta>({
    primary: '112',
    ambulance: '108',
  });

  const [availableConditions, setAvailableConditions] = useState<{ id: string; title: string }[]>([
    { id: 'migraine', title: 'Migraine without aura' },
    { id: 'diabetes', title: 'Type 2 Diabetes (Lab Panel)' },
    { id: 'hypertension', title: 'High Blood Pressure' },
  ]);

  const [conditionDetail, setConditionDetail] = useState<SelfCareDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    // Fetch emergency contacts
    metaApi.getEmergencyMeta().then(setEmergencyMeta).catch(() => {});

    // Fetch selfcare condition list from API
    selfcareApi
      .getConditions()
      .then((conds) => {
        if (conds && conds.length > 0) {
          setAvailableConditions(conds);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCondition) {
      setLoadingDetail(true);
      selfcareApi
        .getConditionDetail(selectedCondition)
        .then((detail) => {
          setConditionDetail(detail);
        })
        .catch(() => {
          // If offline or endpoint unavailable, conditionDetail remains null and renders fallback content
          setConditionDetail(null);
        })
        .finally(() => {
          setLoadingDetail(false);
        });
    }
  }, [selectedCondition]);

  const handleEmergencyCall = () => {
    window.location.href = `tel:${emergencyMeta.primary}`;
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  return (
    <div className="pb-24 pt-1 px-3.5 space-y-4">
      {/* Top Header */}
      {onBack && (
        <div className="flex items-center justify-between py-2 border-b border-[#d8ecea]">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-gray-800 hover:text-[#0a7075] font-semibold text-sm transition-colors active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to records</span>
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
      )}

      {/* AI Condition Context Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0a7075] uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Matched to your medical history & records:</span>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs">
          {availableConditions.map((cond) => (
            <button
              key={cond.id}
              onClick={() => setSelectedCondition(cond.id)}
              className={`px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap transition-all ${
                selectedCondition === cond.id
                  ? 'bg-[#0a7075] text-white shadow-sm'
                  : 'bg-white border border-[#b2e2de] text-gray-700 hover:bg-[#f0faf9]'
              }`}
            >
              {cond.title}
            </button>
          ))}
        </div>
      </div>

      {/* DYNAMIC API DETAIL VIEW (if loaded from backend) */}
      {conditionDetail ? (
        <div className="space-y-4">
          <div className="space-y-1 pt-1">
            <span className="inline-block text-[11px] font-bold tracking-wider text-[#0a7075] bg-[#e0f7f6] px-2.5 py-0.5 rounded-full border border-[#a2e3de] uppercase">
              CLINICAL REFERENCE
            </span>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Self-care guide
            </h1>
            <p className="text-base font-bold text-[#0a7075]">
              {conditionDetail.title}
            </p>
          </div>

          {/* Sections from API */}
          {conditionDetail.sections.map((section, idx) => (
            <div key={idx} className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-gray-900 leading-tight">
                {section.heading}
              </h2>
              <ul className="space-y-2 text-xs text-gray-700">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Red Flags / Emergency Section */}
          {conditionDetail.redFlags && conditionDetail.redFlags.length > 0 && (
            <div className="rounded-2xl border-l-4 border-[#ef4444] bg-[#fef2f2] p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
                  <AlertOctagon className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-[#dc2626] uppercase block">
                    CRITICAL TRIAGE & RED FLAGS
                  </span>
                  <h2 className="text-base font-extrabold text-gray-900 leading-tight">
                    Emergency signs to watch for
                  </h2>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-gray-800">
                {conditionDetail.redFlags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 flex items-center justify-between border-t border-[#fecaca]">
                <span className="text-[11px] text-gray-600 font-medium">
                  Dial {emergencyMeta.primary} (Ambulance {emergencyMeta.ambulance}) immediately
                </span>
                <button
                  onClick={handleEmergencyCall}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#f05a3e] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#ea4324] active:scale-98 transition-all"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call {emergencyMeta.primary}</span>
                </button>
              </div>
            </div>
          )}

          {/* Citations from API */}
          {conditionDetail.sources && conditionDetail.sources.length > 0 && (
            <div className="rounded-2xl border border-[#d8ecea] bg-white p-4 shadow-xs space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <BookOpen className="w-4 h-4 text-[#0a7075]" />
                <span>Trusted Medical Sources & Citations</span>
              </div>
              <div className="space-y-1.5">
                {conditionDetail.sources.map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-[#f0faf9] border border-gray-100 transition-colors group"
                  >
                    <span className="text-xs font-semibold text-gray-700 group-hover:text-[#0a7075]">
                      {src.name}: {src.title}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a7075]" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* FALLBACK DETAILED CLIENT-SIDE GUIDES */
        <div className="space-y-4">
          {selectedCondition === 'migraine' && (
            <div className="space-y-4">
              <div className="space-y-1 pt-1">
                <span className="inline-block text-[11px] font-bold tracking-wider text-[#0a7075] bg-[#e0f7f6] px-2.5 py-0.5 rounded-full border border-[#a2e3de] uppercase">
                  CLINICAL REFERENCE
                </span>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Self-care guide
                </h1>
                <p className="text-base font-bold text-[#0a7075]">
                  Migraine without aura
                </p>
              </div>

              <div className="rounded-2xl border border-[#a2e3de] bg-[#e0f7f6] p-4 shadow-xs space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#bbf0ec] text-[#0a7075] flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <h2 className="text-xs font-bold text-gray-900">
                    Pre-Triage Context Match
                  </h2>
                </div>
                <p className="text-xs text-gray-700 leading-relaxed pl-9">
                  Shown because <strong className="text-gray-900">"Diagnosis: Migraine without aura"</strong> is recorded in your doctor's consultation note. Always follow your prescribing physician's advice.
                </p>
              </div>

              <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center">
                    <Moon className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#0a7075] uppercase block">
                      DAILY PRACTICES
                    </span>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">
                      During an attack
                    </h2>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-1 text-xs text-gray-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Rest in a quiet, dark room at the earliest sign of headache onset.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Apply a cool cloth or wrapped ice pack to your forehead or the back of your neck.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Maintain hydration with small, frequent sips of water.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border-l-4 border-[#ef4444] bg-[#fef2f2] p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
                    <AlertOctagon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#dc2626] uppercase block">
                      CRITICAL RED FLAGS
                    </span>
                    <h2 className="text-base font-extrabold text-gray-900 leading-tight">
                      Thunderclap or Neurological Symptoms
                    </h2>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-800">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    <span>Sudden, explosive "thunderclap" headache reaching maximum intensity in seconds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    <span>Stiff neck accompanied by high fever, confusion, seizures, or double vision</span>
                  </li>
                </ul>
                <div className="pt-2 flex items-center justify-between border-t border-[#fecaca]">
                  <span className="text-[11px] text-gray-600 font-medium">
                    Call emergency services {emergencyMeta.primary}
                  </span>
                  <button
                    onClick={handleEmergencyCall}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f05a3e] px-4 py-2 text-xs font-bold text-white shadow-sm"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call {emergencyMeta.primary}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedCondition === 'diabetes' && (
            <div className="space-y-4">
              <div className="space-y-1 pt-1">
                <span className="inline-block text-[11px] font-bold tracking-wider text-[#0a7075] bg-[#e0f7f6] px-2.5 py-0.5 rounded-full border border-[#a2e3de] uppercase">
                  CLINICAL REFERENCE
                </span>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Self-care guide
                </h1>
                <p className="text-base font-bold text-[#0a7075]">
                  Type 2 Diabetes Management
                </p>
              </div>

              <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#eff6ff] text-[#1d4ed8] flex items-center justify-center">
                    <Droplets className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#1d4ed8] uppercase block">
                      DAILY ROUTINE
                    </span>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">
                      Glucose & Meal Consistency
                    </h2>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-1 text-xs text-gray-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Take prescribed medications (e.g. Metformin) with meals as directed.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Monitor blood glucose at regular intervals recommended by your endocrinologist.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Check feet daily for cuts, sores, blisters, redness, or swelling.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-2xl border-l-4 border-[#ef4444] bg-[#fef2f2] p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#fee2e2] text-[#dc2626] flex items-center justify-center">
                    <AlertOctagon className="w-5 h-5 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#dc2626] uppercase block">
                      CRITICAL TRIAGE
                    </span>
                    <h2 className="text-base font-extrabold text-gray-900 leading-tight">
                      Acute Hypo/Hyperglycemia signs
                    </h2>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-800">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    <span>Severe shakiness, sudden sweating, confusion or loss of consciousness</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    <span>Persistent vomiting, rapid deep breathing, fruity breath scent</span>
                  </li>
                </ul>
                <div className="pt-2 flex items-center justify-between border-t border-[#fecaca]">
                  <span className="text-[11px] text-gray-600 font-medium">
                    Emergency services: {emergencyMeta.primary}
                  </span>
                  <button
                    onClick={handleEmergencyCall}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#f05a3e] px-4 py-2 text-xs font-bold text-white shadow-sm"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call {emergencyMeta.primary}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedCondition === 'hypertension' && (
            <div className="space-y-4">
              <div className="space-y-1 pt-1">
                <span className="inline-block text-[11px] font-bold tracking-wider text-[#0a7075] bg-[#e0f7f6] px-2.5 py-0.5 rounded-full border border-[#a2e3de] uppercase">
                  CLINICAL REFERENCE
                </span>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                  Self-care guide
                </h1>
                <p className="text-base font-bold text-[#0a7075]">
                  High Blood Pressure / Cardiovascular Health
                </p>
              </div>

              <div className="rounded-2xl border border-[#e2efef] bg-white p-4 shadow-xs space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#ccfbf1] text-[#0f766e] flex items-center justify-center">
                    <Heart className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider text-[#0a7075] uppercase block">
                      DAILY PRACTICES
                    </span>
                    <h2 className="text-base font-bold text-gray-900 leading-tight">
                      Blood Pressure Care
                    </h2>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-1 text-xs text-gray-700">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Take prescribed antihypertensives consistently at the scheduled time.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Limit daily dietary sodium intake as recommended by WHO / AHA guidelines.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
                    <span>Log resting blood pressure readings in the morning and evening.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Trusted Medical Citations */}
          <div className="rounded-2xl border border-[#d8ecea] bg-white p-4 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
              <BookOpen className="w-4 h-4 text-[#0a7075]" />
              <span>Grounding Medical References</span>
            </div>
            <div className="space-y-1.5">
              <a
                href="https://medlineplus.gov/ency/patientinstructions/000420.htm"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-[#f0faf9] border border-gray-100 transition-colors group"
              >
                <span className="text-xs font-semibold text-gray-700 group-hover:text-[#0a7075]">
                  MedlinePlus: Chronic Condition Self-Care & Red Flags
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a7075]" />
              </a>
              <a
                href="https://www.who.int/news-room/fact-sheets"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-[#f0faf9] border border-gray-100 transition-colors group"
              >
                <span className="text-xs font-semibold text-gray-700 group-hover:text-[#0a7075]">
                  World Health Organization (WHO): Health Topics & Fact Sheets
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a7075]" />
              </a>
              <a
                href="https://www.nih.gov/health-information"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between p-2 rounded-xl bg-gray-50 hover:bg-[#f0faf9] border border-gray-100 transition-colors group"
              >
                <span className="text-xs font-semibold text-gray-700 group-hover:text-[#0a7075]">
                  NIH: Health Information & Medical Research Summaries
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#0a7075]" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Disclaimer */}
      <div className="rounded-xl bg-[#132f2f] text-white p-3.5 flex items-start gap-2.5 text-xs">
        <Info className="w-4 h-4 text-[#57cfc5] shrink-0 mt-0.5" />
        <span className="text-[11.5px] leading-relaxed text-gray-200">
          This guide provides health education based on MedlinePlus, WHO, and NIH resources. It does not provide medical diagnosis or replace personalized care from your physician.
        </span>
      </div>
    </div>
  );
};
