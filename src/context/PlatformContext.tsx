import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  clearAllUserLocalData,
  deletePracticeSessionLocal,
  getCatalogFromLocal,
  getDailyActivitiesLocal,
  getGuestProgressCount,
  getSyncMetadataLocal,
  getUserAnswersLocal,
  getUserSessionsLocal,
  getUserSettingsLocal,
  getUserStatisticsLocal,
  initializeOfflineDb,
  migrateGuestProgressToUser,
  savePracticeSessionLocal,
  saveReportLocal,
  saveUserAnswerLocal,
  saveUserSettingsLocal,
  updateStatsAndDailyActivityLocal,
} from '../db/offlineDb';
import { auth, db as firestoreDb, googleProvider, testFirestoreConnection } from '../firebase';
import {
  fetchAppPromoSettings,
  fetchSocialLinks,
  getCachedAppPromoSettings,
  getCachedSocialLinks,
  getFallbackDownloadUrl,
  verifyAdminAccess,
} from '../services/adminService';
import { runFullCloudSync } from '../services/syncService';
import type {
  AppPromoSettings,
  Category,
  DailyActivity,
  GeneratorConfig,
  Language,
  PracticeSession,
  Question,
  ReportedQuestion,
  SocialLinksConfig,
  SyncMetadata,
  ThemeMode,
  Topic,
  UserAnswer,
  UserProfile,
  UserSettings,
  UserStatistics,
} from '../types/math';

interface PlatformContextValue {
  ready: boolean;
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  activeUserId: string;
  isGuest: boolean;
  isAdmin: boolean;
  isOnline: boolean;
  guestSessionsCount: number;

  categories: Category[];
  topics: Topic[];
  questions: Question[];
  generatorConfigs: GeneratorConfig[];

  settings: UserSettings;
  stats: UserStatistics;
  dailyActivities: DailyActivity[];
  sessions: PracticeSession[];
  answers: UserAnswer[];
  syncMeta: SyncMetadata;
  officialDownloadUrl: string;
  appPromo: AppPromoSettings;
  socialLinks: SocialLinksConfig;
  guestProfile: { fullName: string; targetExam: string };

  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string, targetExam: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  deleteAccountData: () => Promise<void>;
  migrateGuestData: () => Promise<number>;

  updateSettings: (partial: Partial<UserSettings>) => Promise<void>;
  updateProfileFields: (partial: Partial<Pick<UserProfile, 'fullName' | 'targetExam' | 'preferredLanguage'>>) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  setLanguage: (lang: Language) => Promise<void>;
  toggleTheme: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;

  persistSessionProgress: (session: PracticeSession) => Promise<void>;
  persistAnswer: (answer: UserAnswer) => Promise<void>;
  finalizeSession: (session: PracticeSession, sessionAnswers: UserAnswer[]) => Promise<void>;
  discardIncompleteSession: (sessionId: string) => Promise<void>;
  submitQuestionReport: (questionId: string, topicId: string, reason: string) => Promise<void>;

