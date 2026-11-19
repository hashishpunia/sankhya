import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  BookOpen,
  Calculator,
  ClipboardCheck,
  Flame,
  Home,
  Settings,
} from 'lucide-react';
import { AdminPanelView } from './components/AdminPanelView';
import { AppPromotionBanner } from './components/AppPromotionBanner';
import { AppSettingsModal } from './components/AppSettingsModal';
import { HomeDashboard } from './components/HomeDashboard';
import { LoginScreen } from './components/LoginScreen';
import { MockTestsView, type MockTestCategory } from './components/MockTestsView';
import { OnboardingTour, type TourTabId } from './components/OnboardingTour';
import { PerformanceView } from './components/PerformanceView';
import { PracticeAndTestView, type PracticePreselection } from './components/PracticeAndTestView';
import { PracticeSessionRunner } from './components/PracticeSessionRunner';
import { ProfileSettingsView } from './components/ProfileSettingsView';
import { RevisionView } from './components/RevisionView';
import { PlatformProvider, usePlatform } from './context/PlatformContext';
import { getLocalDateStr } from './db/offlineDb';
import { buildSessionQuestions } from './engine/questionGenerator';
import { t } from './i18n/translations';
import type { PracticeSession, SessionLaunchConfig } from './types/math';

type MainTab = 'home' | 'practice' | 'mock_tests' | 'revision' | 'performance' | 'admin' | 'profile';

