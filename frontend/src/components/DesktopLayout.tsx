import React, { useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard,
  Upload,
  Pill,
  FileText,
  Sparkles,
  BarChart3,
  Image,
  Stethoscope,
  ChevronDown,
  Type,
  Search,
  Bell,
  PhoneCall,
  ShieldCheck,
  LogOut,
  User,
  ExternalLink,
  CheckCircle2,
  Clock,
  Heart,
} from 'lucide-react';
import { NavTab } from './BottomNav';
import { UserProfile } from '../types';

interface DesktopLayoutProps {
  profile: UserProfile;
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  fontSize: 'normal' | 'large' | 'xlarge';
  onCycleFontSize: () => void;
  onOpenAuth: () => void;
  onOpenMedicalHistory: () => void;
  onNavigateToUpload: (mode?: 'report' | 'prescription' | 'image') => void;
  onOpenSampleReport: () => void;
  children: React.ReactNode;
}

const navItems = [
  { id: 'home' as NavTab, label: 'Overview', icon: LayoutDashboard, badge: null },
  { id: 'upload' as NavTab, label: 'Scan & Upload', icon: Upload, badge: 'AI OCR' },
  { id: 'medicines' as NavTab, label: 'Medications', icon: Pill, badge: '3 doses' },
  { id: 'history' as NavTab, label: 'Medical History', icon: FileText, badge: '12 docs' },
  { id: 'selfcare' as NavTab, label: 'AI Self-Care Guide', icon: Sparkles, badge: 'Personalized' },
];

const quickTools = [
  {
    label: 'Analyse Lab Report',
    icon: BarChart3,
    mode: 'report' as const,
    color: 'text-[#0a7075] bg-[#e0f7f6]',
  },
  {
    label: 'Read Prescription',
    icon: Pill,
    mode: 'prescription' as const,
    color: 'text-[#1d4ed8] bg-[#eff6ff]',
  },
  {
    label: 'Check Health Image',
    icon: Image,
    mode: 'image' as const,
    color: 'text-[#ea580c] bg-[#fff7ed]',
  },
];

