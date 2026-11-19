import React, { useMemo } from 'react';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  ClipboardCheck,
  Flame,
  Play,
  Trash2,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { REVISION_GUIDES } from '../data/revisionData';
import { getLocalDateStr } from '../db/offlineDb';
import { t } from '../i18n/translations';
import type { PracticeSession } from '../types/math';
import { getTopicStyle } from '../utils/topicTheme';
import { ProgressRing, TopicIconGlyph, TopicMathSymbol } from './DesignSystem';

interface HomeDashboardProps {
  onNavigate: (
    tab: 'home' | 'practice' | 'mock_tests' | 'revision' | 'performance' | 'profile' | 'admin'
  ) => void;
  onOpenPractice: (opts?: {
    topicId?: string;
    subMode?: 'topics' | 'test';
    testCategory?: 'anytime' | 'events';
    filter?: 'all' | 'cat_quick_recall' | 'cat_basics';
  }) => void;
  onResumeSession: (session: PracticeSession) => void;
}

function formatTotalDuration(totalSec: number): string {
  const mins = Math.floor(totalSec / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs}h ${rem}m`;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onOpenPractice,
  onResumeSession,
}) => {
  const {
    userProfile,
    guestProfile,
    isGuest,
    settings,
    stats,
    dailyActivities,
    sessions,
    topics,
    discardIncompleteSession,
  } = usePlatform();

  const lang = settings.language;
  const todayStr = getLocalDateStr();
  const todayActivity = dailyActivities.find((d) => d.date === todayStr);
  const attemptedToday = todayActivity?.questionsAttempted ?? 0;
  const correctToday = todayActivity?.correctAnswers ?? 0;
  const todayAccuracy = attemptedToday > 0 ? Math.round((correctToday / attemptedToday) * 100) : 0;
  const targetPct = Math.min(100, Math.round((attemptedToday / Math.max(1, settings.dailyTarget)) * 100));

  const incompleteSession = sessions.find(
    (s) => s.status === 'in_progress' && (s.questionsSnapshot?.length ?? 0) > 0
  );
  const completedSessions = useMemo(
    () => sessions.filter((s) => s.status === 'completed'),
    [sessions]
  );
  const lastCompleted = completedSessions[0];

  const activeTopics = useMemo(() => topics.filter((tp) => tp.active), [topics]);
  const quickRecallTopics = useMemo(
    () => activeTopics.filter((tp) => tp.categoryId === 'cat_quick_recall'),
    [activeTopics]
  );

  const hour = new Date().getHours();
  const greeting =
    lang === 'hi'
      ? hour < 12
        ? 'सुप्रभात'
        : hour < 17
          ? 'नमस्ते'
          : 'शुभ संध्या'
      : hour < 12
        ? 'Good morning'
        : hour < 17
          ? 'Good afternoon'
          : 'Good evening';

  const displayName = isGuest ? guestProfile.fullName : userProfile?.fullName || 'Student';
  const targetExamText = isGuest
    ? guestProfile.targetExam
    : userProfile?.targetExam || 'Competitive Mathematics';

  const motivationalLine =
    attemptedToday >= settings.dailyTarget
      ? lang === 'hi'
        ? 'आज का दैनिक लक्ष्य पूरा हुआ। शानदार गति बनाए रखें!'
        : 'Daily practice target achieved. Keep your calculation sharpness high.'
      : lang === 'hi'
        ? `आज के लक्ष्य के लिए केवल ${Math.max(0, settings.dailyTarget - attemptedToday)} प्रश्न शेष हैं।`
        : `${Math.max(0, settings.dailyTarget - attemptedToday)} questions left to complete today's speed target.`;

  return (
    <div className="space-y-8">
      {/* A. Clean Welcome Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
            {targetExamText} · {todayStr}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            {greeting}, {displayName}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{motivationalLine}</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('profile')}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap shrink-0"
        >
          {lang === 'hi' ? 'प्रोफ़ाइल और बैज देखें →' : 'View Milestones & Badges →'}
        </button>
      </section>

      {/* B. Highlighted Daily Progress Hero Card */}
      <section className="rounded-2xl p-6 sm:p-8 text-white bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 shadow-lg shadow-indigo-600/15">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <ProgressRing
              percentage={targetPct}
              size={118}
              strokeWidth={10}
              trackColorClass="text-white/20"
              strokeColor="#34d399"
              label={`${targetPct}%`}
              sublabel="Daily Goal"
              textColorClass="text-white"
            />

            <div className="space-y-3">
              <div>
                <div className="text-xs font-medium text-indigo-100">{t(lang, 'dailyTarget')}</div>
                <div className="text-2xl sm:text-3xl font-bold font-mono tabular-nums mt-0.5">
                  {attemptedToday} / {settings.dailyTarget}{' '}
                  <span className="text-sm font-sans font-normal text-indigo-100">questions today</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-indigo-100">
                <span className="font-mono tabular-nums">
                  {t(lang, 'correctToday')}: <strong className="text-white">{correctToday}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  {t(lang, 'accuracy')}: <strong className="text-white">{todayAccuracy}%</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <Flame className="w-4 h-4 text-amber-300" />
                  <strong className="text-white">{stats.currentStreak}d</strong> streak
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Time: <strong className="text-white">{formatTotalDuration(stats.totalTimeSec)}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => onOpenPractice({ subMode: 'topics', filter: 'all' })}
              className="inline-flex items-center gap-2 px-5 py-3 bg-white text-indigo-900 text-sm font-semibold rounded-xl hover:bg-indigo-50 transition-colors shadow-sm whitespace-nowrap"
            >
              <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" />
              {t(lang, 'startPractice')}
            </button>
            <button
              onClick={() => onNavigate('revision')}
              className="inline-flex items-center gap-2 px-4 py-3 bg-white/15 hover:bg-white/20 text-white text-sm font-medium rounded-xl border border-white/20 transition-colors whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4" />
              {t(lang, 'navRevision')}
            </button>
          </div>
        </div>
      </section>

      {/* C. Continue Learning Card */}
      {incompleteSession ? (
        <section className="bg-white dark:bg-[#11192E] border border-indigo-200 dark:border-indigo-900/70 rounded-2xl p-5 shadow-sm shadow-indigo-500/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 fill-white" />
            </div>
            <div>
              <div className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                {t(lang, 'continueSession')} · In Progress
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {incompleteSession.topicName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                Question {(incompleteSession.currentIndex ?? 0) + 1} of {incompleteSession.totalQuestions} ·{' '}
                {incompleteSession.correctAnswers} correct so far
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => void discardIncompleteSession(incompleteSession.id)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
            >
              <Trash2 className="w-4 h-4" />
              {t(lang, 'discardSession')}
            </button>
            <button
              onClick={() => onResumeSession(incompleteSession)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Play className="w-4 h-4" />
              {t(lang, 'resumePractice')}
            </button>
          </div>
        </section>
      ) : lastCompleted ? (
        <section className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                getTopicStyle(lastCompleted.topicId).iconBg
              }`}
            >
              <TopicIconGlyph name={getTopicStyle(lastCompleted.topicId).iconName} className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                {t(lang, 'continueSession')} · Last Practiced
              </div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                {lastCompleted.topicName}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                {lastCompleted.correctAnswers}/{lastCompleted.totalQuestions} correct · {lastCompleted.accuracy}% accuracy ·{' '}
                {lastCompleted.totalTimeSec}s
              </div>
            </div>
          </div>
          <button
            onClick={() => onOpenPractice({ topicId: lastCompleted.topicId })}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            Continue Topic
            <ArrowRight className="w-4 h-4" />
          </button>
        </section>
      ) : null}

      {/* D. Clear 3-Card Learning Hub */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {lang === 'hi' ? 'अध्ययन और अभ्यास' : 'Learn & Practice'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => onOpenPractice({ subMode: 'topics', filter: 'all' })}
            className="text-left p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center">
                <Calculator className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t(lang, 'navPractice')}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {lang === 'hi'
                  ? 'वर्ग, घन, पहाड़े, प्रतिशत, भिन्न और जोड़-घटाव-गुणा-भाग का कस्टम अभ्यास।'
                  : 'All 14 topics: Squares, Tables, Roots, Trig, %, Fractions & Arithmetic calculations.'}
              </p>
            </div>
            <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
              {activeTopics.length} topics · Custom setup
            </div>
          </button>

          <button
            onClick={() => onNavigate('revision')}
            className="text-left p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none hover:border-orange-400 dark:hover:border-orange-500 transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{t(lang, 'navRevision')}</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {lang === 'hi'
                  ? 'पहाड़े 1–50, सूत्र, शॉर्टकट नियम और हल किए गए उदाहरण पढ़ें व याद करें।'
                  : 'Read & memorize formulas, tables 1–50, shortcut rules & solved examples.'}
              </p>
            </div>
            <div className="text-xs font-mono text-orange-600 dark:text-orange-400">
              {REVISION_GUIDES.length} revision guides
            </div>
          </button>

          <button
            onClick={() => onOpenPractice({ subMode: 'test' })}
            className="text-left p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none hover:border-teal-400 dark:hover:border-teal-500 transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lang === 'hi' ? 'मॉक टेस्ट' : 'Mock Tests'}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                {lang === 'hi'
                  ? 'एनीटाइम मॉक टेस्ट व पुरस्कारों सहित लाइव शेड्यूल्ड टेस्ट इवेंट्स।'
                  : 'Anytime topic/full-length mocks plus live Scheduled Test Events & prizes.'}
              </p>
            </div>
            <div className="text-xs font-mono text-teal-600 dark:text-teal-400">
              {lang === 'hi' ? 'एनीटाइम मॉक · लाइव इवेंट्स' : 'Anytime Mocks · Live Events'}
            </div>
          </button>
        </div>
      </section>

      {/* E. Quick Access Topics */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t(lang, 'quickAccessModules')}</h2>
          <button
            onClick={() => onOpenPractice({ subMode: 'topics', filter: 'all' })}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            {lang === 'hi' ? `सभी ${activeTopics.length} विषय देखें` : `All ${activeTopics.length} Topics`}{' '}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickRecallTopics.map((topic) => {
            const st = getTopicStyle(topic.id);

            return (
              <button
                key={topic.id}
                onClick={() => onOpenPractice({ topicId: topic.id })}
                className="text-left p-5 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none hover:border-indigo-400 dark:hover:border-indigo-500 transition-all hover:-translate-y-0.5 group flex flex-col justify-between gap-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${st.iconBg}`}>
                    <TopicMathSymbol topicId={topic.id} size="lg" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>

                <div>
                  <div className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {lang === 'hi' ? topic.nameHi : topic.name}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {lang === 'hi' ? topic.descriptionHi : topic.description}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  {t(lang, 'startPractice')}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Recently Practiced History */}
      <section className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{t(lang, 'recentSessions')}</h2>
          <button
            onClick={() => onNavigate('performance')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            Full Analytics →
          </button>
        </div>

        {completedSessions.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
            No completed sessions yet. Pick any Practice topic or Mock Test above to record your first session.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Module</th>
                  <th className="py-2.5 px-3 font-medium">Mode</th>
                  <th className="py-2.5 px-3 font-medium text-right">Attempted</th>
                  <th className="py-2.5 px-3 font-medium text-right">Correct</th>
                  <th className="py-2.5 px-3 font-medium text-right">Accuracy</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {completedSessions.slice(0, 5).map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-white">{sess.topicName}</td>
                    <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">
                      {sess.mode.replace('_', ' ')} · {sess.difficulty}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{sess.attemptedQuestions}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {sess.correctAnswers}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
                      {sess.accuracy}%
                    </td>
                    <td className="py-3 pl-3 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {sess.totalTimeSec}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
