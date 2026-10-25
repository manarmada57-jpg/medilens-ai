import React, { useState } from 'react';
import {
  Bell,
  Plus,
  Clock,
  Sun,
  Moon,
  Check,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  Pill,
  Droplet,
  ChevronRight,
  AlertTriangle,
  Timer,
  TrendingUp,
  Users,
} from 'lucide-react';
import { Medication, RefillAlert, UserProfile } from '../types';
import confetti from 'canvas-confetti';

interface DesktopMedicinesScreenProps {
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

const WEEK_DAYS = [
  { key: 'M', label: 'Mon', taken: true },
  { key: 'T', label: 'Tue', taken: true },
  { key: 'W', label: 'Wed', taken: true },
  { key: 'T2', label: 'Thu', taken: true },
  { key: 'F', label: 'Fri', taken: true },
  { key: 'S', label: 'Sat', taken: false },
  { key: 'S2', label: 'Sun', taken: false },
];

export const DesktopMedicinesScreen: React.FC<DesktopMedicinesScreenProps> = ({
  profile,
  medications,
  refillAlert,
  onTakeMedication,
  onSnoozeMedication,
  onOpenAddModal,
  onOpenPharmacyModal,
}) => {
  const [caregiverAlerts, setCaregiverAlerts] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'14' | '15' | '16' | '17'>('16');

  const takenCount = medications.filter((m) => m.taken).length;
  const totalCount = medications.length;
  const percentage = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;
  const leftCount = totalCount - takenCount;

  const handleTake = (id: string) => {
    onTakeMedication(id);
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.55 },
      colors: ['#0a7075', '#1d4ed8', '#10b981', '#fbbf24'],
    });
  };

  const morningMeds = medications.filter((m) => m.timeSlot === 'MORNING');
  const afternoonMeds = medications.filter((m) => m.timeSlot === 'AFTERNOON');
  const eveningMeds = medications.filter((m) => m.timeSlot === 'EVENING');

  return (
    <div className="space-y-5">
      {/* ── Hero Banner ───────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c5a60] via-[#0a7075] to-[#1565a8] p-6 text-white shadow-xl">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-20 w-36 h-36 rounded-full bg-white/5 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Left: Title + Progress */}
          <div className="space-y-4 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold border border-white/20 backdrop-blur-sm">
                <Sparkles className="w-3 h-3 text-yellow-300" />
                Personalized Schedule
              </span>
              {leftCount === 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/80 px-2.5 py-1 text-[11px] font-bold">
                  🎉 All done today!
                </span>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight leading-tight">
                Today's Medication Regimen
              </h1>
              <p className="text-sm text-blue-100 mt-1">
                {leftCount === 0
                  ? 'Outstanding adherence — all doses logged for today.'
                  : `${takenCount} of ${totalCount} doses taken · ${leftCount} remaining`}
              </p>
            </div>

            {/* Progress bar */}
            <div className="max-w-sm">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-blue-100">Adherence Today</span>
                <span className="text-white font-bold">{percentage}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-black/25 overflow-hidden border border-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-700 shadow-sm"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Weekly dots */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-blue-200 font-semibold mr-1">This week:</span>
              {WEEK_DAYS.map((d) => (
                <div key={d.key} className="flex flex-col items-center gap-0.5">
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      d.taken
                        ? 'bg-emerald-400 border-emerald-300'
                        : 'bg-white/10 border-white/20'
                    }`}
                  >
                    {d.taken && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                  </div>
                  <span className="text-[9px] text-blue-200/80">{d.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Stats */}
          <div className="flex sm:flex-col gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
              <div className="text-2xl font-black">{takenCount}<span className="text-base font-semibold text-blue-200">/{totalCount}</span></div>
              <div className="text-[11px] text-blue-200 mt-0.5 font-medium">Taken Today</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15 text-center min-w-[90px]">
              <div className="text-2xl font-black">5</div>
              <div className="text-[11px] text-blue-200 mt-0.5 font-medium">Day Streak 🔥</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2-Column Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* ── Left: Timeline ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Day selector */}
          <div className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 border border-[#d8ecea] shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#0a7075]" />
              <span className="text-xs font-bold text-gray-700">October 2026</span>
            </div>
            <div className="flex gap-1.5">
              {[
                { day: '14', label: 'Wed', num: '14', sub: '3/3 ✓', done: true },
                { day: '15', label: 'Thu', num: '15', sub: '3/3 ✓', done: true },
                { day: '16', label: 'Today', num: '16', sub: `${takenCount}/${totalCount}`, done: takenCount === totalCount },
                { day: '17', label: 'Sat', num: '17', sub: 'Upcoming', done: false },
              ].map((item) => (
                <button
                  key={item.day}
                  onClick={() => setSelectedDay(item.day as any)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex flex-col items-center gap-0.5 min-w-[56px] ${
                    selectedDay === item.day
                      ? 'bg-[#0a7075] text-white shadow-sm'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-[10px] font-medium opacity-80">{item.label}</span>
                  <span className="font-extrabold text-sm">{item.num}</span>
                  <span className={`text-[9px] font-semibold ${
                    selectedDay === item.day
                      ? item.done ? 'text-emerald-300' : 'text-blue-200'
                      : item.done ? 'text-emerald-600' : 'text-gray-400'
                  }`}>
                    {item.sub}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Morning Doses */}
          <MedSection
            title="Morning Doses"
            time="8:00 AM"
            icon={<Sun className="w-4 h-4 stroke-[2.5]" />}
            iconBg="bg-amber-100 text-amber-500"
            badge={
              morningMeds.every((m) => m.taken) ? (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Taken on time
                </span>
              ) : (
                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Pending
                </span>
              )
            }
          >
            {morningMeds.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                accentColor="#d97706"
                accentBg="bg-amber-50 text-amber-700"
                timeBg="bg-[#e0f7f6] text-[#0a7075]"
                onTake={() => handleTake(med.id)}
                onSnooze={() => onSnoozeMedication(med.id)}
                footerLeft={
                  <span className="text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed taken
                  </span>
                }
                footerRight={<span className="text-gray-400">Scheduled daily</span>}
              />
            ))}
          </MedSection>

          {/* Afternoon Doses */}
          <MedSection
            title="Afternoon Doses"
            time="1:00 PM"
            icon={<Clock className="w-4 h-4 stroke-[2.5]" />}
            iconBg="bg-blue-100 text-blue-600"
            badge={
              <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1.5">
                <Timer className="w-3 h-3 animate-pulse" /> Due soon
              </span>
            }
          >
            {afternoonMeds.map((med) => (
              <MedCard
                key={med.id}
                med={med}
                accentColor="#1d4ed8"
                accentBg="bg-blue-50 text-blue-700"
                timeBg="bg-[#eff6ff] text-[#1d4ed8]"
                onTake={() => handleTake(med.id)}
                onSnooze={() => onSnoozeMedication(med.id)}
                footerLeft={
                  <span className="text-amber-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Take with lunch
                  </span>
                }
                footerRight={
                  <button
                    onClick={() => onSnoozeMedication(med.id)}
                    className="text-blue-600 hover:text-blue-800 font-semibold underline underline-offset-2"
                  >
                    Snooze 15m
                  </button>
                }
                highlight
              />
            ))}
          </MedSection>

          {/* Evening Doses */}
          {eveningMeds.length > 0 && (
            <MedSection
              title="Evening Doses"
              time="8:00 PM"
              icon={<Moon className="w-4 h-4 stroke-[2.5]" />}
              iconBg="bg-purple-100 text-purple-600"
              badge={
                <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  Upcoming tonight
                </span>
              }
            >
              {eveningMeds.map((med) => (
                <MedCard
                  key={med.id}
                  med={med}
                  accentColor="#7c3aed"
                  accentBg="bg-purple-50 text-purple-700"
                  timeBg="bg-[#f5f3ff] text-[#7c3aed]"
                  onTake={() => handleTake(med.id)}
                  onSnooze={() => onSnoozeMedication(med.id)}
                  footerLeft={<span className="text-gray-500">Take at bedtime</span>}
                  footerRight={
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      ⚠ {refillAlert.pillsLeft ?? 4} doses left
                    </span>
                  }
                />
              ))}
            </MedSection>
          )}

          {/* Interaction Check Badge */}
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-200">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-900">Talk to your doctor or pharmacist</p>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">
                Drug interactions depend on your full health picture. Always check with your healthcare provider before combining medicines.
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Sidebar ──────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Today's Progress Ring */}
          <div className="bg-white rounded-2xl p-5 border border-[#d8ecea] shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-[#0a7075]" />
              <h3 className="text-sm font-bold text-gray-900">Today's Progress</h3>
            </div>
            {/* Simple visual ring replacement */}
            <div className="flex items-center gap-4">
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e2efef" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke={percentage === 100 ? '#10b981' : '#0a7075'}
                    strokeWidth="3"
                    strokeDasharray={`${percentage} ${100 - percentage}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-gray-900">{takenCount}/{totalCount}</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <div className="text-xs text-gray-500">
                  <span className="font-bold text-gray-900">{percentage}%</span> adherence
                </div>
                <div className="space-y-1.5">
                  {[
                    { label: 'Morning', count: morningMeds.filter(m => m.taken).length, total: morningMeds.length, color: 'bg-amber-400' },
                    { label: 'Afternoon', count: afternoonMeds.filter(m => m.taken).length, total: afternoonMeds.length, color: 'bg-blue-400' },
                    { label: 'Evening', count: eveningMeds.filter(m => m.taken).length, total: eveningMeds.length, color: 'bg-purple-400' },
                  ].map((slot) => (
                    <div key={slot.label} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${slot.color}`} />
                      <span className="text-[11px] text-gray-600 flex-1">{slot.label}</span>
                      <span className="text-[11px] font-bold text-gray-800">{slot.count}/{slot.total}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Refill Alert Card */}
          <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800">
                <Bell className="w-5 h-5 text-amber-500 animate-bounce" />
                <h3 className="text-sm font-extrabold">Refill Alert</h3>
              </div>
              <span className="text-[10px] font-extrabold bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full">
                URGENT
              </span>
            </div>

            <div className="bg-white/80 rounded-xl p-3.5 border border-amber-200/70 space-y-2">
              <div className="flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-xs font-extrabold text-gray-900">
                  {refillAlert.medicationName || 'Medication'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-amber-800 font-bold">
                  {refillAlert.pillsLeft ?? 4} doses · {refillAlert.daysRemaining ?? 4} days left
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              <div className="h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: '18%' }} />
              </div>
              <p className="text-[11px] text-gray-500 pt-0.5">
                📍 {refillAlert.pharmacy || 'CVS Pharmacy #4821'}
              </p>
            </div>

            <button
              onClick={onOpenPharmacyModal}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5"
            >
              <ChevronRight className="w-3.5 h-3.5" /> Order Refill Now
            </button>
          </div>

          {/* Add Medicine Card */}
          <div className="bg-white rounded-2xl p-5 border-2 border-dashed border-[#a2e3de] shadow-sm text-center space-y-3 hover:border-[#0a7075] transition-colors group">
            <div className="w-12 h-12 rounded-2xl bg-[#e0f7f6] text-[#0a7075] mx-auto flex items-center justify-center shadow-sm group-hover:bg-[#0a7075] group-hover:text-white transition-colors">
              <Plus className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Add New Medication</h3>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                Prescribed something new? Log dosage, timing &amp; reminders.
              </p>
            </div>
            <button
              onClick={onOpenAddModal}
              className="w-full py-2.5 px-4 rounded-xl bg-[#0a7075] hover:bg-[#085a5e] active:scale-95 text-white font-bold text-xs transition-all shadow-sm"
            >
              + Add Medicine
            </button>
          </div>

          {/* Caregiver Sync Card */}
          <div className="bg-white rounded-2xl p-4 border border-[#d8ecea] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#0a7075]" />
                <h3 className="text-sm font-bold text-gray-900">Caregiver Sync</h3>
              </div>
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Logs mirrored to <strong className="text-gray-700">{profile.caregiverName}</strong> in real-time via SMS.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs">
              <span className="text-gray-600 font-medium">SMS Notifications</span>
              <button
                onClick={() => setCaregiverAlerts(!caregiverAlerts)}
                className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                  caregiverAlerts ? 'bg-[#0a7075]' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${
                    caregiverAlerts ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Hydration Tip */}
          <div className="rounded-2xl border border-[#d8ecea] bg-[#f0faf9] p-4 flex items-start gap-3">
            <Droplet className="w-4 h-4 text-[#0a7075] shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-gray-900">Hydration Reminder</p>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
                Take Metformin mid-meal to reduce stomach discomfort. Avoid grapefruit while on Atorvastatin.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────── Sub-components ─────────────────────── */

interface MedSectionProps {
  title: string;
  time: string;
  icon: React.ReactNode;
  iconBg: string;
  badge: React.ReactNode;
  children: React.ReactNode;
}

const MedSection: React.FC<MedSectionProps> = ({ title, time, icon, iconBg, badge, children }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <span>{title}</span>
        <span className="text-xs font-normal text-gray-400">{time}</span>
      </div>
      {badge}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {children}
    </div>
  </div>
);

interface MedCardProps {
  med: Medication;
  accentColor: string;
  accentBg: string;
  timeBg: string;
  onTake: () => void;
  onSnooze: () => void;
  footerLeft: React.ReactNode;
  footerRight: React.ReactNode;
  highlight?: boolean;
}

const MedCard: React.FC<MedCardProps> = ({
  med,
  accentBg,
  timeBg,
  onTake,
  footerLeft,
  footerRight,
  highlight = false,
}) => (
  <div
    className={`p-4 rounded-2xl border transition-all ${
      med.taken
        ? 'bg-emerald-50/70 border-emerald-200'
        : highlight
        ? 'bg-white border-blue-200 ring-1 ring-blue-400/20 shadow-sm'
        : 'bg-white border-[#d8ecea] hover:border-[#0a7075]/40 hover:shadow-sm'
    }`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${timeBg}`}>
            {med.timeDisplay}
          </span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
            {med.category || 'Routine Care'}
          </span>
        </div>
        <h3 className="text-sm font-extrabold text-gray-900 mt-2 leading-snug">{med.name}</h3>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{med.instructions}</p>
        {med.loggedBy && (
          <p className="text-[10px] text-gray-400 mt-1">Logged by: {med.loggedBy}</p>
        )}
      </div>

      <button
        onClick={onTake}
        title={med.taken ? 'Already taken' : 'Mark as taken'}
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${
          med.taken
            ? 'bg-emerald-500 text-white shadow-sm'
            : `${accentBg} border border-current/20 hover:opacity-90`
        }`}
      >
        <Check className="w-4.5 h-4.5 stroke-[2.5]" />
      </button>
    </div>

    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold">
      <span>{footerLeft}</span>
      <span>{footerRight}</span>
    </div>
  </div>
);
