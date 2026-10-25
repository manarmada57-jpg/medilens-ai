import React from 'react';
import { Activity, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';

interface HeaderProps {
  profile: UserProfile;
  fontSize: 'normal' | 'large' | 'xlarge';
  onCycleFontSize: () => void;
  onOpenAuth: () => void;
  onOpenMedicalHistory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  profile,
  fontSize,
  onCycleFontSize,
  onOpenAuth,
  onOpenMedicalHistory,
}) => {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  return (
    <header className="w-full bg-[#ebf7f6]/90 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#d8ecea] sticky top-0 z-30 transition-colors">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0a7075] to-[#0ea5a8] flex items-center justify-center text-white shadow-sm shadow-[#0a7075]/20">
          <Activity className="w-5 h-5 stroke-[2.5]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 leading-tight">
            <span className="font-bold text-gray-900 tracking-tight text-lg">MediLens AI</span>
          </div>
          <span className="text-[11px] font-medium text-[#0a7075] block leading-none">Care Assistant</span>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 relative">
        {/* Text Size Accessibility Toggle */}
        <button
          onClick={onCycleFontSize}
          title={`Accessibility Text Size: ${fontSize.toUpperCase()}`}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#daf1ef] hover:bg-[#cbebe8] active:scale-95 text-[#0a7075] text-xs font-semibold border border-[#b2e2de] transition-all shadow-xs"
        >
          <span className="tracking-tighter font-extrabold text-[13px]">Tt</span>
          <span className="text-[11px] font-bold">
            {fontSize === 'normal' ? 'A+' : fontSize === 'large' ? 'A++' : 'A'}
          </span>
        </button>

        {/* Caregiver Linked Profile Badge */}
        <button
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          title="Account & Caregiver sync settings"
          className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-white/80 hover:bg-white text-gray-800 text-xs border border-[#cfedea] shadow-xs active:scale-95 transition-all"
        >
          <div className="w-6 h-6 rounded-full bg-[#0a7075] text-white flex items-center justify-center text-[10px] font-bold tracking-tight">
            ER
          </div>
          <div className="text-left hidden xs:block">
            <div className="font-semibold text-[11px] leading-tight text-gray-900">
              {profile.name} {profile.caregiverName ? `& ${profile.caregiverName}` : ''}
            </div>
            <div className="text-[9.5px] text-[#0a7075] font-medium flex items-center gap-0.5 leading-none">
              <ShieldCheck className="w-2.5 h-2.5" />
              <span>{profile.caregiverLinked ? 'Caregiver linked' : 'Patient account'}</span>
            </div>
          </div>
        </button>

        {/* Profile Dropdown Menu */}
        {showProfileMenu && (
          <div className="absolute right-0 top-11 w-56 rounded-2xl bg-white shadow-xl border border-[#d8ecea] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3.5 py-2 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-900">{profile.name}</p>
              <p className="text-[11px] text-gray-500">
                {profile.caregiverName ? `Caregiver: ${profile.caregiverName}` : 'Self managed'}
              </p>
            </div>

            {onOpenMedicalHistory && (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  onOpenMedicalHistory();
                }}
                className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-[#f0faf9] hover:text-[#0a7075] flex items-center gap-2 transition-colors font-medium"
              >
                <span>🩺</span>
                <span>Medical Profile & History</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowProfileMenu(false);
                onOpenAuth();
              }}
              className="w-full text-left px-3.5 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors font-medium border-t border-gray-50 mt-1"
            >
              <span>🚪</span>
              <span>Sign Out / Switch Account</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