  syncNow: () => Promise<SyncMetadata>;
  refreshLocalData: () => Promise<void>;
  refreshAppConfig: () => Promise<string>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export const PlatformProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [guestSessionsCount, setGuestSessionsCount] = useState(0);

  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generatorConfigs, setGeneratorConfigs] = useState<GeneratorConfig[]>([]);

  const [settings, setSettings] = useState<UserSettings>({
    userId: 'guest_local',
    language: 'en',
    theme: 'light',
    soundEnabled: true,
    vibrationEnabled: true,
    defaultDifficulty: 'medium',
    defaultQuestionCount: 15,
    defaultTimerSec: 300,
    dailyTarget: 30,
    notificationsEnabled: true,
  });
  const [stats, setStats] = useState<UserStatistics>({
    userId: 'guest_local',
    totalAttempted: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalSkipped: 0,
    totalTimeSec: 0,
    currentStreak: 0,
    longestStreak: 0,
    fastestResponseSec: 0,
    lastPracticeDate: '',
  });
  const [dailyActivities, setDailyActivities] = useState<DailyActivity[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [syncMeta, setSyncMeta] = useState<SyncMetadata>({
    id: 'global',
    localContentVersion: 1,
    lastSyncTimeIso: null,
    status: 'synced',
    pendingCount: 0,
  });
  const [appPromo, setAppPromo] = useState<AppPromoSettings>(() => getCachedAppPromoSettings());
  const [socialLinks, setSocialLinks] = useState<SocialLinksConfig>(() => getCachedSocialLinks());
  const [officialDownloadUrl, setOfficialDownloadUrl] = useState<string>(
    () => getCachedAppPromoSettings().officialDownloadUrl || getFallbackDownloadUrl()
  );
  const [guestProfile, setGuestProfile] = useState<{ fullName: string; targetExam: string }>(() => {
    try {
      const raw = localStorage.getItem('sankhyaprep_guest_profile_v1');
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{ fullName: string; targetExam: string }>;
        return {
          fullName: parsed.fullName?.trim() || 'Guest Learner',
          targetExam: parsed.targetExam?.trim() || 'Competitive Mathematics',
        };
      }
    } catch {
      // ignore storage issues
    }
    return { fullName: 'Guest Learner', targetExam: 'Competitive Mathematics' };
  });

  const activeUserId = firebaseUser ? firebaseUser.uid : 'guest_local';
  const isGuest = !firebaseUser;

  const applyThemeToDom = useCallback((theme: ThemeMode) => {
    if (typeof document === 'undefined') return;
    const prefersDark =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const loadUserLocalState = useCallback(
    async (uid: string) => {
      const [catalog, userSettings, userStats, userDaily, userSessions, userAnswers, meta, guestCnt] =
        await Promise.all([
          getCatalogFromLocal(),
          getUserSettingsLocal(uid),
          getUserStatisticsLocal(uid),
          getDailyActivitiesLocal(uid),
          getUserSessionsLocal(uid),
          getUserAnswersLocal(uid),
          getSyncMetadataLocal(),
          getGuestProgressCount(),
        ]);

      setCategories(catalog.categories);
      setTopics(catalog.topics);
      setQuestions(catalog.questions);
      setGeneratorConfigs(catalog.generatorConfigs);
      setSettings(userSettings);
      applyThemeToDom(userSettings.theme);
      setStats(userStats);
      setDailyActivities(userDaily);
      setSessions(userSessions);
      setAnswers(userAnswers);
      setSyncMeta(meta);
      setGuestSessionsCount(guestCnt);
    },
    [applyThemeToDom]
  );

  const ensureFirestoreUserProfile = useCallback(async (user: User, adminFlag: boolean): Promise<UserProfile> => {
    const ref = doc(firestoreDb, 'users', user.uid);
    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        return {
          uid: user.uid,
          fullName: data.fullName ?? user.displayName ?? 'Student',
          email: data.email ?? user.email ?? '',
          photoUrl: data.photoUrl ?? user.photoURL ?? '',
          targetExam: data.targetExam ?? 'SSC CGL & Banking',
          preferredLanguage: data.preferredLanguage ?? 'en',
          role: data.role ?? (adminFlag ? 'admin' : 'student'),
          createdAtIso: new Date().toISOString(),
          updatedAtIso: new Date().toISOString(),
        };
      }
      const profile: UserProfile = {
        uid: user.uid,
        fullName: user.displayName || user.email?.split('@')[0] || 'Student',
        email: user.email || '',
        photoUrl: user.photoURL || '',
        targetExam: 'SSC CGL & Banking',
        preferredLanguage: 'en',
        role: adminFlag ? 'admin' : 'student',
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
      if (user.emailVerified) {
        await setDoc(ref, {
          uid: profile.uid,
          fullName: profile.fullName,
          email: profile.email,
          photoUrl: profile.photoUrl || '',
          targetExam: profile.targetExam,
          preferredLanguage: profile.preferredLanguage,
          role: profile.role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      return profile;
    } catch {
      return {
        uid: user.uid,
        fullName: user.displayName || user.email?.split('@')[0] || 'Student',
        email: user.email || '',
        photoUrl: user.photoURL || '',
        targetExam: 'SSC CGL & Banking',
        preferredLanguage: 'en',
        role: adminFlag ? 'admin' : 'student',
        createdAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      await initializeOfflineDb();
      void testFirestoreConnection();
      void Promise.all([fetchAppPromoSettings(), fetchSocialLinks()]).then(([cfg, links]) => {
        if (!active) return;
        setAppPromo(cfg);
        setSocialLinks(links);
        setOfficialDownloadUrl(cfg.officialDownloadUrl || getFallbackDownloadUrl());
      });
      await loadUserLocalState('guest_local');
      if (active) setReady(true);
    };
    void init();

    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        const adminCheck = await verifyAdminAccess(user.uid, user.email, user.emailVerified);
        setIsAdmin(adminCheck);
        const profile = await ensureFirestoreUserProfile(user, adminCheck);
        setUserProfile(profile);
        await loadUserLocalState(user.uid);
        const meta = await runFullCloudSync(user.uid);
        setSyncMeta(meta);
        await loadUserLocalState(user.uid);
      } else {
        setIsAdmin(false);
        setUserProfile(null);
        await loadUserLocalState('guest_local');
        const meta = await runFullCloudSync(null);
        setSyncMeta(meta);
        await loadUserLocalState('guest_local');
      }
      if (active) setReady(true);
    });

    const handleOnline = async () => {
      setIsOnline(true);
      const uid = auth.currentUser?.uid ?? null;
      const meta = await runFullCloudSync(uid);
      setSyncMeta(meta);
      await loadUserLocalState(uid ?? 'guest_local');
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      active = false;
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [ensureFirestoreUserProfile, loadUserLocalState]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (settings.theme === 'system') {
        applyThemeToDom('system');
      }
    };
    mq.addEventListener('change', handleSystemThemeChange);
    return () => mq.removeEventListener('change', handleSystemThemeChange);
  }, [applyThemeToDom, settings.theme]);

  useEffect(() => {
    if (!isOnline || isGuest) return;
    if (syncMeta.pendingCount === 0 && syncMeta.status !== 'failed') return;
    const retryTimer = window.setInterval(() => {
      void runFullCloudSync(activeUserId).then(async (meta) => {
        setSyncMeta(meta);
        await loadUserLocalState(activeUserId);
      });
    }, 30000);
    return () => window.clearInterval(retryTimer);
  }, [activeUserId, isGuest, isOnline, loadUserLocalState, syncMeta.pendingCount, syncMeta.status]);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  }, []);

  const registerWithEmail = useCallback(async (name: string, email: string, pass: string, targetExam: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(cred.user, { displayName: name });
    const adminCheck = await verifyAdminAccess(cred.user.uid, cred.user.email, cred.user.emailVerified);
    setUserProfile({
      uid: cred.user.uid,
      fullName: name,
      email,
      targetExam,
      preferredLanguage: 'en',
      role: adminCheck ? 'admin' : 'student',
      createdAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  }, []);

  const logoutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  const deleteAccountData = useCallback(async () => {
    const uid = auth.currentUser?.uid ?? 'guest_local';
    await clearAllUserLocalData(uid);
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(firestoreDb, 'user_settings', uid));
        await deleteDoc(doc(firestoreDb, 'user_statistics', uid));
        await deleteDoc(doc(firestoreDb, 'users', uid));
      } catch {
        // Best-effort cleanup
      }
      await deleteUser(auth.currentUser);
    }
    await loadUserLocalState('guest_local');
  }, [loadUserLocalState]);

  const migrateGuestData = useCallback(async (): Promise<number> => {
    if (!firebaseUser) return 0;
    const count = await migrateGuestProgressToUser(firebaseUser.uid);
    if (count > 0) {
      const meta = await runFullCloudSync(firebaseUser.uid);
      setSyncMeta(meta);
      await loadUserLocalState(firebaseUser.uid);
    }
    return count;
  }, [firebaseUser, loadUserLocalState]);

  const updateSettings = useCallback(
    async (partial: Partial<UserSettings>) => {
      const next: UserSettings = { ...settings, ...partial, userId: activeUserId };
      setSettings(next);
      applyThemeToDom(next.theme);
      await saveUserSettingsLocal(next, !isGuest);
      if (!isGuest && isOnline) {
        const meta = await runFullCloudSync(activeUserId);
        setSyncMeta(meta);
      } else {
        setSyncMeta(await getSyncMetadataLocal());
      }
    },
    [activeUserId, applyThemeToDom, isGuest, isOnline, settings]
  );

  const updateProfileFields = useCallback(
    async (partial: Partial<Pick<UserProfile, 'fullName' | 'targetExam' | 'preferredLanguage'>>) => {
      if (!firebaseUser || !userProfile) {
        const nextGuest = {
          fullName: (partial.fullName ?? guestProfile.fullName).trim() || 'Guest Learner',
          targetExam: (partial.targetExam ?? guestProfile.targetExam).trim() || 'Competitive Mathematics',
        };
        setGuestProfile(nextGuest);
        try {
          localStorage.setItem('sankhyaprep_guest_profile_v1', JSON.stringify(nextGuest));
        } catch {
          // ignore storage errors
        }
        return;
      }
      const updated: UserProfile = {
        ...userProfile,
        ...partial,
        updatedAtIso: new Date().toISOString(),
      };
      setUserProfile(updated);
      try {
        await setDoc(
          doc(firestoreDb, 'users', firebaseUser.uid),
          {
            fullName: updated.fullName,
            targetExam: updated.targetExam,
            preferredLanguage: updated.preferredLanguage,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch {
        // Ignore if offline or unverified
      }
    },
    [firebaseUser, guestProfile.fullName, guestProfile.targetExam, userProfile]
  );

  const toggleLanguage = useCallback(async () => {
    const nextLang: Language = settings.language === 'en' ? 'hi' : 'en';
    await updateSettings({ language: nextLang });
  }, [settings.language, updateSettings]);

  const setLanguage = useCallback(
    async (lang: Language) => {
      if (settings.language !== lang) {
        await updateSettings({ language: lang });
      }
    },
    [settings.language, updateSettings]
  );

  const toggleTheme = useCallback(async () => {
    const nextTheme: ThemeMode = settings.theme === 'light' ? 'dark' : settings.theme === 'dark' ? 'system' : 'light';
    await updateSettings({ theme: nextTheme });
  }, [settings.theme, updateSettings]);

  const setThemeMode = useCallback(
    async (mode: ThemeMode) => {
      if (settings.theme !== mode) {
        await updateSettings({ theme: mode });
      }
    },
    [settings.theme, updateSettings]
  );

  const persistSessionProgress = useCallback(
    async (session: PracticeSession) => {
      await savePracticeSessionLocal(session, !isGuest && session.status === 'completed');
      setSessions(await getUserSessionsLocal(activeUserId));
      setSyncMeta(await getSyncMetadataLocal());
    },
    [activeUserId, isGuest]
  );

  const persistAnswer = useCallback(
    async (answer: UserAnswer) => {
      await saveUserAnswerLocal(answer, !isGuest);
      setAnswers(await getUserAnswersLocal(activeUserId));
    },
    [activeUserId, isGuest]
  );

  const finalizeSession = useCallback(
    async (session: PracticeSession, sessionAnswers: UserAnswer[]) => {
      const completedSession: PracticeSession = {
        ...session,
        status: 'completed',
        completedAtIso: new Date().toISOString(),
      };
      await savePracticeSessionLocal(completedSession, !isGuest);
      for (const ans of sessionAnswers) {
        await saveUserAnswerLocal(ans, !isGuest);
      }
      await updateStatsAndDailyActivityLocal(activeUserId, completedSession, sessionAnswers, !isGuest);

      if (!isGuest && isOnline) {
        const meta = await runFullCloudSync(activeUserId);
        setSyncMeta(meta);
      }
      await loadUserLocalState(activeUserId);
    },
    [activeUserId, isGuest, isOnline, loadUserLocalState]
  );

  const discardIncompleteSession = useCallback(
    async (sessionId: string) => {
      await deletePracticeSessionLocal(sessionId);
      setSessions(await getUserSessionsLocal(activeUserId));
    },
    [activeUserId]
  );

  const submitQuestionReport = useCallback(
    async (questionId: string, topicId: string, reason: string) => {
      const report: ReportedQuestion = {
        id: `rep_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: activeUserId,
        questionId,
        topicId,
        reason: reason.trim().slice(0, 500),
        status: 'open',
        createdAtIso: new Date().toISOString(),
      };
      await saveReportLocal(report, !isGuest);
      if (!isGuest && isOnline) {
        const meta = await runFullCloudSync(activeUserId);
        setSyncMeta(meta);
      }
    },
    [activeUserId, isGuest, isOnline]
  );

  const refreshAppConfig = useCallback(async (): Promise<string> => {
    const [cfg, links] = await Promise.all([fetchAppPromoSettings(), fetchSocialLinks()]);
    const url = cfg.officialDownloadUrl || getFallbackDownloadUrl();
    setAppPromo(cfg);
    setSocialLinks(links);
    setOfficialDownloadUrl(url);
    return url;
  }, []);

  const syncNow = useCallback(async (): Promise<SyncMetadata> => {
    const [meta, cfg, links] = await Promise.all([
      runFullCloudSync(isGuest ? null : activeUserId),
      fetchAppPromoSettings(),
      fetchSocialLinks(),
    ]);
    setSyncMeta(meta);
    setAppPromo(cfg);
    setSocialLinks(links);
    setOfficialDownloadUrl(cfg.officialDownloadUrl || getFallbackDownloadUrl());
    await loadUserLocalState(activeUserId);
    return meta;
  }, [activeUserId, isGuest, loadUserLocalState]);

  const refreshLocalData = useCallback(async () => {
    await loadUserLocalState(activeUserId);
  }, [activeUserId, loadUserLocalState]);

  return (
    <PlatformContext.Provider
      value={{
        ready,
        firebaseUser,
        userProfile,
        activeUserId,
        isGuest,
        isAdmin,
        isOnline,
        guestSessionsCount,
        categories,
        topics,
        questions,
        generatorConfigs,
        settings,
        stats,
        dailyActivities,
        sessions,
        answers,
        syncMeta,
        officialDownloadUrl,
        appPromo,
        socialLinks,
        guestProfile,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        resetPassword,
        logoutUser,
        deleteAccountData,
        migrateGuestData,
        updateSettings,
        updateProfileFields,
        toggleLanguage,
        setLanguage,
        toggleTheme,
        setThemeMode,
        persistSessionProgress,
        persistAnswer,
        finalizeSession,
        discardIncompleteSession,
        submitQuestionReport,
        syncNow,
        refreshLocalData,
        refreshAppConfig,
      }}
    >
      {children}
    </PlatformContext.Provider>
  );
};

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) throw new Error('usePlatform must be used within PlatformProvider');
  return ctx;
}
