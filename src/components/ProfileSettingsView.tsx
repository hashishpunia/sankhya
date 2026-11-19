import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronRight,
  Crown,
  Flame,
  Lock,
  LogOut,
  Pencil,
  Settings,
  Share2,
  Shield,
  Target,
  Trash2,
  Trophy,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { t } from '../i18n/translations';
import {
  computeLearningMilestones,
  getHighestUnlockedBadge,
  type LearningMilestone,
} from '../utils/milestones';
import { ShareAchievementModal } from './ShareAchievementModal';
import { SocialFooter } from './SocialFooter';

interface ProfileSettingsViewProps {
  onOpenAdminStudio?: () => void;
  onOpenSettings?: () => void;
  onOpenLoginScreen?: () => void;
  onStartTour?: () => void;
}

const TARGET_EXAM_OPTIONS = [
  'SSC CGL & CHSL',
  'Banking (IBPS / SBI PO)',
  'CAT & Management',
  'Railways (RRB NTPC)',
  'UPSC CSAT & State PSC',
  'Competitive Mathematics',
];

const DAILY_TARGET_PRESETS = [20, 30, 50, 100];

function renderMilestoneIcon(iconType: LearningMilestone['iconType'], className = 'w-5 h-5') {
  switch (iconType) {
    case 'crown':
      return <Crown className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'target':
      return <Target className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'flame':
    default:
      return <Flame className={className} />;
  }
}

