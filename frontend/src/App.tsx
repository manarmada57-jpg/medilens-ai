import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { UploadScreen } from './components/UploadScreen';
import { MedicinesScreen } from './components/MedicinesScreen';
import { SelfCareScreen } from './components/SelfCareScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { AuthScreen } from './components/AuthScreen';
import { MedicalHistoryScreen } from './components/MedicalHistoryScreen';
import { DocumentModal } from './components/DocumentModal';
import { PharmacyModal } from './components/PharmacyModal';
import { AddMedicineModal } from './components/AddMedicineModal';
import { SkinResultModal } from './components/SkinResultModal';
import { ConsentDeleteDataModal } from './components/ConsentDeleteDataModal';

// Desktop Components
import { DesktopLayout } from './components/DesktopLayout';
import { DesktopHomeScreen } from './components/DesktopHomeScreen';
import { DesktopMedicinesScreen } from './components/DesktopMedicinesScreen';
import { DesktopHistoryScreen } from './components/DesktopHistoryScreen';

// Types and APIs
import {
  HealthDocument,
  Medication,
  UserProfile,
  MedicalHistory,
  SkinAnalysisResult,
  RefillAlert,
} from './types';
import {
  authApi,
  profileApi,
  summaryApi,
  documentsApi,
  medicinesApi,
  tokenStorage,
  metaApi,
} from './api';

