import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  Cloud,
  Eye,
  EyeOff,
  Languages,
  Lock,
  Mail,
  Moon,
  Sun,
  Trophy,
  User,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import type { Language } from '../types/math';

interface LoginScreenProps {
  onContinueAsGuest: () => void;
  canReturnToGuest?: boolean;
}

const TARGET_EXAM_OPTIONS = [
  'SSC CGL & CHSL',
  'Banking (IBPS / SBI PO)',
  'CAT & Management',
  'Railways (RRB NTPC)',
  'UPSC CSAT & State PSC',
  'Competitive Mathematics',
];

function formatAuthError(err: unknown, lang: Language): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) {
    return lang === 'hi'
      ? 'ईमेल या पासवर्ड गलत है। कृपया पुनः प्रयास करें।'
      : 'Incorrect email or password. Please check your credentials and try again.';
  }
  if (msg.includes('auth/user-not-found')) {
    return lang === 'hi'
      ? 'इस ईमेल से कोई खाता नहीं मिला। कृपया नया खाता बनाएं।'
      : 'No account found with this email address. Switch to Create Account to sign up.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return lang === 'hi'
      ? 'यह ईमेल पहले से पंजीकृत है। कृपया साइन इन करें।'
      : 'An account with this email already exists. Switch to Sign In instead.';
  }
  if (msg.includes('auth/weak-password')) {
    return lang === 'hi'
      ? 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।'
      : 'Password should be at least 6 characters long.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return lang === 'hi'
      ? 'Google साइन-इन विंडो बंद कर दी गई।'
      : 'Google sign-in window was closed before completing.';
  }
  if (msg.includes('operation-not-allowed')) {
    return lang === 'hi'
      ? 'ईमेल/पासवर्ड लॉगिन अभी सक्षम नहीं है। कृपया Google से साइन इन करें।'
      : 'Email/Password sign-in is not enabled in Firebase Console yet. Use Continue with Google above.';
  }
  return msg;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onContinueAsGuest,
  canReturnToGuest = false,
}) => {
  const {
    settings,
    setLanguage,
    setThemeMode,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    resetPassword,
  } = usePlatform();

  const lang = settings.language;
  const isDark = settings.theme === 'dark';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [targetExam, setTargetExam] = useState('SSC CGL & CHSL');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setErrorMsg(formatAuthError(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(
          fullName.trim() || 'Student',
          email.trim(),
          password,
          targetExam
        );
      }
    } catch (err) {
      setErrorMsg(formatAuthError(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    setErrorMsg('');
    setInfoMsg('');
    if (!email.trim()) {
      setErrorMsg(
        lang === 'hi'
          ? 'पासवर्ड रीसेट लिंक पाने के लिए पहले अपना ईमेल दर्ज करें।'
          : 'Enter your email address above first to receive a password reset link.'
      );
      return;
    }
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setInfoMsg(
        lang === 'hi'
          ? 'पासवर्ड रीसेट ईमेल भेज दिया गया है। अपना इनबॉक्स जांचें।'
          : 'Password reset link sent. Please check your inbox.'
      );
    } catch (err) {
      setErrorMsg(formatAuthError(err, lang));
    } finally {
      setBusy(false);
    }
  };

  const perks = [
    {
      icon: Calculator,
      label: lang === 'hi' ? '14 अभ्यास विषय' : '14 Practice Topics',
    },
    {
      icon: Trophy,
      label: lang === 'hi' ? 'लाइव मॉक टेस्ट' : 'Live Mocks',
    },
    {
      icon: BookOpen,
      label: lang === 'hi' ? 'रिवीजन वॉल्ट' : 'Revision Vault',
    },
    {
      icon: Cloud,
      label: lang === 'hi' ? 'ऑफ़लाइन सिंक' : 'Offline Sync',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f3f6fc] dark:bg-[#090f1e] text-slate-900 dark:text-slate-100">
      {/* Compact Top Bar: Brand + Language Switcher + Theme Toggle */}
      <header className="w-full max-w-[1160px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4 shrink-0">
        <div className="flex flex-col items-start whitespace-nowrap shrink-0">
          <span className="text-lg sm:text-xl font-extrabold leading-none tracking-tight bg-gradient-to-r from-indigo-700 to-blue-600 dark:from-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
            SankhyaPrep
          </span>
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
            Powered by Exam Lens
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div
            className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#11192E] p-0.5 text-xs font-semibold"
            role="group"
            aria-label="Language"
          >
            <Languages className="w-3.5 h-3.5 text-slate-500 mx-1.5 hidden sm:block" />
            {(['en', 'hi'] as Language[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => void setLanguage(l)}
                className={`min-h-[36px] px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  lang === l
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {l === 'en' ? 'EN' : 'हिन्दी'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void setThemeMode(isDark ? 'light' : 'dark')}
            aria-label="Toggle theme"
            className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#11192E] text-slate-600 dark:text-slate-300 hover:border-indigo-400 flex items-center justify-center transition-colors shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Above-the-Fold Main Grid: Compact Hero (Top on mobile, Left on desktop) + Immediate Auth Card */}
      <main className="flex-1 w-full max-w-[1160px] mx-auto px-4 sm:px-6 pt-1 pb-5 sm:py-4 lg:py-6 flex items-start lg:items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-5 lg:gap-7 items-stretch">
          {/* Compact Hero Banner (<= 35% mobile viewport height) */}
          <section className="lg:col-span-5 rounded-2xl p-4 sm:p-5 lg:p-7 text-white bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 shadow-lg shadow-indigo-600/15 flex flex-col justify-between gap-3.5 lg:gap-6">
            <div className="space-y-2 lg:space-y-3.5">
              {/* Compact Exam Category Pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-[11px] font-semibold tracking-wide text-indigo-50 whitespace-nowrap">
                <span>SSC</span>
                <span aria-hidden="true">•</span>
                <span>Banking</span>
                <span aria-hidden="true">•</span>
                <span>CAT</span>
                <span aria-hidden="true">•</span>
                <span>Railways</span>
              </div>

              {/* Concise 2-line Headline */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight leading-snug text-balance max-w-md">
                {lang === 'hi'
                  ? 'तेज़ गणना और प्रतियोगी गणित में महारत पाएं'
                  : 'Master Speed Math & Quantitative Exams'}
              </h1>

              {/* Concise Desktop Supporting Line */}
              <p className="hidden lg:block text-sm text-indigo-100/90 leading-relaxed max-w-md">
                {lang === 'hi'
                  ? 'कस्टम अभ्यास ड्रिल, शेड्यूल्ड मॉक टेस्ट, ऑफ़लाइन अध्ययन और सटीक विश्लेषण एक ही स्थान पर।'
                  : 'Build rapid calculation accuracy with custom drills, live mock events, offline-first study, and instant analytics.'}
              </p>
            </div>

            {/* Compact 2x2 Perks Pill Row */}
            <div className="grid grid-cols-2 gap-2">
              {perks.map((perk) => {
                const Icon = perk.icon;
                return (
                  <div
                    key={perk.label}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl bg-white/12 border border-white/15 text-[11px] sm:text-xs font-semibold text-white min-w-0"
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="truncate">{perk.label}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Immediate Sign-In & Guest Access Card */}
          <section className="lg:col-span-7 bg-white dark:bg-[#11192E] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col justify-between gap-4">
            <div className="space-y-3.5 sm:space-y-4">
              {/* Sign In / Create Account Tabs + Compact Heading */}
              <div className="space-y-2.5">
                <div
                  className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800"
                  role="tablist"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'login'}
                    onClick={() => {
                      setMode('login');
                      setErrorMsg('');
                      setInfoMsg('');
                    }}
                    className={`min-h-[38px] px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                      mode === 'login'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'hi' ? 'साइन इन करें' : 'Sign In'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'register'}
                    onClick={() => {
                      setMode('register');
                      setErrorMsg('');
                      setInfoMsg('');
                    }}
                    className={`min-h-[38px] px-3 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                      mode === 'register'
                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang === 'hi' ? 'नया खाता बनाएं' : 'Create Account'}
                  </button>
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {mode === 'login'
                      ? lang === 'hi'
                        ? 'अपने खाते में साइन इन करें'
                        : 'Sign in to your account'
                      : lang === 'hi'
                        ? 'अपना SankhyaPrep खाता बनाएं'
                        : 'Create your SankhyaPrep account'}
                  </h2>
                  <p className="hidden sm:block text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {mode === 'login'
                      ? lang === 'hi'
                        ? 'अपनी स्ट्रीक, बैज और लाइव टेस्ट रैंकिंग सिंक करें।'
                        : 'Sync your streaks, earned badges, and scheduled mock events.'
                      : lang === 'hi'
                        ? 'सभी डिवाइस पर प्रगति सुरक्षित रखने के लिए निःशुल्क पंजीकरण करें।'
                        : 'Register once to save practice history and compete in live events.'}
                  </p>
                </div>
              </div>

              {/* Continue with Google */}
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleGoogleSignIn()}
                className="w-full h-11 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 inline-flex items-center justify-center gap-2.5 transition-colors shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>
                  {lang === 'hi' ? 'Google के साथ जारी रखें' : 'Continue with Google'}
                </span>
              </button>

              {/* Divider */}
              <div className="relative flex items-center">
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                <span className="px-3 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {lang === 'hi' ? 'या ईमेल से' : 'or with email'}
                </span>
                <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
              </div>

              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {infoMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{infoMsg}</span>
                </div>
              )}

              {/* Email / Password Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {mode === 'register' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {lang === 'hi' ? 'पूरा नाम' : 'Full Name'}
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder={lang === 'hi' ? 'आपका नाम' : 'Your full name'}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full h-11 pl-9 pr-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        {lang === 'hi' ? 'लक्ष्य परीक्षा' : 'Target Exam'}
                      </label>
                      <select
                        value={targetExam}
                        onChange={(e) => setTargetExam(e.target.value)}
                        className="w-full h-11 px-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {TARGET_EXAM_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {lang === 'hi' ? 'ईमेल पता' : 'Email Address'}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        autoComplete="email"
                        placeholder="student@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-9 pr-3 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {lang === 'hi' ? 'पासवर्ड' : 'Password'}
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => void handleForgotPassword()}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                        >
                          {lang === 'hi' ? 'पासवर्ड भूल गए?' : 'Forgot?'}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        placeholder={lang === 'hi' ? 'कम से कम 6 अक्षर' : 'Min 6 characters'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-9 pr-11 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Primary CTA + Immediate Guest CTA directly beneath */}
                <div className="space-y-2 pt-0.5">
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-11 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-opacity shadow-sm disabled:opacity-50 whitespace-nowrap"
                  >
                    <span>
                      {busy
                        ? lang === 'hi'
                          ? 'प्रतीक्षा करें...'
                          : 'Please wait...'
                        : mode === 'login'
                          ? lang === 'hi'
                            ? 'साइन इन करें'
                            : 'Sign In'
                          : lang === 'hi'
                            ? 'खाता बनाएं'
                            : 'Create Account'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 bg-slate-50/90 dark:bg-slate-900/70 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
                  >
                    {canReturnToGuest
                      ? lang === 'hi'
                        ? 'अतिथि मोड पर वापस जाएं'
                        : 'Back to Guest Workspace'
                      : lang === 'hi'
                        ? 'अतिथि के रूप में जारी रखें (ऑफ़लाइन अभ्यास)'
                        : 'Continue as Guest (Offline Practice)'}
                  </button>
                </div>
              </form>
            </div>

            <p className="text-[11px] text-center text-slate-400 dark:text-slate-500">
              {lang === 'hi'
                ? 'अतिथि प्रगति डिवाइस पर सहेजी जाती है और साइन इन करने पर सिंक हो जाती है।'
                : 'Guest progress saves locally on your device and syncs anytime you sign in.'}
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};