export const ProfileSettingsView: React.FC<ProfileSettingsViewProps> = ({
  onOpenAdminStudio,
  onOpenSettings,
  onOpenLoginScreen,
  onStartTour,
}) => {
  const {
    firebaseUser,
    userProfile,
    guestProfile,
    isGuest,
    isAdmin,
    guestSessionsCount,
    stats,
    sessions,
    settings,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    logoutUser,
    deleteAccountData,
    migrateGuestData,
    updateSettings,
    updateProfileFields,
  } = usePlatform();

  const lang = settings.language;

  const activeName = isGuest ? guestProfile.fullName : userProfile?.fullName || 'Student';
  const activeTargetExam = isGuest
    ? guestProfile.targetExam
    : userProfile?.targetExam || 'SSC CGL & Banking';

  // Inline Header Edit State
  const [editingHeader, setEditingHeader] = useState(false);
  const [nameDraft, setNameDraft] = useState(activeName);
  const [examDraft, setExamDraft] = useState(activeTargetExam);
  const [dailyTargetDraft, setDailyTargetDraft] = useState<number>(settings.dailyTarget);
  const [savingInline, setSavingInline] = useState(false);

  // Auth form state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [registerNameInput, setRegisterNameInput] = useState('');
  const [registerExamInput, setRegisterExamInput] = useState('SSC CGL & CHSL');
  const [authError, setAuthError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Feedback, Share Modal & Privacy
  const [statusMessage, setStatusMessage] = useState('');
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [shareModalBadge, setShareModalBadge] = useState<LearningMilestone | null | undefined>(
    undefined
  );

  const overallAccuracy =
    stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;

  const milestones = useMemo(
    () => computeLearningMilestones(stats, sessions),
    [sessions, stats]
  );

  const highestEarnedBadge = useMemo(
    () => getHighestUnlockedBadge(milestones),
    [milestones]
  );

  const unlockedCount = useMemo(
    () => milestones.filter((m) => m.unlocked).length,
    [milestones]
  );

  const openInlineEditor = () => {
    setNameDraft(activeName);
    setExamDraft(activeTargetExam);
    setDailyTargetDraft(settings.dailyTarget);
    setEditingHeader(true);
  };

  const handleSaveInlineProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingInline(true);
    try {
      const cleanName = nameDraft.trim() || activeName;
      const cleanExam = examDraft.trim() || 'Competitive Mathematics';
      const cleanTarget = Math.max(5, Math.min(500, Number(dailyTargetDraft) || 30));

      await Promise.all([
        updateProfileFields({
          fullName: cleanName,
          targetExam: cleanExam,
          preferredLanguage: settings.language,
        }),
        cleanTarget !== settings.dailyTarget
          ? updateSettings({ dailyTarget: cleanTarget })
          : Promise.resolve(),
      ]);

      setEditingHeader(false);
      setStatusMessage(
        lang === 'hi'
          ? 'प्रोफ़ाइल और दैनिक लक्ष्य अपडेट हो गए।'
          : 'Profile & daily target updated.'
      );
      window.setTimeout(() => setStatusMessage(''), 4000);
    } finally {
      setSavingInline(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthBusy(true);
    try {
      if (authMode === 'login') {
        await signInWithEmail(email, password);
      } else {
        await registerWithEmail(
          registerNameInput || activeName || 'Student',
          email,
          password,
          registerExamInput
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        setAuthError(
          'Email/Password provider is not enabled in Firebase Console yet. Use Google Sign-In above, or enable Email/Password under Firebase Console → Authentication → Sign-in method.'
        );
      } else {
        setAuthError(msg);
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleMigrateGuest = async () => {
    const count = await migrateGuestData();
    setStatusMessage(`Transferred ${count} guest session(s) and queued for cloud sync.`);
  };

  const nextMilestone = milestones.find((m) => !m.unlocked) ?? null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Streamlined Profile Hero Card + Inline Editor + Featured Badge */}
      <section className="rounded-2xl p-6 sm:p-7 text-white bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 shadow-lg shadow-indigo-600/15 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left: Circular Avatar + Identity + Inline Pencil */}
          <div className="flex items-start sm:items-center gap-4 min-w-0">
            {firebaseUser?.photoURL ? (
              <img
                src={firebaseUser.photoURL}
                alt={activeName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full border-2 border-white/40 object-cover shrink-0 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 text-white flex items-center justify-center font-bold text-2xl shrink-0">
                {(activeName || 'S')[0].toUpperCase()}
              </div>
            )}

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-indigo-100">
                <span>{activeTargetExam}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {settings.dailyTarget} {lang === 'hi' ? 'प्रश्न/दिन लक्ष्य' : 'Qs/day target'}
                </span>
                {isAdmin && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-200">
                      <Shield className="w-3.5 h-3.5" /> Admin
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-white truncate">
                  {activeName}
                </h1>
                <button
                  type="button"
                  onClick={() => (editingHeader ? setEditingHeader(false) : openInlineEditor())}
                  aria-label={lang === 'hi' ? 'प्रोफ़ाइल और लक्ष्य संपादित करें' : 'Edit profile and daily target'}
                  title={lang === 'hi' ? 'नाम, परीक्षा व लक्ष्य बदलें' : 'Edit name, exam & daily goal'}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors shrink-0"
                >
                  {editingHeader ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                </button>
              </div>

              <div className="text-xs text-indigo-100/90 font-mono">
                {isGuest
                  ? lang === 'hi'
                    ? 'अतिथि ऑफ़लाइन प्रोफ़ाइल'
                    : 'Guest Offline Profile'
                  : userProfile?.email}
              </div>
            </div>
          </div>

          {/* Right: Core Stats + Featured Highest Badge */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-5 font-mono tabular-nums">
              <div>
                <div className="text-[11px] text-indigo-100 uppercase">Streak</div>
                <div className="text-xl sm:text-2xl font-bold flex items-center gap-1 mt-0.5">
                  <Flame className="w-5 h-5 text-amber-300" />
                  {stats.currentStreak}d
                </div>
              </div>
              <div>
                <div className="text-[11px] text-indigo-100 uppercase">Solved</div>
                <div className="text-xl sm:text-2xl font-bold mt-0.5">{stats.totalAttempted}</div>
              </div>
              <div>
                <div className="text-[11px] text-indigo-100 uppercase">Accuracy</div>
                <div className="text-xl sm:text-2xl font-bold mt-0.5">{overallAccuracy}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Inline Edit Drawer directly inside the Upper Profile Header Card */}
        {editingHeader && (
          <form
            onSubmit={handleSaveInlineProfile}
            className="rounded-xl bg-slate-950/25 border border-white/20 p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-bold text-white">
                {lang === 'hi' ? 'प्रोफ़ाइल और दैनिक लक्ष्य संपादित करें' : 'Edit Profile & Daily Goal'}
              </div>
              <span className="text-xs text-indigo-100 font-mono">
                {isGuest ? 'Saved locally' : 'Synced to account'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-indigo-100 mb-1">
                  {lang === 'hi' ? 'पूरा नाम' : 'Full Name'}
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white/95 text-slate-900 border border-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-100 mb-1">
                  {lang === 'hi' ? 'लक्ष्य परीक्षा' : 'Target Examination'}
                </label>
                <select
                  value={TARGET_EXAM_OPTIONS.includes(examDraft) ? examDraft : 'Competitive Mathematics'}
                  onChange={(e) => setExamDraft(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl bg-white/95 text-slate-900 border border-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {TARGET_EXAM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-100 mb-1">
                  {lang === 'hi' ? 'दैनिक लक्ष्य (प्रश्न/दिन)' : 'Daily Practice Target (Qs/day)'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={dailyTargetDraft}
                    onChange={(e) => setDailyTargetDraft(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-sm font-mono tabular-nums rounded-xl bg-white/95 text-slate-900 border border-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <div className="flex items-center gap-1">
                    {DAILY_TARGET_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDailyTargetDraft(preset)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                          dailyTargetDraft === preset
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-white/15 hover:bg-white/25 text-white'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingHeader(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-indigo-100 hover:bg-white/10 transition-colors"
              >
                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={savingInline}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold transition-colors disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                {savingInline
                  ? lang === 'hi'
                    ? 'सहेजा जा रहा है...'
                    : 'Saving...'
                  : lang === 'hi'
                    ? 'बदलाव सहेजें'
                    : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* Featured Best Earned Badge Strip inside Profile Header */}
        <div className="rounded-xl bg-white/10 border border-white/20 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                highestEarnedBadge?.accentGradient || 'from-amber-400 to-orange-500'
              } text-white flex items-center justify-center shrink-0 shadow-md`}
            >
              {renderMilestoneIcon(highestEarnedBadge?.iconType || 'flame', 'w-6 h-6')}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-wider text-amber-200">
                {highestEarnedBadge
                  ? lang === 'hi'
                    ? 'शीर्ष अर्जित बैज'
                    : 'Featured Earned Badge'
                  : lang === 'hi'
                    ? 'अगला मील का पत्थर'
                    : 'Next Milestone to Unlock'}
              </div>
              <div className="text-base sm:text-lg font-bold text-white leading-snug">
                {highestEarnedBadge
                  ? lang === 'hi'
                    ? highestEarnedBadge.titleHi
                    : highestEarnedBadge.title
                  : lang === 'hi'
                    ? nextMilestone?.titleHi || 'पहली चिंगारी'
                    : nextMilestone?.title || 'First Spark'}
              </div>
              <div className="text-xs text-indigo-100">
                {highestEarnedBadge
                  ? lang === 'hi'
                    ? highestEarnedBadge.requirementTextHi
                    : highestEarnedBadge.requirementText
                  : lang === 'hi'
                    ? nextMilestone?.requirementTextHi || 'अनलॉक करने के लिए 1 अभ्यास सत्र पूरा करें'
                    : nextMilestone?.requirementText || 'Complete 1 practice session to unlock'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShareModalBadge(highestEarnedBadge)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 hover:bg-indigo-50 text-xs font-bold shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Share2 className="w-4 h-4 text-indigo-600" />
            <span>{lang === 'hi' ? 'उपलब्धि साझा करें' : 'Share Achievement'}</span>
          </button>
        </div>
      </section>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 2. Horizontal Streak & Milestone Timeline */}
      <section className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              {lang === 'hi' ? 'स्ट्रीक और लर्निंग माइलस्टोन' : 'Streak & Learning Milestones'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {lang === 'hi'
                ? 'अनलॉक किए गए किसी भी बैज पर क्लिक करके अपना उपलब्धि कार्ड साझा करें।'
                : 'Track your streak & volume milestones horizontally. Click any unlocked badge to share it.'}
            </p>
          </div>
          <div className="text-xs font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
            {unlockedCount} / {milestones.length} {lang === 'hi' ? 'अनलॉक' : 'unlocked'}
          </div>
        </div>

        {/* Scrollable Horizontal Track */}
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="relative flex items-start gap-4 min-w-[760px] pt-2 pb-1">
            {/* Horizontal Track Connector Line behind nodes */}
            <div
              aria-hidden="true"
              className="absolute top-8 left-12 right-12 h-1 rounded-full bg-slate-200 dark:bg-slate-800"
            />
            <div
              aria-hidden="true"
              className="absolute top-8 left-12 h-1 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 transition-all duration-300"
              style={{
                width:
                  unlockedCount <= 1
                    ? '0%'
                    : `${Math.min(88, Math.round(((unlockedCount - 1) / (milestones.length - 1)) * 88))}%`,
              }}
            />

            {milestones.map((m) => {
              const titleText = lang === 'hi' ? m.titleHi : m.title;
              const reqText = lang === 'hi' ? m.requirementTextHi : m.requirementText;
              const statusText = lang === 'hi' ? m.progressTextHi : m.progressText;
              const nodeTag = lang === 'hi' ? m.nodeLabelHi : m.nodeLabel;

              return (
                <div
                  key={m.id}
                  className="relative z-10 flex-1 min-w-[128px] flex flex-col items-center text-center group"
                >
                  {/* Node Circle */}
                  <button
                    type="button"
                    onClick={() => {
                      if (m.unlocked) setShareModalBadge(m);
                    }}
                    disabled={!m.unlocked}
                    title={
                      m.unlocked
                        ? `Share ${m.title}`
                        : `${m.requirementText} (${m.progressText})`
                    }
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform ${
                      m.unlocked
                        ? `bg-gradient-to-br ${m.accentGradient} text-white shadow-md shadow-amber-500/20 ring-4 ring-white dark:ring-[#11192E] hover:scale-105 cursor-pointer`
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-300 dark:border-slate-700 ring-4 ring-white dark:ring-[#11192E] cursor-default'
                    }`}
                  >
                    {renderMilestoneIcon(m.iconType, 'w-5 h-5')}
                  </button>

                  {/* Node Label Directly Beneath */}
                  <div className="mt-2.5 space-y-1 px-1">
                    <div
                      className={`text-[11px] font-mono font-bold uppercase tracking-wide ${
                        m.unlocked
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {nodeTag}
                    </div>
                    <div
                      className={`text-xs font-bold leading-snug ${
                        m.unlocked
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {titleText}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {reqText}
                    </div>
                    <div
                      className={`inline-flex items-center gap-1 text-[11px] font-mono font-semibold pt-0.5 ${
                        m.unlocked
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {m.unlocked ? (
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 shrink-0" />
                      )}
                      <span>{statusText}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Dedicated App Settings Trigger Row (Replaces cluttered inline Appearance & Defaults section) */}
      {onOpenSettings && (
        <section>
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-full text-left bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none flex items-center justify-between gap-4 transition-colors group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {lang === 'hi' ? 'ऐप सेटिंग्स →' : 'App Settings →'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {settings.language === 'hi' ? 'हिन्दी' : 'English'} · {settings.theme} theme ·{' '}
                  {settings.defaultDifficulty} difficulty · {settings.defaultQuestionCount} Qs default
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
          </button>
        </section>
      )}

      {/* 4. Restricted Admin Access (Visible ONLY to verified authenticated admins) */}
      {!isGuest && isAdmin && onOpenAdminStudio && (
        <section className="bg-white dark:bg-[#11192E] border border-indigo-200 dark:border-indigo-900/70 rounded-2xl p-6 shadow-sm shadow-indigo-500/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {t(lang, 'adminAccess')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {lang === 'hi'
                  ? 'सत्यापित व्यवस्थापक खाता: प्रश्न बैंक, इवेंट्स, डाउनलोड लिंक व रिपोर्ट प्रबंधन खोलें।'
                  : 'Verified administrator access to manage topics, events, question banks & official download links.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAdminStudio}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:opacity-95 transition-opacity whitespace-nowrap"
          >
            {t(lang, 'openAdminStudio')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* 5. Account & Cloud Sync Section */}
      <section className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-5">
        {isGuest ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Guest Mode Active · Local Offline Storage
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  Sign in to sync progress across devices
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                {onOpenLoginScreen && (
                  <button
                    type="button"
                    onClick={onOpenLoginScreen}
                    className="px-4 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap"
                  >
                    {lang === 'hi' ? 'लॉगिन स्क्रीन खोलें' : 'Open Login Screen'}
                  </button>
                )}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={authBusy}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:opacity-95 disabled:opacity-50 whitespace-nowrap"
                >
                  Continue with Google
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
                {authError}
              </div>
            )}

            <form onSubmit={handleEmailAuth} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="sm:col-span-2 flex items-center gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className={`font-semibold ${authMode === 'login' ? 'text-indigo-600 underline' : 'text-slate-500'}`}
                >
                  Email Sign In
                </button>
                <span className="text-slate-300">|</span>
                <button
                  type="button"
                  onClick={() => setAuthMode('register')}
                  className={`font-semibold ${authMode === 'register' ? 'text-indigo-600 underline' : 'text-slate-500'}`}
                >
                  Create Account
                </button>
              </div>
              {authMode === 'register' && (
                <>
                  <input
                    type="text"
                    required
                    placeholder="Full Name"
                    value={registerNameInput}
                    onChange={(e) => setRegisterNameInput(e.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="text"
                    placeholder="Target Exam (e.g. SSC CGL)"
                    value={registerExamInput}
                    onChange={(e) => setRegisterExamInput(e.target.value)}
                    className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                </>
              )}
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password (min 6 chars)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={authBusy}
                  className="px-4 py-2 text-sm font-semibold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl"
                >
                  {authMode === 'login' ? 'Sign In with Email' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Cloud Account Connected</h2>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Member since {userProfile?.createdAtIso?.slice(0, 10)} · Use the pencil icon above to update your name, exam, or daily target.
                </div>
              </div>
              <button
                onClick={() => void logoutUser()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t(lang, 'logout')}
              </button>
            </div>

            {guestSessionsCount > 0 && (
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-indigo-900 dark:text-indigo-100">
                  Found <span className="font-mono font-bold">{guestSessionsCount}</span> local guest practice session(s) on this device.
                </div>
                <button
                  onClick={handleMigrateGuest}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Transfer Guest Progress
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 6. Privacy & Data Management */}
      <section className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            SankhyaPrep · Powered by Exam Lens
          </div>
          <div>
            Offline-first mathematics practice ecosystem ·{' '}
            <button onClick={() => setShowPrivacy((v) => !v)} className="text-indigo-600 dark:text-indigo-400 hover:underline">
              Privacy Policy
            </button>
          </div>
          {showPrivacy && (
            <p className="pt-2 text-xs text-slate-600 dark:text-slate-300 max-w-xl">
              Your practice sessions, accuracy metrics, and preferences are stored locally on your device for offline access and synchronized securely to your private Firebase account only when authenticated.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onStartTour && (
            <button
              type="button"
              onClick={onStartTour}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors whitespace-nowrap"
            >
              {lang === 'hi' ? 'गाइडेड टूर फिर देखें' : 'Replay Guided Tour'}
            </button>
          )}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {isGuest ? 'Clear Local Data' : 'Delete Account & Data'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void deleteAccountData();
                  setConfirmDelete(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 text-white rounded-xl"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-500"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </section>

      {/* 7. Configurable Social Media & Community Footer */}
      <SocialFooter />

      {/* Shareable Achievement Badge Card Modal */}
      <ShareAchievementModal
        open={shareModalBadge !== undefined}
        onClose={() => setShareModalBadge(undefined)}
        userName={activeName}
        targetExam={activeTargetExam}
        photoUrl={firebaseUser?.photoURL ?? undefined}
        streakDays={stats.currentStreak}
        totalQuestions={stats.totalAttempted}
        accuracyPct={overallAccuracy}
        badge={shareModalBadge ?? null}
        lang={lang}
      />
    </div>
  );
};
