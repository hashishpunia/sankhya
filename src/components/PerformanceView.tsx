import React, { useMemo, useState } from 'react';
import { AlertCircle, ArrowRight, Flame, Timer, TrendingUp } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { t } from '../i18n/translations';
import type { SessionLaunchConfig } from '../types/math';
import { getTopicStyle } from '../utils/topicTheme';
import { ProgressRing, TopicIconGlyph } from './DesignSystem';

interface PerformanceViewProps {
  onStartTopicPractice: (config: SessionLaunchConfig) => void;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({ onStartTopicPractice }) => {
  const { stats, dailyActivities, sessions, answers, topics, settings } = usePlatform();
  const lang = settings.language;
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const completedSessions = useMemo(
    () =>
      sessions
        .filter((s) => s.status === 'completed')
        .sort((a, b) => a.startedAtIso.localeCompare(b.startedAtIso)),
    [sessions]
  );

  const overallAccuracy =
    stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;

  const avgResponseTime = useMemo(() => {
    const valid = answers.filter((a) => !a.isSkipped && a.responseTimeSec > 0);
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, a) => acc + a.responseTimeSec, 0);
    return Number((sum / valid.length).toFixed(1));
  }, [answers]);

  const topicAnalytics = useMemo(() => {
    const map = new Map<
      string,
      { topicId: string; attempted: number; correct: number; totalTime: number }
    >();
    for (const ans of answers) {
      if (ans.isSkipped) continue;
      const cur = map.get(ans.topicId) ?? {
        topicId: ans.topicId,
        attempted: 0,
        correct: 0,
        totalTime: 0,
      };
      cur.attempted += 1;
      if (ans.isCorrect) cur.correct += 1;
      cur.totalTime += ans.responseTimeSec;
      map.set(ans.topicId, cur);
    }

    return topics
      .map((tp) => {
        const rec = map.get(tp.id);
        const attempted = rec?.attempted ?? 0;
        const correct = rec?.correct ?? 0;
        const acc = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
        const avgSec = attempted > 0 ? Number(((rec?.totalTime ?? 0) / attempted).toFixed(1)) : 0;
        return {
          topic: tp,
          attempted,
          correct,
          accuracy: acc,
          avgSec,
        };
      })
      .sort((a, b) => b.attempted - a.attempted);
  }, [answers, topics]);

  const weakTopics = useMemo(
    () => topicAnalytics.filter((item) => item.attempted >= 3 && item.accuracy < 75),
    [topicAnalytics]
  );

  const progressBars = useMemo(() => {
    if (timeframe === 'daily') {
      return dailyActivities.slice(-10).map((d) => ({
        label: d.date.slice(5),
        attempted: d.questionsAttempted,
        correct: d.correctAnswers,
      }));
    }
    if (timeframe === 'weekly') {
      const buckets = new Map<string, { attempted: number; correct: number }>();
      for (const d of dailyActivities) {
        const dt = new Date(d.date);
        const weekStart = new Date(dt);
        weekStart.setDate(dt.getDate() - dt.getDay());
        const key = weekStart.toISOString().slice(5, 10);
        const prev = buckets.get(key) ?? { attempted: 0, correct: 0 };
        buckets.set(key, {
          attempted: prev.attempted + d.questionsAttempted,
          correct: prev.correct + d.correctAnswers,
        });
      }
      return Array.from(buckets.entries())
        .slice(-8)
        .map(([label, v]) => ({ label: `W ${label}`, ...v }));
    }
    const buckets = new Map<string, { attempted: number; correct: number }>();
    for (const d of dailyActivities) {
      const key = d.date.slice(0, 7);
      const prev = buckets.get(key) ?? { attempted: 0, correct: 0 };
      buckets.set(key, {
        attempted: prev.attempted + d.questionsAttempted,
        correct: prev.correct + d.correctAnswers,
      });
    }
    return Array.from(buckets.entries())
      .slice(-6)
      .map(([label, v]) => ({ label, ...v }));
  }, [dailyActivities, timeframe]);

  const maxBarVal = Math.max(10, ...progressBars.map((b) => b.attempted));
  const trendSessions = completedSessions.slice(-12);
  const maxSpeed = Math.max(10, ...trendSessions.map((s) => s.avgTimePerQuestionSec || 1));

  const buildPolyline = (values: number[], maxValue: number, width: number, height: number) => {
    if (values.length === 0) return '';
    if (values.length === 1) {
      const y = height - (values[0] / maxValue) * (height - 20) - 10;
      return `20,${y} ${width - 20},${y}`;
    }
    return values
      .map((val, i) => {
        const x = 16 + (i / (values.length - 1)) * (width - 32);
        const y = height - 12 - (val / maxValue) * (height - 24);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t(lang, 'navPerformance')}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
          All analytics and mastery bars are calculated from your saved practice and test records.
        </p>
      </div>

      {/* Hero Accuracy Ring + KPI Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-4 rounded-2xl p-6 text-white bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 shadow-lg shadow-indigo-600/15 flex items-center gap-6">
          <ProgressRing
            percentage={overallAccuracy}
            size={120}
            strokeWidth={11}
            trackColorClass="text-white/20"
            strokeColor="#34d399"
            label={`${overallAccuracy}%`}
            sublabel="Accuracy"
            textColorClass="text-white"
          />
          <div className="space-y-1.5">
            <div className="text-xs font-medium text-indigo-100">Overall Accuracy</div>
            <div className="text-2xl font-bold font-mono tabular-nums">
              {stats.totalCorrect} / {stats.totalAttempted}
            </div>
            <div className="text-xs text-indigo-100 font-mono tabular-nums">
              {completedSessions.length} completed sessions
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Questions Attempted</div>
            <div className="text-3xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 my-2">
              {stats.totalAttempted}
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              {stats.totalCorrect} correct · {stats.totalIncorrect} wrong
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Average Solving Time</div>
            <div className="flex items-center gap-2 text-3xl font-bold font-mono tabular-nums text-teal-600 dark:text-teal-400 my-2">
              <Timer className="w-6 h-6" />
              {avgResponseTime}s
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Fastest: {stats.fastestResponseSec > 0 ? `${stats.fastestResponseSec}s` : '—'}
            </div>
          </div>

          <div className="p-5 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col justify-between">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Learning Streak</div>
            <div className="flex items-center gap-2 text-3xl font-bold font-mono tabular-nums text-orange-500 dark:text-orange-400 my-2">
              <Flame className="w-6 h-6" />
              {stats.currentStreak}d
            </div>
            <div className="text-xs text-slate-500 font-mono tabular-nums">
              Longest: {stats.longestStreak} days
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Practice Volume</h2>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['daily', 'weekly', 'monthly'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize ${
                    timeframe === tf
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {progressBars.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              Complete a practice session to visualize your daily volume.
            </div>
          ) : (
            <div className="h-48 flex items-end gap-2 pt-4">
              {progressBars.map((bar) => {
                const hTotal = Math.max(6, Math.round((bar.attempted / maxBarVal) * 140));
                const hCorrect = Math.round((bar.correct / Math.max(1, bar.attempted)) * hTotal);
                return (
                  <div key={bar.label} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <div className="text-[11px] font-mono tabular-nums text-slate-500">{bar.attempted}</div>
                    <div
                      className="w-full max-w-[36px] bg-indigo-100 dark:bg-slate-800 rounded-t-lg relative overflow-hidden flex items-end"
                      style={{ height: `${hTotal}px` }}
                      title={`${bar.label}: ${bar.correct}/${bar.attempted} correct`}
                    >
                      <div
                        className="w-full bg-gradient-to-t from-indigo-600 to-blue-500"
                        style={{ height: `${hCorrect}px` }}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate max-w-full">{bar.label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-6 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              Accuracy & Speed Trends
            </h2>
            <span className="text-xs text-slate-500 font-mono">Last {trendSessions.length} sessions</span>
          </div>

          {trendSessions.length === 0 ? (
            <div className="h-44 flex items-center justify-center text-sm text-slate-500 dark:text-slate-400">
              Session trends will appear after your first completed drill.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-slate-900/60 border border-indigo-200/60 dark:border-slate-800">
                <div className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-2">Accuracy Trend (%)</div>
                <svg viewBox="0 0 240 100" className="w-full h-24 overflow-visible">
                  <line
                    x1="16"
                    y1="88"
                    x2="224"
                    y2="88"
                    stroke="currentColor"
                    className="text-slate-300 dark:text-slate-700"
                    strokeWidth="1"
                  />
                  <polyline
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPolyline(
                      trendSessions.map((s) => s.accuracy),
                      100,
                      240,
                      100
                    )}
                  />
                </svg>
              </div>
              <div className="p-3.5 rounded-xl bg-teal-50/60 dark:bg-slate-900/60 border border-teal-200/60 dark:border-slate-800">
                <div className="text-xs font-medium text-teal-700 dark:text-teal-300 mb-2">Avg Seconds / Question</div>
                <svg viewBox="0 0 240 100" className="w-full h-24 overflow-visible">
                  <line
                    x1="16"
                    y1="88"
                    x2="224"
                    y2="88"
                    stroke="currentColor"
                    className="text-slate-300 dark:text-slate-700"
                    strokeWidth="1"
                  />
                  <polyline
                    fill="none"
                    stroke="#0d9488"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPolyline(
                      trendSessions.map((s) => s.avgTimePerQuestionSec),
                      maxSpeed,
                      240,
                      100
                    )}
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Weak Topics Focus */}
      {weakTopics.length > 0 && (
        <div className="bg-orange-50/80 dark:bg-orange-950/25 border border-orange-200 dark:border-orange-900 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-orange-800 dark:text-orange-300">
            <AlertCircle className="w-4 h-4" />
            {t(lang, 'weakTopics')}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {weakTopics.map((item) => (
              <div
                key={item.topic.id}
                className="flex items-center justify-between p-3.5 bg-white dark:bg-[#11192E] rounded-xl border border-orange-200/80 dark:border-orange-900/60"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {lang === 'hi' ? item.topic.nameHi : item.topic.name}
                  </div>
                  <div className="text-xs font-mono tabular-nums text-rose-600 dark:text-rose-400">
                    {item.accuracy}% accuracy · {item.attempted} Qs
                  </div>
                </div>
                <button
                  onClick={() =>
                    onStartTopicPractice({
                      mode: item.topic.categoryId === 'cat_basics' ? 'basics' : 'quick_recall',
                      topicId: item.topic.id,
                      topicName: lang === 'hi' ? item.topic.nameHi : item.topic.name,
                      difficulty: 'medium',
                      questionCount: 15,
                      timed: false,
                      timeLimitSec: 300,
                      questionTypeFilter: 'all',
                      orderMode: 'random',
                      instantFeedback: true,
                    })
                  }
                  className="inline-flex items-center gap-1 px-3.5 py-2 bg-orange-600 text-white text-xs font-semibold rounded-lg hover:bg-orange-700 whitespace-nowrap"
                >
                  {t(lang, 'practiceWeakTopic')}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Topic-Wise Performance Breakdown */}
      <div className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
        <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">Topic-Wise Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-medium">Topic</th>
                <th className="py-2.5 px-3 font-medium text-right">Attempted</th>
                <th className="py-2.5 px-3 font-medium text-right">Correct</th>
                <th className="py-2.5 px-3 font-medium">Mastery</th>
                <th className="py-2.5 px-3 font-medium text-right">Avg Time</th>
                <th className="py-2.5 pl-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {topicAnalytics.map((row) => {
                const st = getTopicStyle(row.topic.id);
                return (
                  <tr key={row.topic.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${st.iconBg}`}>
                          <TopicIconGlyph name={st.iconName} className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {lang === 'hi' ? row.topic.nameHi : row.topic.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums">{row.attempted}</td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {row.correct}
                    </td>
                    <td className="py-3 px-3 min-w-[140px]">
                      {row.attempted > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${st.gradient}`}
                              style={{ width: `${row.accuracy}%` }}
                            />
                          </div>
                          <span className="font-mono text-xs font-bold tabular-nums w-9 text-right">
                            {row.accuracy}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-500">
                      {row.attempted > 0 ? `${row.avgSec}s` : '—'}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <button
                        onClick={() =>
                          onStartTopicPractice({
                            mode: row.topic.categoryId === 'cat_basics' ? 'basics' : 'quick_recall',
                            topicId: row.topic.id,
                            topicName: lang === 'hi' ? row.topic.nameHi : row.topic.name,
                            difficulty: settings.defaultDifficulty,
                            questionCount: 15,
                            timed: false,
                            timeLimitSec: 300,
                            questionTypeFilter: 'all',
                            orderMode: 'random',
                            instantFeedback: true,
                          })
                        }
                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Practice
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
