import React from 'react';
import { Home, UploadCloud, Pill, History, Sparkles } from 'lucide-react';

export type NavTab = 'home' | 'upload' | 'medicines' | 'history' | 'selfcare';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const tabs = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'upload' as NavTab, label: 'Upload', icon: UploadCloud },
    { id: 'medicines' as NavTab, label: 'Medicines', icon: Pill },
    { id: 'history' as NavTab, label: 'History', icon: History },
    { id: 'selfcare' as NavTab, label: 'Self-Care', icon: Sparkles },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-[#d6ecea] px-2 py-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center transition-all duration-200 relative ${
                isActive
                  ? 'bg-[#0a7075] text-white px-3.5 py-1.5 rounded-full shadow-md shadow-[#0a7075]/25 scale-102'
                  : 'text-[#476366] hover:text-[#0a7075] px-2 py-1.5'
              }`}
            >
              <Icon className={`${isActive ? 'w-4 h-4 stroke-[2.2]' : 'w-4 h-4 stroke-[1.8]'}`} />
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-semibold text-white' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
