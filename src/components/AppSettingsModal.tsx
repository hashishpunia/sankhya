import React, { useEffect } from 'react';
import {
  Bell,
  Cloud,
  CloudOff,
  Compass,
  Languages,
  Monitor,
  Moon,
  SlidersHorizontal,
  Sun,
  Volume2,
  Vibrate,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { t } from '../i18n/translations';
import type { Difficulty, Language, ThemeMode } from '../types/math';
import { SocialFooter } from './SocialFooter';

interface AppSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onReplayTour?: () => void;
}

export const AppSettingsModal: React.FC<AppSettingsModalProps> = ({
  open,
  onClose,
  onReplayTour,
}) => {
  const {
    isGuest,
    isOnline,
    settings,
    syncMeta,
    updateSettings,
    setLanguage,
    setThemeMode,
  } = usePlatform();

  const lang = settings.language;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'hi' ? 'ऐप सेटिंग्स' : 'App Settings'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.985 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-700/80 shadow-2xl text-slate-900 dark:text-slate-100"
        >
          {/* Modal Header */}
          <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#11192E]/95 backdrop-blur px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <SlidersHorizontal className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                  {lang === 'hi' ? 'ऐप सेटिंग्स और अभ्यास प्राथमिकताएं' : 'App Settings & Study Defaults'}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {isOnline ? (
                    <Cloud className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <CloudOff className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>
                    {isGuest
                      ? lang === 'hi'
                        ? 'डिवाइस पर सहेजा गया'
                        : 'Saved locally on device'
                      : !isOnline
                        ? lang === 'hi'
                          ? 'ऑफ़लाइन · स्थानीय रूप से सहेजा गया'
                          : 'Offline · Saved locally'
                        : syncMeta.status === 'syncing'
                          ? lang === 'hi'
                            ? 'सिंक हो रहा है...'
                            : 'Syncing preferences...'
                          : syncMeta.pendingCount > 0
                            ? lang === 'hi'
                              ? 'सिंक कतार में'
                              : 'Sync queued'
                            : lang === 'hi'
                              ? 'क्लाउड से सिंक'
                              : 'Synced to cloud'}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'hi' ? 'सेटिंग्स बंद करें' : 'Close settings'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-7">
            {/* 1. Appearance & Language */}
            <section className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {lang === 'hi' ? 'दिखावट और भाषा' : 'Appearance & Language'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Languages className="w-3.5 h-3.5 text-indigo-500" />
                    {t(lang, 'languageLabel')}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    {(
                      [
                        { id: 'en', label: 'English' },
                        { id: 'hi', label: 'हिन्दी (Hindi)' },
                      ] as Array<{ id: Language; label: string }>
                    ).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void setLanguage(item.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          settings.language === item.id
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t(lang, 'themeLabel')}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    {(
                      [
                        { id: 'light', label: t(lang, 'lightMode'), Icon: Sun },
                        { id: 'dark', label: t(lang, 'darkMode'), Icon: Moon },
                        { id: 'system', label: t(lang, 'systemMode'), Icon: Monitor },
                      ] as Array<{ id: ThemeMode; label: string; Icon: React.ComponentType<{ className?: string }> }>
                    ).map(({ id, label, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => void setThemeMode(id)}
                        className={`px-2 py-2 rounded-lg text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap ${
                          settings.theme === id
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Study Defaults */}
            <section className="space-y-4 pt-5 border-t border-slate-200/80 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {lang === 'hi' ? 'अभ्यास और परीक्षण डिफ़ॉल्ट' : 'Study & Session Defaults'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'hi' ? 'डिफ़ॉल्ट कठिनाई स्तर' : 'Default Difficulty'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                    {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => void updateSettings({ defaultDifficulty: diff })}
                        className={`px-2 py-2 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap ${
                          settings.defaultDifficulty === diff
                            ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'hi' ? 'दैनिक लक्ष्य (प्रश्न/दिन)' : 'Daily Practice Target (Qs/day)'}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={500}
                    value={settings.dailyTarget}
                    onChange={(e) => {
                      const val = Math.max(5, Math.min(500, Number(e.target.value) || 5));
                      void updateSettings({ dailyTarget: val });
                    }}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'hi' ? 'डिफ़ॉल्ट प्रश्न संख्या' : 'Default Question Count'}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={100}
                    value={settings.defaultQuestionCount}
                    onChange={(e) => {
                      const val = Math.max(5, Math.min(100, Number(e.target.value) || 15));
                      void updateSettings({ defaultQuestionCount: val });
                    }}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {lang === 'hi' ? 'डिफ़ॉल्ट टाइमर (सेकंड)' : 'Default Timer (seconds)'}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={7200}
                    step={30}
                    value={settings.defaultTimerSec}
                    onChange={(e) => {
                      const val = Math.max(0, Math.min(7200, Number(e.target.value) || 0));
                      void updateSettings({ defaultTimerSec: val });
                    }}
                    className="w-full px-3.5 py-2 text-sm font-mono tabular-nums rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </section>

            {/* 3. Feedback & Notifications */}
            <section className="space-y-3 pt-5 border-t border-slate-200/80 dark:border-slate-800">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {lang === 'hi' ? 'ध्वनि व अनुस्मारक' : 'Feedback & Reminders'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <Volume2 className="w-4 h-4 text-indigo-500" />
                    {t(lang, 'soundEffects')}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => void updateSettings({ soundEnabled: e.target.checked })}
                    className="rounded accent-indigo-600 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <Vibrate className="w-4 h-4 text-indigo-500" />
                    {t(lang, 'vibration')}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.vibrationEnabled}
                    onChange={(e) => void updateSettings({ vibrationEnabled: e.target.checked })}
                    className="rounded accent-indigo-600 w-4 h-4"
                  />
                </label>

                <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 cursor-pointer">
                  <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <Bell className="w-4 h-4 text-indigo-500" />
                    {lang === 'hi' ? 'अध्ययन रिमाइंडर' : 'Study Reminders'}
                  </span>
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={(e) => void updateSettings({ notificationsEnabled: e.target.checked })}
                    className="rounded accent-indigo-600 w-4 h-4"
                  />
                </label>
              </div>
            </section>

            {/* Footer Controls */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              {onReplayTour ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReplayTour();
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors whitespace-nowrap"
                >
                  <Compass className="w-4 h-4" />
                  {lang === 'hi' ? 'गाइडेड टूर फिर देखें' : 'Replay Guided Tour'}
                </button>
              ) : (
                <span />
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
              >
                {lang === 'hi' ? 'पूर्ण' : 'Done'}
              </button>
            </div>

            {/* Configurable Social Media Links Footer */}
            <SocialFooter compact />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