export default function App() {
  // 'checking' prevents a flash of the login screen while we validate the stored token
  const [flowStep, setFlowStep] = useState<'checking' | 'login' | 'medical_history' | 'dashboard'>('checking');
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [historySubTab, setHistorySubTab] = useState<'records' | 'selfcare'>('records');
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [saveHistoryError, setSaveHistoryError] = useState<string | null>(null);
  const [isSavingHistory, setIsSavingHistory] = useState(false);

  // Upload routing state
  const [uploadMode, setUploadMode] = useState<'report' | 'prescription' | 'image'>('report');
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);

  // Desktop Responsive State
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeDesktopMode = isDesktop;

  // Data states
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Patient',
    role: 'patient',
    caregiverName: '',
    caregiverLinked: false,
    activeReportsCount: 0,
    upcomingMedsCount: 0,
  });

  const [medications, setMedications] = useState<Medication[]>([]);
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [refillAlerts, setRefillAlerts] = useState<RefillAlert[]>([]);
  const [activeDocument, setActiveDocument] = useState<HealthDocument | null>(null);
  const [activeSkinResult, setActiveSkinResult] = useState<SkinAnalysisResult | null>(null);
  const [showPharmacyModal, setShowPharmacyModal] = useState(false);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState('112');

  // Sync text-size scaling to root document element for rem accessibility
  useEffect(() => {
    const fontClass =
      fontSize === 'large'
        ? 'font-scale-large'
        : fontSize === 'xlarge'
        ? 'font-scale-xlarge'
        : 'font-scale-normal';
    document.documentElement.className = fontClass;
  }, [fontSize]);

  // Load all dashboard data from API
  const loadUserData = async (): Promise<{ medicalHistory: MedicalHistory | null }> => {
    let resolvedHistory: MedicalHistory | null = null;
    try {
      const token = tokenStorage.getAccessToken();
      if (!token) return { medicalHistory: null };

      // Fetch user and profile summary in parallel; individual failures are tolerated
      const [user, summary, history, docsList, medsList, alerts] = await Promise.allSettled([
        authApi.getMe(),
        summaryApi.getSummary(),
        profileApi.getMedicalHistory(),
        documentsApi.getDocuments(),
        medicinesApi.getMedicines(),
        medicinesApi.getRefillAlerts(),
      ]);

      if (user.status === 'fulfilled') {
        const u = user.value;
        setProfile((prev) => ({
          ...prev,
          name: u.name || prev.name,
        }));
      }

      if (summary.status === 'fulfilled') {
        const s = summary.value;
        setProfile((prev) => ({
          ...prev,
          name: s.name || prev.name,
          caregiverName: s.caregiverName || prev.caregiverName,
          caregiverLinked: s.caregiverLinked ?? prev.caregiverLinked,
          activeReportsCount: s.activeReportsCount,
          upcomingMedsCount: s.upcomingMedsCount,
        }));
      }

      if (history.status === 'fulfilled') {
        resolvedHistory = history.value;
        setMedicalHistory(history.value);
      }

      if (docsList.status === 'fulfilled') {
        setDocuments(docsList.value);
      }

      if (medsList.status === 'fulfilled') {
        setMedications(medsList.value);
      }

      if (alerts.status === 'fulfilled') {
        setRefillAlerts(alerts.value);
      }
    } catch {
      // Graceful fallback
    }
    return { medicalHistory: resolvedHistory };
  };

  // Session restore: check token on mount, route to login if missing
  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!token) {
      setFlowStep('login');
      return;
    }
    // Token present — load data, then decide which step to show
    loadUserData().then(({ medicalHistory: historyData }) => {
      // If user has not completed medical history intake yet, show it first
      const hasHistory =
        historyData &&
        (historyData.dob ||
          historyData.sex ||
          (historyData.conditions && historyData.conditions.length > 0) ||
          historyData.specificAllergen ||
          (historyData.currentMedicines && historyData.currentMedicines.length > 0));

      if (!hasHistory) {
        setFlowStep('medical_history');
      } else {
        setFlowStep('dashboard');
      }
    });

    metaApi.getEmergencyMeta().then((meta) => {
      if (meta && meta.primary) {
        setEmergencyPhone(meta.primary);
      }
    }).catch(() => {});

    // Listen for forced logout (e.g. token refresh failed mid-session)
    const handleForcedLogout = () => {
      tokenStorage.clear();
      setFlowStep('login');
    };
    window.addEventListener('medilens:logout', handleForcedLogout);
    return () => window.removeEventListener('medilens:logout', handleForcedLogout);
  }, []);

  // Accessibility font cycle
  const handleCycleFontSize = () => {
    setFontSize((prev) => {
      if (prev === 'normal') return 'large';
      if (prev === 'large') return 'xlarge';
      return 'normal';
    });
  };

  // Medication dose logging
  const handleTakeMedication = async (id: string) => {
    const med = medications.find((m) => m.id === id);
    if (!med) return;

    const newTaken = !med.taken;
    const nowTime = new Date().toTimeString().substring(0, 5);
    const nowDate = new Date().toISOString().substring(0, 10);

    // Optimistic UI update
    setMedications((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          return {
            ...m,
            taken: newTaken,
            dueStatus: newTaken ? 'Taken just now' : 'Scheduled',
            dueStatusType: newTaken ? 'taken' : 'upcoming',
          };
        }
        return m;
      })
    );

    try {
      await medicinesApi.logDose(id, {
        date: nowDate,
        time: nowTime,
        status: newTaken ? 'taken' : 'pending',
      });
    } catch {
      // Logged locally
    }
  };

  const handleSnoozeMedication = async (id: string) => {
    setMedications((prev) =>
      prev.map((med) => {
        if (med.id === id) {
          return {
            ...med,
            dueStatus: 'Snoozed for 15 mins',
            dueStatusType: 'due-soon',
          };
        }
        return med;
      })
    );
    try {
      await medicinesApi.snoozeMedicine(id, 15);
    } catch {
      // Local fallback
    }
  };

  const handleAddMedicine = (newMed: Medication) => {
    setMedications((prev) => [...prev, newMed]);
    setProfile((prev) => ({
      ...prev,
      upcomingMedsCount: prev.upcomingMedsCount + 1,
    }));
  };

  const handleSaveMedicalHistory = async (data: MedicalHistory) => {
    setIsSavingHistory(true);
    setSaveHistoryError(null);
    try {
      const saved = await profileApi.saveMedicalHistory(data);
      if (saved) {
        setMedicalHistory(saved);
      }
      // Refresh user summary and medicine lists
      await loadUserData();
      setFlowStep('dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save medical history to server';
      setSaveHistoryError(msg);
      // Stay on the medical history form so the user can review and retry
    } finally {
      setIsSavingHistory(false);
    }
  };

  const handleSkipMedicalHistory = () => {
    setSaveHistoryError(null);
    setFlowStep('dashboard');
  };

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch {
      // Continue cleanup
    } finally {
      tokenStorage.clear();
      setProfile({
        name: 'Patient',
        role: 'patient',
        caregiverName: '',
        caregiverLinked: false,
        activeReportsCount: 0,
        upcomingMedsCount: 0,
      });
      setMedications([]);
      setDocuments([]);
      setMedicalHistory(null);
      setFlowStep('login');
    }
  };

  const handleNavigateToUpload = (mode?: 'report' | 'prescription' | 'image', file?: File) => {
    setUploadMode(mode || 'report');
    setPendingUploadFile(file || null);
    setCurrentTab('upload');
  };

  // Step 0: Checking stored session — show nothing to avoid flash
  if (flowStep === 'checking') {
    return (
      <div className="min-h-screen bg-[#ebf7f6] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-[#0a7075] border-t-transparent animate-spin" />
          <p className="text-sm font-semibold text-[#0a7075]">Loading…</p>
        </div>
      </div>
    );
  }

  // Step 1: Login / Auth View
  if (flowStep === 'login') {
    return (
      <div className="min-h-screen">
        <AuthScreen
          onSuccess={async (user, isNewUser) => {
            setProfile((prev) => ({ ...prev, name: user.name || prev.name }));
            const loaded = await loadUserData();
            const historyData = loaded?.medicalHistory;
            const hasHistory =
              historyData &&
              (historyData.dob ||
                historyData.sex ||
                (historyData.conditions && historyData.conditions.length > 0) ||
                historyData.specificAllergen ||
                (historyData.currentMedicines && historyData.currentMedicines.length > 0));

            if (isNewUser || !hasHistory) {
              setFlowStep('medical_history');
            } else {
              setFlowStep('dashboard');
            }
          }}
        />
      </div>
    );
  }

  // Step 2: Medical History Intake
  if (flowStep === 'medical_history') {
    return (
      <div className="min-h-screen">
        <MedicalHistoryScreen
          initialData={medicalHistory}
          errorMessage={saveHistoryError}
          isSaving={isSavingHistory}
          onSave={handleSaveMedicalHistory}
          onSkip={handleSkipMedicalHistory}
        />
      </div>
    );
  }

  // Step 3: Main Dashboard Screens
  const renderMobileContent = () => {
    switch (currentTab) {
      case 'home':
        return (
          <HomeScreen
            profile={profile}
            medications={medications}
            documents={documents}
            medicalHistory={medicalHistory}
            onTakeMedication={handleTakeMedication}
            onSnoozeMedication={handleSnoozeMedication}
            onSelectDocument={(doc) => {
              const fullDoc = documents.find((d) => d.id === doc.id) || doc;
              setActiveDocument(fullDoc);
            }}
            onNavigateToUpload={handleNavigateToUpload}
            onOpenSampleReport={() => {
              if (documents.length > 0) setActiveDocument(documents[0]);
            }}
            onEditMedicalHistory={() => setFlowStep('medical_history')}
          />
        );

      case 'upload':
        return (
          <UploadScreen
            onBack={() => setCurrentTab('home')}
            onViewCompletedDocument={(doc) => {
              setActiveDocument(doc);
              setDocuments((prev) => (prev.some((d) => d.id === doc.id) ? prev : [doc, ...prev]));
              setProfile((p) => ({ ...p, activeReportsCount: p.activeReportsCount + 1 }));
            }}
            onViewSkinResult={(skinRes) => {
              setActiveSkinResult(skinRes);
            }}
            fontSize={fontSize}
            onCycleFontSize={handleCycleFontSize}
            initialMode={uploadMode}
            initialFile={pendingUploadFile}
          />
        );

      case 'medicines':
        return (
          <MedicinesScreen
            profile={profile}
            medications={medications}
            refillAlert={refillAlerts[0]}
            onTakeMedication={handleTakeMedication}
            onSnoozeMedication={handleSnoozeMedication}
            onOpenAddModal={() => setShowAddMedicineModal(true)}
            onOpenPharmacyModal={() => setShowPharmacyModal(true)}
            fontSize={fontSize}
            onCycleFontSize={handleCycleFontSize}
          />
        );

      case 'history':
        return (
          <HistoryScreen
            profile={profile}
            medicalHistory={medicalHistory}
            documents={documents}
            onSelectDocument={(doc) => {
              const fullDoc = documents.find((d) => d.id === doc.id) || doc;
              setActiveDocument(fullDoc);
            }}
            onEditMedicalHistory={() => setFlowStep('medical_history')}
            onNavigateToUpload={() => handleNavigateToUpload('report')}
            fontSize={fontSize}
            onCycleFontSize={handleCycleFontSize}
            initialSubTab={historySubTab}
          />
        );

      case 'selfcare':
        return (
          <SelfCareScreen
            onBack={() => setCurrentTab('history')}
            fontSize={fontSize}
            onCycleFontSize={handleCycleFontSize}
            initialCondition={medicalHistory?.conditions?.[0] || 'migraine'}
          />
        );

      default:
        return null;
    }
  };

  const renderDesktopContent = () => {
    switch (currentTab) {
      case 'home':
        return (
          <DesktopHomeScreen
            profile={profile}
            medications={medications}
            documents={documents}
            medicalHistory={medicalHistory}
            onTakeMedication={handleTakeMedication}
            onSnoozeMedication={handleSnoozeMedication}
            onSelectDocument={(doc) => {
              const fullDoc = documents.find((d) => d.id === doc.id) || doc;
              setActiveDocument(fullDoc);
            }}
            onNavigateToUpload={handleNavigateToUpload}
            onOpenSampleReport={() => {
              if (documents.length > 0) setActiveDocument(documents[0]);
            }}
            onEditMedicalHistory={() => setFlowStep('medical_history')}
          />
        );

      case 'upload':
        return (
          <div className="max-w-3xl mx-auto">
            <UploadScreen
              onBack={() => setCurrentTab('home')}
              onViewCompletedDocument={(doc) => {
                setActiveDocument(doc);
                setDocuments((prev) => (prev.some((d) => d.id === doc.id) ? prev : [doc, ...prev]));
                setProfile((p) => ({ ...p, activeReportsCount: p.activeReportsCount + 1 }));
              }}
              onViewSkinResult={(skinRes) => {
                setActiveSkinResult(skinRes);
              }}
              fontSize={fontSize}
              onCycleFontSize={handleCycleFontSize}
              initialMode={uploadMode}
              initialFile={pendingUploadFile}
            />
          </div>
        );

      case 'medicines':
        return (
          <DesktopMedicinesScreen
            profile={profile}
            medications={medications}
            refillAlert={refillAlerts[0]}
            onTakeMedication={handleTakeMedication}
            onSnoozeMedication={handleSnoozeMedication}
            onOpenAddModal={() => setShowAddMedicineModal(true)}
            onOpenPharmacyModal={() => setShowPharmacyModal(true)}
            fontSize={fontSize}
            onCycleFontSize={handleCycleFontSize}
          />
        );

      case 'history':
        return (
          <DesktopHistoryScreen
            profile={profile}
            medicalHistory={medicalHistory}
            documents={documents}
            onSelectDocument={(doc) => {
              const fullDoc = documents.find((d) => d.id === doc.id) || doc;
              setActiveDocument(fullDoc);
            }}
            onEditMedicalHistory={() => setFlowStep('medical_history')}
            onNavigateToUpload={() => handleNavigateToUpload('report')}
            fontSize={fontSize}
            onCycleFontSize={handleCycleFontSize}
            initialSubTab={historySubTab}
          />
        );

      case 'selfcare':
        return (
          <div className="bg-white rounded-3xl border border-[#d8ecea] p-6 lg:p-8 shadow-xs max-w-4xl mx-auto">
            <SelfCareScreen
              onBack={() => setCurrentTab('history')}
              fontSize={fontSize}
              onCycleFontSize={handleCycleFontSize}
              initialCondition={medicalHistory?.conditions?.[0] || 'migraine'}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen text-gray-900">
      {saveHistoryError && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-700 px-4 py-2.5 flex items-center justify-between text-sm z-50 sticky top-0">
          <span>{saveHistoryError}</span>
          <button onClick={() => setSaveHistoryError(null)} className="font-bold text-rose-500 hover:text-rose-800 ml-4">×</button>
        </div>
      )}
      {/* ── Desktop or Mobile Layout ── */}
      {activeDesktopMode ? (
        <DesktopLayout
          profile={profile}
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          fontSize={fontSize}
          onCycleFontSize={handleCycleFontSize}
          onOpenAuth={() => {
            if (tokenStorage.getAccessToken()) {
              handleSignOut();
            } else {
              setFlowStep('login');
            }
          }}
          onOpenMedicalHistory={() => setFlowStep('medical_history')}
          onOpenConsentModal={() => setShowConsentModal(true)}
          onNavigateToUpload={handleNavigateToUpload}
          onOpenSampleReport={() => {
            if (documents.length > 0) setActiveDocument(documents[0]);
          }}
        >
          {renderDesktopContent()}
        </DesktopLayout>
      ) : (
        /* Mobile Layout */
        <div className="min-h-screen bg-[#e8f6f5] flex justify-center">
          <div className="w-full max-w-md min-h-screen bg-[#ebf7f6] flex flex-col sm:shadow-2xl sm:border-x sm:border-[#d0ece8] relative">
            {currentTab === 'home' && (
              <Header
                profile={profile}
                fontSize={fontSize}
                onCycleFontSize={handleCycleFontSize}
                onOpenAuth={() => {
                  if (tokenStorage.getAccessToken()) {
                    handleSignOut();
                  } else {
                    setFlowStep('login');
                  }
                }}
                onOpenMedicalHistory={() => setFlowStep('medical_history')}
                onOpenConsentModal={() => setShowConsentModal(true)}
              />
            )}

            <main className="flex-1 overflow-y-auto">{renderMobileContent()}</main>

            <BottomNav
              currentTab={currentTab}
              onSelectTab={(tab) => {
                setCurrentTab(tab);
              }}
            />
          </div>
        </div>
      )}

      {/* Global Modals */}
      {/* 1. Document Detail Reader */}
      {activeDocument && (
        <DocumentModal
          document={activeDocument}
          onClose={() => setActiveDocument(null)}
          onOpenSelfCareGuide={() => {
            setActiveDocument(null);
            setHistorySubTab('selfcare');
            setCurrentTab('history');
          }}
        />
      )}

      {/* 2. Skin / Health Image Observation Modal */}
      {activeSkinResult && (
        <SkinResultModal
          result={activeSkinResult}
          onClose={() => setActiveSkinResult(null)}
          emergencyNumber={emergencyPhone}
        />
      )}

      {/* 3. Pharmacy Refill Modal */}
      {showPharmacyModal && refillAlerts[0] && (
        <PharmacyModal
          refill={refillAlerts[0]}
          onClose={() => setShowPharmacyModal(false)}
          onMarkRefilled={(medName) => {
            setMedications((prev) =>
              prev.map((m) =>
                m.name.includes(medName) ? { ...m, pillsLeft: 30 } : m
              )
            );
          }}
        />
      )}

      {/* 4. Add Medicine Modal */}
      {showAddMedicineModal && (
        <AddMedicineModal
          onClose={() => setShowAddMedicineModal(false)}
          onAdd={handleAddMedicine}
        />
      )}

      {/* 5. Privacy Consent & Delete Data Modal */}
      {showConsentModal && (
        <ConsentDeleteDataModal
          isOpen={showConsentModal}
          onClose={() => setShowConsentModal(false)}
          userName={profile.name}
          userEmail={profile.caregiverName || undefined}
        />
      )}
    </div>
  );
}
