import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Clock,
  Sun,
  Moon,
  Check,
  PhoneCall,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Pill,
} from 'lucide-react';
import { Medication, RefillAlert, UserProfile } from '../types';
import confetti from 'canvas-confetti';

interface MedicinesScreenProps {
  profile: UserProfile;
  medications: Medication[];
  refillAlert: RefillAlert;
  onTakeMedication: (id: string) => void;
  onSnoozeMedication: (id: string) => void;
  onOpenAddModal: () => void;
  onOpenPharmacyModal: () => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onCycleFontSize: () => void;
}

export const MedicinesScreen: React.FC<MedicinesScreenProps> = ({
  profile,
  medications,
  refillAlert,
  onTakeMedication,
  onSnoozeMedication,
  onOpenAddModal,
  onOpenPharmacyModal,
  fontSize,
  onCycleFontSize,
}) => {
  const [caregiverAlerts, setCaregiverAlerts] = useState(true);

  // Calculate doses taken
  const takenCount = medications.filter((m) => m.taken).length;
  const totalCount = medications.length;
  const percentage = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const leftCount = totalCount - takenCount;

  const handleTake = (id: string) => {
    onTakeMedication(id);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#0a7075', '#1d4ed8', '#10b981'],
    });
  };

  const getSlotIcon = (timeSlot: Medication['timeSlot']) => {
    switch (timeSlot) {
      case 'MORNING':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'AFTERNOON':
        return <Sun className="w-4 h-4 text-sky-500" />;
      case 'EVENING':
      case 'NIGHT':
        return <Moon className="w-4 h-4 text-purple-500" />;
      default:
        return <Clock className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <div className="pb-24 pt-1 px-3.5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between py-2 border-b border-[#d8ecea]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#daf1ef] text-[#0a7075] flex items-center justify-center font-bold text-xs">
            ML
          </div>
          <div>
            <span className="font-bold text-gray-900 text-sm">MediLens AI</span>
            <span className="text-[10px] text-gray-500 block leading-tight">
              👤 {profile.name} {profile.caregiverName ? `& ${profile.caregiverName}` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onCycleFontSize}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#daf1ef] hover:bg-[#cbebe8] text-[#0a7075] text-xs font-semibold border border-[#b2e2de] transition-all"
          >
            <span className="font-bold text-[12px]">Tt</span>
            <span className="text-[11px] font-bold">A+</span>
          </button>
        </div>
      </div>

      {/* Medication Plan Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1e40af] via-[#0284c7] to-[#0d9488] p-5 text-white shadow-lg shadow-[#1e40af]/20">
        <div className="relative z-10 space-y-3.5">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-xs border border-white/20 mb-2">
              <Sparkles className="w-3 h-3 text-yellow-300" />
              <span>Daily Health Schedule</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight leading-tight">
              Medication Plan
            </h1>
            <p className="text-xs text-blue-100 font-medium">
              Ground truth strictly from doctor-provided instructions
            </p>
          </div>

          {/* Doses Progress */}
          <div className="bg-black/20 rounded-2xl p-3 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span>{takenCount} of {totalCount} Doses Taken</span>
              <span className="text-blue-200">
                {leftCount === 0 ? 'All Completed 🎉' : `${leftCount} Left`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="pt-1 flex items-center gap-2 flex-wrap">
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-[#0c6b73] shadow-md hover:bg-[#f0fdfa] active:scale-98 transition-all"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add medication</span>
            </button>
          </div>
        </div>
      </div>

      {/* Refill Alert Banner (if needed) */}
      {refillAlert && (
        <div className="rounded-2xl border-l-4 border-amber-500 bg-amber-50/80 p-3.5 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Pill className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900 leading-tight">
                Refill Alert: {refillAlert.medicationName}
              </h3>
              <p className="text-[11px] text-amber-900 leading-tight mt-0.5">
                {refillAlert.pillsLeft ?? 4} doses remaining · Refill in {refillAlert.daysRemaining ?? 4} days
              </p>
            </div>
          </div>
          <button
            onClick={onOpenPharmacyModal}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0"
          >
            Refill Options
          </button>
        </div>
      )}

      {/* Schedule Timeline Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-bold text-gray-900 tracking-tight">Today's Schedule</h2>
          <span className="text-xs font-semibold text-gray-500">{totalCount} Prescribed Medicines</span>
        </div>

        {medications.length === 0 ? (
          <div className="p-8 bg-white rounded-2xl border border-[#e2efef] text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#e0f7f6] text-[#0a7075] flex items-center justify-center mx-auto">
              <Pill className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">No medications scheduled</h3>
            <p className="text-xs text-gray-500 max-w-xs mx-auto">
              Upload a prescription or add your daily medicines manually to track reminders and refill alerts.
            </p>
            <button
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0a7075] text-white text-xs font-bold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Your First Medicine</span>
            </button>
          </div>
        ) : (
          medications.map((med) => (
            <div
              key={med.id}
              className={`rounded-2xl border bg-white p-4 shadow-xs space-y-3 transition-all ${
                med.taken ? 'border-gray-200 opacity-90' : 'border-[#d8ecea]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                  {getSlotIcon(med.timeSlot)}
                  <span>{med.timeSlot} • {med.timeDisplay}</span>
                </div>

                <div
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                    med.taken
                      ? 'bg-[#dcfce7] text-[#15803d] border-[#bbf7d0]'
                      : 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]'
                  }`}
                >
                  {med.taken ? (
                    <>
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Taken</span>
                    </>
                  ) : (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#d97706]"></span>
                      <span>{med.dueStatus || 'Scheduled'}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-gray-900 leading-snug">
                    {med.name}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {med.instructions}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-[#e0f2fe] text-[#0369a1]">
                      {med.category || 'Routine Care'}
                    </span>
                    {med.pillsLeft !== undefined && (
                      <span className="text-[11px] text-gray-500">
                        {med.pillsLeft} pills remaining
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleTake(med.id)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs active:scale-95 transition-all shrink-0 ${
                    med.taken
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#0c6b73] hover:bg-[#0a575e] text-white'
                  }`}
                  title={med.taken ? 'Mark as untaken' : 'Mark as taken'}
                >
                  <Check className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* Snooze & Details Footer */}
              {!med.taken && (
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <button
                    onClick={() => onSnoozeMedication(med.id)}
                    className="text-gray-500 hover:text-gray-700 inline-flex items-center gap-1 font-medium"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Snooze 15 mins</span>
                  </button>
                  {med.phone && (
                    <button
                      onClick={onOpenPharmacyModal}
                      className="text-[#0a7075] hover:underline font-semibold"
                    >
                      Refill: {med.pharmacy || 'Pharmacy'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Safety Disclaimer */}
      <div className="rounded-2xl border border-dashed border-[#a2e3de] bg-[#f0faf9]/80 p-3.5 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
        <p className="text-[11.5px] text-gray-600 leading-relaxed">
          <strong className="text-gray-800">Medication reminders are for personal adherence.</strong> Never adjust prescribed dosages without direct consultation with your healthcare provider.
        </p>
      </div>
    </div>
  );
};