const AppShell: React.FC = () => {
  const {
    ready,
    activeUserId,
    firebaseUser,
    isGuest,
    isAdmin,
    userProfile,
    guestProfile,
    questions,
    generatorConfigs,
    settings,
    stats,
    dailyActivities,
    persistSessionProgress,
  } = usePlatform();

  const lang = settings.language;
  const [activeTab, setActiveTab] = useState<MainTab>('home');
  const [activeSession, setActiveSession] = useState<PracticeSession | null>(null);
  const [lastLaunchConfig, setLastLaunchConfig] = useState<SessionLaunchConfig | null>(null);
  const [practicePreselection, setPracticePreselection] = useState<PracticePreselection | null>(null);
  const [mockTestNavState, setMockTestNavState] = useState<{
    category: MockTestCategory;
    openAdvanced?: boolean;
    nonce: number;
  }>({ category: 'anytime', openAdvanced: false, nonce: 0 });
  const [notifOpen, setNotifOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [guestEntered, setGuestEntered] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sankhyaprep_guest_entered') === '1';
    } catch {
      return false;
    }
  });
  const [forceLoginScreen, setForceLoginScreen] = useState(false);
  const wasSignedInRef = useRef(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const onboardingKey = `sankhyaprep_onboarding_v1_${activeUserId}`;
  const showLoginScreen = ready && (forceLoginScreen || (isGuest && !guestEntered));

  useEffect(() => {
    if (!ready) return;
    if (!isGuest) {
      wasSignedInRef.current = true;
      setForceLoginScreen(false);
    } else if (wasSignedInRef.current) {
      wasSignedInRef.current = false;
      try {
        localStorage.removeItem('sankhyaprep_guest_entered');
      } catch {
        // Ignore storage access errors
      }
      setGuestEntered(false);
      setForceLoginScreen(false);
      setActiveSession(null);
      setActiveTab('home');
    }
  }, [ready, isGuest]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (notifMenuRef.current && !notifMenuRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // Auto-launch onboarding tour on first visit or first authenticated login (after LoginScreen is dismissed)
  useEffect(() => {
    if (!ready || activeSession || showLoginScreen) return;
    try {
      if (!localStorage.getItem(onboardingKey)) {
        const timer = window.setTimeout(() => {
          setTourOpen(true);
        }, 350);
        return () => window.clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors
    }
  }, [ready, activeSession, showLoginScreen, onboardingKey]);

  const handleTourNavigateTab = useCallback((tab: TourTabId) => {
    setActiveSession(null);
    if (tab === 'practice') {
      setPracticePreselection({ subMode: 'topics', filter: 'all', nonce: Date.now() });
    } else {
      setPracticePreselection(null);
    }
    if (tab === 'mock_tests') {
      setMockTestNavState({ category: 'anytime', nonce: Date.now() });
    }
    setActiveTab(tab);
  }, []);

  const handleTourDemoPractice = useCallback((mode: 'grid' | 'setup') => {
    setActiveSession(null);
    setActiveTab('practice');
    setPracticePreselection({
      topicId: mode === 'setup' ? 'squares' : undefined,
      subMode: 'topics',
      filter: 'all',
      nonce: Date.now(),
    });
  }, []);

  const handleTourDemoMockTests = useCallback((cat: MockTestCategory, openAdvanced?: boolean) => {
    setActiveSession(null);
    setActiveTab('mock_tests');
    setMockTestNavState({ category: cat, openAdvanced, nonce: Date.now() });
  }, []);

  const handleTourClose = useCallback(
    (action?: 'home' | 'practice') => {
      try {
        localStorage.setItem(onboardingKey, 'done');
      } catch {
        // Ignore storage access errors
      }
      setTourOpen(false);
      if (action === 'practice') {
        setActiveSession(null);
        setPracticePreselection({ subMode: 'topics', filter: 'all', nonce: Date.now() });
        setActiveTab('practice');
      } else if (action === 'home') {
        setActiveSession(null);
        setPracticePreselection(null);
        setActiveTab('home');
      }
    },
    [onboardingKey]
  );

  // Ensure non-admin users cannot remain on the admin tab
  useEffect(() => {
    if (activeTab === 'admin' && (isGuest || !isAdmin)) {
      setActiveTab('home');
    }
  }, [activeTab, isGuest, isAdmin]);

  const openMockTests = (cat: MockTestCategory = 'anytime') => {
    setActiveSession(null);
    setPracticePreselection(null);
    setMockTestNavState({ category: cat, nonce: Date.now() });
    setActiveTab('mock_tests');
  };

  const openPractice = (opts?: {
    topicId?: string;
    subMode?: 'topics' | 'test';
    testCategory?: MockTestCategory;
    filter?: 'all' | 'cat_quick_recall' | 'cat_basics';
  }) => {
    if (opts?.subMode === 'test') {
      openMockTests(opts.testCategory ?? 'anytime');
      return;
    }
    setActiveSession(null);
    setPracticePreselection({
      topicId: opts?.topicId,
      subMode: 'topics',
      filter: opts?.filter ?? 'all',
      nonce: Date.now(),
    });
    setActiveTab('practice');
  };

  const launchSession = async (config: SessionLaunchConfig) => {
    const builtQuestions = buildSessionQuestions(config, questions, generatorConfigs);
    const session: PracticeSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: activeUserId,
      mode: config.mode,
      topicId: config.topicId,
      topicName: config.topicName,
      difficulty: config.difficulty,
      totalQuestions: builtQuestions.length,
      unlimited: Boolean(config.unlimited),
      attemptedQuestions: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      skippedQuestions: 0,
      score: 0,
      negativeMarking: config.negativeMarking ?? 0,
      accuracy: 0,
      totalTimeSec: 0,
      avgTimePerQuestionSec: 0,
      status: 'in_progress',
      startedAtIso: new Date().toISOString(),
      instantFeedback: config.instantFeedback,
      timed: config.timed,
      timeLimitSec: config.timeLimitSec,
      questionsSnapshot: builtQuestions,
      answersSnapshot: {},
      currentIndex: 0,
    };

    await persistSessionProgress(session);
    setLastLaunchConfig(config);
    setActiveSession(session);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f3f6fc] dark:bg-[#090f1e] text-slate-600 dark:text-slate-300 text-sm">
        Loading practice modules...
      </div>
    );
  }

  if (showLoginScreen) {
    return (
      <LoginScreen
        canReturnToGuest={guestEntered}
        onContinueAsGuest={() => {
          try {
            localStorage.setItem('sankhyaprep_guest_entered', '1');
          } catch {
            // Ignore storage access errors
          }
          setGuestEntered(true);
          setForceLoginScreen(false);
        }}
      />
    );
  }

  const todayStr = getLocalDateStr();
  const todayActivity = dailyActivities.find((d) => d.date === todayStr);
  const attemptedToday = todayActivity?.questionsAttempted ?? 0;
  const displayName = isGuest ? guestProfile.fullName : userProfile?.fullName || 'Student';
  const avatarInitial = (displayName.trim()[0] || 'S').toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fc] dark:bg-[#090f1e] text-slate-900 dark:text-slate-100 pb-16 lg:pb-0">
      {/* Clean Single Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#0e1629]/95 backdrop-blur border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-[1320px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <button
            onClick={() => {
              setActiveSession(null);
              setActiveTab('home');
            }}
            className="text-left flex flex-col items-start justify-center whitespace-nowrap shrink-0"
          >
            <span className="text-lg font-extrabold leading-none tracking-tight bg-gradient-to-r from-indigo-700 to-blue-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
              SankhyaPrep
            </span>
            <span className="text-[10px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
              Powered by Exam Lens
            </span>
          </button>

          {/* 5 Clear Student Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium">
            {(
              [
                { id: 'home', label: t(lang, 'navHome') },
                { id: 'practice', label: t(lang, 'navPractice') },
                { id: 'mock_tests', label: t(lang, 'navMockTests') },
                { id: 'revision', label: t(lang, 'navRevision') },
                { id: 'performance', label: t(lang, 'navPerformance') },
              ] as Array<{ id: MainTab; label: string }>
            ).map((item) => (
              <button
                key={item.id}
                data-tour-tab={item.id}
                onClick={() => {
                  setActiveSession(null);
                  if (item.id === 'practice') {
                    setPracticePreselection({ subMode: 'topics', filter: 'all', nonce: Date.now() });
                  } else {
                    setPracticePreselection(null);
                  }
                  setActiveTab(item.id);
                }}
                className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  !activeSession && activeTab === item.id
                    ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300 font-semibold'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* User Controls: Settings Gear + Notification Bell + 40x40 Circular User Avatar */}
          <div className="flex items-center gap-2.5 shrink-0" ref={notifMenuRef}>
            {/* Dedicated Settings Gear */}
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                setSettingsModalOpen(true);
              }}
              aria-label={lang === 'hi' ? 'ऐप सेटिंग्स खोलें' : 'Open App Settings'}
              title={lang === 'hi' ? 'ऐप सेटिंग्स' : 'App Settings'}
              className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition-colors shrink-0"
            >
              <Settings className="w-4.5 h-4.5" />
            </button>

            {/* Compact Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                aria-label={lang === 'hi' ? 'दैनिक लक्ष्य व अनुस्मारक' : 'Daily study reminders'}
                title={lang === 'hi' ? 'अध्ययन स्थिति' : 'Study status & alerts'}
                className="w-10 h-10 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 transition-colors shrink-0"
              >
                <Bell className="w-4.5 h-4.5" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-700 shadow-xl p-4 z-40 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      {lang === 'hi' ? 'दैनिक अध्ययन स्थिति' : 'Study Reminders'}
                    </span>
                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-amber-600 dark:text-amber-400">
                      <Flame className="w-3.5 h-3.5" />
                      {stats.currentStreak}d
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    {lang === 'hi' ? 'आज का लक्ष्य:' : "Today's Goal:"}{' '}
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {attemptedToday} / {settings.dailyTarget} Qs
                    </span>
                    {attemptedToday >= settings.dailyTarget
                      ? lang === 'hi'
                        ? ' — लक्ष्य पूर्ण!'
                        : ' — Completed!'
                      : lang === 'hi'
                        ? ` — ${settings.dailyTarget - attemptedToday} प्रश्न शेष`
                        : ` — ${settings.dailyTarget - attemptedToday} remaining`}
                  </p>
                  <div className="pt-2 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        openMockTests('events');
                      }}
                      className="font-semibold text-teal-600 dark:text-teal-400 hover:underline"
                    >
                      {lang === 'hi' ? 'लाइव टेस्ट देखें' : 'Test Events →'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        setActiveSession(null);
                        setActiveTab('revision');
                      }}
                      className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {lang === 'hi' ? 'सूत्र दोहराएं' : 'Revision →'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Circular User Avatar (40px x 40px) */}
            <button
              type="button"
              onClick={() => {
                setNotifOpen(false);
                setActiveSession(null);
                setActiveTab('profile');
              }}
              aria-label={displayName}
              title={isGuest ? `${displayName} · ${t(lang, 'navProfile')}` : displayName}
              className={`w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shrink-0 transition-all shadow-sm ${
                activeTab === 'profile'
                  ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 ring-offset-2 ring-offset-white dark:ring-offset-[#0e1629]'
                  : 'hover:ring-2 hover:ring-indigo-400/70'
              }`}
            >
              {firebaseUser?.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 object-cover rounded-full"
                />
              ) : (
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white font-bold text-sm flex items-center justify-center">
                  {avatarInitial}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1320px] w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {!activeSession && <AppPromotionBanner className="mb-5" />}
        {activeSession ? (
          <PracticeSessionRunner
            key={activeSession.id}
            initialSession={activeSession}
            launchConfig={lastLaunchConfig}
            onExit={() => setActiveSession(null)}
            onRestart={lastLaunchConfig ? () => void launchSession(lastLaunchConfig) : undefined}
          />
        ) : activeTab === 'home' ? (
          <HomeDashboard
            onNavigate={(tab) => {
              setPracticePreselection(null);
              setActiveTab(tab);
            }}
            onOpenPractice={openPractice}
            onResumeSession={(sess) => setActiveSession(sess)}
          />
        ) : activeTab === 'practice' ? (
          <PracticeAndTestView
            onStartSession={(cfg) => void launchSession(cfg)}
            onOpenMockTests={() => openMockTests('anytime')}
            preselection={practicePreselection}
          />
        ) : activeTab === 'mock_tests' ? (
          <MockTestsView
            initialCategory={mockTestNavState.category}
            initialNonce={mockTestNavState.nonce}
            initialShowAdvanced={mockTestNavState.openAdvanced}
            onStartSession={(cfg) => void launchSession(cfg)}
            onOpenProfile={() => setActiveTab('profile')}
          />
        ) : activeTab === 'revision' ? (
          <RevisionView
            onStartRevisionQuiz={(cfg) => void launchSession(cfg)}
            onOpenTopicPracticeSetup={(topicId) => openPractice({ topicId })}
          />
        ) : activeTab === 'performance' ? (
          <PerformanceView onStartTopicPractice={(cfg) => void launchSession(cfg)} />
        ) : activeTab === 'admin' && !isGuest && isAdmin ? (
          <AdminPanelView />
        ) : (
          <ProfileSettingsView
            onOpenAdminStudio={!isGuest && isAdmin ? () => setActiveTab('admin') : undefined}
            onOpenSettings={() => setSettingsModalOpen(true)}
            onOpenLoginScreen={isGuest ? () => setForceLoginScreen(true) : undefined}
            onStartTour={() => {
              setActiveSession(null);
              setPracticePreselection(null);
              setActiveTab('home');
              setTourOpen(true);
            }}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {!activeSession && (
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#0e1629]/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 h-14">
          {(
            [
              { id: 'home', icon: Home, label: t(lang, 'navHome') },
              { id: 'practice', icon: Calculator, label: t(lang, 'navPractice') },
              { id: 'mock_tests', icon: ClipboardCheck, label: t(lang, 'navMockTestsShort') },
              { id: 'revision', icon: BookOpen, label: t(lang, 'navRevision') },
              { id: 'performance', icon: BarChart3, label: 'Stats' },
            ] as Array<{ id: MainTab; icon: React.ComponentType<{ className?: string }>; label: string }>
          ).map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                data-tour-tab={item.id}
                onClick={() => {
                  if (item.id === 'practice') {
                    setPracticePreselection({ subMode: 'topics', filter: 'all', nonce: Date.now() });
                  } else {
                    setPracticePreselection(null);
                  }
                  setActiveTab(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? 'text-indigo-600 dark:text-indigo-400 font-semibold' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-[64px]">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Dedicated App Settings & Study Defaults Modal */}
      <AppSettingsModal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onReplayTour={() => {
          setActiveSession(null);
          setPracticePreselection(null);
          setActiveTab('home');
          setTourOpen(true);
        }}
      />

      {/* Interactive First-Time Onboarding Tour */}
      <OnboardingTour
        open={tourOpen && !activeSession && !showLoginScreen}
        lang={lang}
        onNavigateTab={handleTourNavigateTab}
        onDemoPractice={handleTourDemoPractice}
        onDemoMockTests={handleTourDemoMockTests}
        onClose={handleTourClose}
      />
    </div>
  );
};

export default function App() {
  return (
    <PlatformProvider>
      <AppShell />
    </PlatformProvider>
  );
}