export const DesktopLayout: React.FC<DesktopLayoutProps> = ({
  profile,
  currentTab,
  onSelectTab,
  fontSize,
  onCycleFontSize,
  onOpenAuth,
  onOpenMedicalHistory,
  onNavigateToUpload,
  onOpenSampleReport,
  children,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationToast, setShowNotificationToast] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  const firstName = profile.name.split(' ')[0] || 'User';
  const initial = profile.name.charAt(0).toUpperCase() || 'E';

  const getPageTitle = () => {
    switch (currentTab) {
      case 'home':
        return { section: 'Patient Overview', subtitle: "Live Health Dashboard & Today's Schedule" };
      case 'upload':
        return { section: 'Document Scanner', subtitle: 'AI Multimodal Extraction & Plain Language Translation' };
      case 'medicines':
        return { section: 'Medication Regimen', subtitle: 'Adherence Tracking, Schedule & Pharmacy Refills' };
      case 'history':
        return { section: 'Medical Profile & Records', subtitle: 'Verified Clinical Intake, Demographics & Reports' };
      case 'selfcare':
        return { section: 'AI Self-Care Guide', subtitle: 'Personalized Clinical Reference & Condition Management' };
    }
  };

  const pageInfo = getPageTitle();

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#f0f9f8] text-[#132f2f]">
      {/* ── Top Global SaaS Header (56px) ─────────────────────────────────── */}
      <header className="flex-shrink-0 h-14 bg-white border-b border-[#d8ecea] flex items-center justify-between px-6 z-30 shadow-[0_1px_4px_rgba(10,112,117,0.06)]">
        {/* Left: Brand + Breadcrumb */}
        <div className="flex items-center gap-6 min-w-[320px]">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectTab('home')}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c6b73] to-[#0a7075] flex items-center justify-center text-white shadow-sm shadow-[#0a7075]/30">
              <Stethoscope className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-[#0a7075]">MediLens</span>
                <span className="font-extrabold text-base tracking-tight text-[#132f2f]">AI</span>
                <span className="text-[10px] font-bold bg-[#e0f7f6] text-[#0a7075] px-1.5 py-0.5 rounded-md border border-[#b2e2de]">
                  PATIENT
                </span>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-gray-200 text-xs">
            <span className="text-gray-400">Portal /</span>
            <span className="font-bold text-gray-800">{pageInfo.section}</span>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
            <span className="text-[11px] text-emerald-700 font-medium">Encrypted Storage</span>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-xl mx-4 relative">
          <div
            className={`relative flex items-center rounded-xl bg-[#f4faf9] border transition-all ${
              searchFocused
                ? 'border-[#0a7075] bg-white ring-2 ring-[#0a7075]/15 shadow-xs'
                : 'border-[#d8ecea] hover:border-[#b2e2de]'
            }`}
          >
            <Search className="w-4 h-4 text-[#0a7075] ml-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Search medical records, medications, lab tests... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 250)}
              className="w-full py-2 px-3 text-xs bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mr-2 text-gray-400 hover:text-gray-600 text-xs px-1"
              >
                ✕
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center mr-2 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400 bg-white border border-gray-200 rounded">
              ⌘K
            </kbd>
          </div>

          {/* Live Search Quick Results */}
          {searchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-2xl border border-[#d8ecea] p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1">
                Matching Records & Regimen
              </div>
              <div className="space-y-1">
                <button
                  onMouseDown={() => {
                    onOpenSampleReport();
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#f0faf9] text-left text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#0a7075]" />
                    <span className="font-bold text-gray-900">Quest Metabolic Panel</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Lab Report</span>
                </button>

                <button
                  onMouseDown={() => {
                    onSelectTab('medicines');
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#eff6ff] text-left text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-[#1d4ed8]" />
                    <span className="font-bold text-gray-900">Medicine reminder • Afternoon dose</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Medication</span>
                </button>

                <button
                  onMouseDown={() => {
                    onSelectTab('selfcare');
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-[#fdf4ff] text-left text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                    <span className="font-bold text-gray-900">Migraine & Diabetes Self-Care Guide</span>
                  </div>
                  <span className="text-[10px] text-gray-400">Clinical Protocol</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Quick Actions, Accessibility, Alerts & Profile */}
        <div className="flex items-center gap-2.5 justify-end min-w-[320px]">
          {/* Quick Upload CTA Button */}
          <button
            onClick={() => onNavigateToUpload('report')}
            className="hidden md:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0a7075] hover:bg-[#085a5e] text-white text-xs font-bold transition-all shadow-xs active:scale-98"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Document</span>
          </button>

          {/* Refill Alert Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationToast((prev) => !prev)}
              title="Notifications & Refill Alerts"
              className="relative w-8 h-8 rounded-xl bg-[#f4faf9] hover:bg-[#e6f5f4] border border-[#d8ecea] flex items-center justify-center text-gray-700 hover:text-[#0a7075] transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            </button>

            {showNotificationToast && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-[#d8ecea] p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-900">Notifications</span>
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                    1 Active Alert
                  </span>
                </div>
                <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60">
                  <div className="text-xs font-bold text-gray-900">Refill Reminder: Atorvastatin</div>
                  <p className="text-[11px] text-amber-900 mt-0.5 leading-snug">
                    Estimated 4 doses left. One-click refill ready with CVS Pharmacy.
                  </p>
                  <button
                    onClick={() => {
                      setShowNotificationToast(false);
                      onSelectTab('medicines');
                    }}
                    className="mt-2 text-[11px] font-bold text-[#0a7075] hover:underline"
                  >
                    View in Medications →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Font Size Accessibility Scaler */}
          <button
            onClick={onCycleFontSize}
            title={`Cycle font size (Current: ${fontSize})`}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#f4faf9] hover:bg-[#e6f5f4] border border-[#d8ecea] text-[#0a7075] text-xs font-bold transition-all"
          >
            <Type className="w-3.5 h-3.5" />
            <span className="text-[11px] font-extrabold uppercase">
              {fontSize === 'normal' ? 'Aa' : fontSize === 'large' ? 'Aa+' : 'Aa++'}
            </span>
          </button>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl hover:bg-[#f4faf9] transition-colors border border-transparent hover:border-[#d8ecea]"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0c6b73] to-[#14b8a6] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {initial}
              </div>
              <div className="text-left hidden lg:block">
                <div className="text-xs font-bold text-gray-900 leading-tight">{firstName}</div>
                <div className="text-[10px] text-gray-400 leading-tight">Patient Verified</div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-[#d8ecea] overflow-hidden z-50 p-1.5 animate-in fade-in duration-150">
                <div className="px-3 py-2.5 bg-[#f4faf9] rounded-xl mb-1">
                  <div className="text-xs font-bold text-gray-900">{profile.name}</div>
                  <div className="text-[11px] text-gray-500 truncate">{profile.caregiverLinked ? `Caregiver: ${profile.caregiverName}` : 'Patient Account'}</div>
                  <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Secure PHI Vault
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenMedicalHistory();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#e6f5f4] hover:text-[#0a7075] rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0a7075]" />
                  <span>Update Medical History</span>
                </button>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenSampleReport();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-[#e6f5f4] hover:text-[#0a7075] rounded-lg transition-colors flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#0a7075]" />
                  <span>View Sample Lab Report</span>
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onOpenAuth();
                  }}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── SaaS Body (Sidebar + Content Canvas) ───────────────────────────── */}
      <div className="flex-1 flex flex-row overflow-hidden">
        {/* ── Left Sidebar (250px) ─────────────────────────────────────────── */}
        <aside className="w-[250px] flex-shrink-0 bg-white border-r border-[#d8ecea] flex flex-col justify-between overflow-y-auto">
          {/* Top Section: Navigation Links */}
          <div className="p-3.5 space-y-4">
            {/* Patient Demographic Mini-Pill */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-[#f0faf9] to-[#e6f7f6] border border-[#cbebe8] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-[#0a7075] flex items-center justify-center font-extrabold text-sm shadow-xs border border-[#b2e2de]">
                {initial}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-extrabold text-gray-900 truncate">
                  {profile.name}
                </div>
                <div className="text-[10px] text-gray-500 truncate">Patient Account</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-semibold text-emerald-700">Active</span>
                </div>
              </div>
            </div>

            {/* Main Menu Links */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1">
                Menu
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all group ${
                      isActive
                        ? 'bg-[#0a7075] text-white shadow-xs'
                        : 'text-gray-700 hover:bg-[#f0faf9] hover:text-[#0a7075]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-white' : 'text-[#0a7075] group-hover:text-[#0a7075]'
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-[#e0f7f6] text-[#0a7075] group-hover:bg-white'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Clinical Tools */}
            <div className="space-y-1 pt-2 border-t border-gray-100">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-2 pb-1">
                Clinical AI Tools
              </div>
              {quickTools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.label}
                    onClick={() => onNavigateToUpload(tool.mode)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-[#f0faf9] hover:text-[#0a7075] transition-all group text-left"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${tool.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="truncate">{tool.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Section: Caregiver Connection & Help */}
          <div className="p-3.5 border-t border-[#d8ecea] space-y-2.5 bg-gradient-to-b from-transparent to-[#f4faf9]">
            {/* Caregiver connection pill */}
            <div className="px-3 py-2 rounded-xl bg-white border border-[#d8ecea] shadow-2xs">
              <div className="flex items-center justify-between text-[11px] font-bold text-gray-800">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0a7075]" /> Caregiver Sync
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[10.5px] text-gray-500 mt-0.5 truncate">
                {profile.caregiverName} connected
              </p>
            </div>

            {/* Sample Report link */}
            <button
              onClick={onOpenSampleReport}
              className="w-full py-1.5 px-2 text-center text-xs text-[#0a7075] hover:text-[#07595e] font-bold hover:underline transition-colors flex items-center justify-center gap-1"
            >
              <span>See Sample Lab Report</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        </aside>

        {/* ── Main Scrollable Content Canvas ───────────────────────────────── */}
        <main className="flex-1 bg-[#f0f9f8] overflow-y-auto p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
