import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  Layers,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import { t } from '../i18n/translations';
import type { SessionDifficulty, SessionLaunchConfig, Topic } from '../types/math';
import { getTopicStyle } from '../utils/topicTheme';
import { TopicMathSymbol } from './DesignSystem';
import { ScheduledEventsView } from './ScheduledEventsView';

export type MockTestCategory = 'anytime' | 'events';
type AnytimeFormat = 'topic' | 'mixed' | 'full_length' | 'difficulty';
type TopicGroupFilter = 'all' | 'speed' | 'basics' | 'selected';

interface MockTestsViewProps {
  initialCategory?: MockTestCategory;
  initialNonce?: number;
  initialShowAdvanced?: boolean;
  onStartSession: (config: SessionLaunchConfig) => void;
  onOpenProfile?: () => void;
}

const QUESTION_PRESETS = [10, 20, 25, 50, 100];
const DURATION_PRESETS = [5, 10, 15, 30, 45, 60];
const MARKING_PRESETS: Array<{
  id: string;
  label: string;
  marks: number;
  neg: number;
  tag: string;
  tagHi: string;
}> = [
  { id: 'none', label: '+1 / 0', marks: 1, neg: 0, tag: 'No Negative', tagHi: 'निगेटिव नहीं' },
  { id: 'gentle', label: '+1 / -0.25', marks: 1, neg: 0.25, tag: '1/4th Neg', tagHi: 'चौथाई कटौती' },
  { id: 'standard', label: '+2 / -0.5', marks: 2, neg: 0.5, tag: 'SSC Standard', tagHi: 'SSC मानक' },
  { id: 'strict', label: '+4 / -1', marks: 4, neg: 1, tag: 'Strict', tagHi: 'कठोर' },
];

export const MockTestsView: React.FC<MockTestsViewProps> = ({
  initialCategory = 'anytime',
  initialNonce,
  initialShowAdvanced,
  onStartSession,
  onOpenProfile,
}) => {
  const { topics, settings } = usePlatform();
  const lang = settings.language;

  const allActiveTopics = useMemo(() => topics.filter((tp) => tp.active), [topics]);
  const speedTopicIds = useMemo(
    () => allActiveTopics.filter((tp) => tp.categoryId === 'cat_quick_recall').map((tp) => tp.id),
    [allActiveTopics]
  );
  const basicsTopicIds = useMemo(
    () => allActiveTopics.filter((tp) => tp.categoryId === 'cat_basics').map((tp) => tp.id),
    [allActiveTopics]
  );

  const [category, setCategory] = useState<MockTestCategory>(initialCategory);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(Boolean(initialShowAdvanced));
  const [prevNonce, setPrevNonce] = useState<number | undefined>(initialNonce);
  if (initialNonce !== undefined && initialNonce !== prevNonce) {
    setPrevNonce(initialNonce);
    setCategory(initialCategory);
    if (initialShowAdvanced !== undefined) {
      setShowAdvanced(initialShowAdvanced);
    }
  }

  const [eventsSummary, setEventsSummary] = useState<{ total: number; liveOrOpen: number } | null>(null);

  // Anytime Mock Studio State
  const [testType, setTestType] = useState<AnytimeFormat>('mixed');
  const [topicSearch, setTopicSearch] = useState('');
  const [topicFilter, setTopicFilter] = useState<TopicGroupFilter>('all');
  const [selectedTestTopics, setSelectedTestTopics] = useState<string[]>(() =>
    allActiveTopics.slice(0, 4).map((tp) => tp.id)
  );
  const [testDifficulty, setTestDifficulty] = useState<SessionDifficulty>('mixed');
  const [testQuestionCount, setTestQuestionCount] = useState<number>(25);
  const [testTimeMin, setTestTimeMin] = useState<number>(15);
  const [marksPerQ, setMarksPerQ] = useState<number>(2);
  const [negativeMarking, setNegativeMarking] = useState<number>(0.5);

  const filteredTopics = useMemo(() => {
    const q = topicSearch.trim().toLowerCase();
    return allActiveTopics.filter((tp) => {
      if (topicFilter === 'speed' && tp.categoryId !== 'cat_quick_recall') return false;
      if (topicFilter === 'basics' && tp.categoryId !== 'cat_basics') return false;
      if (topicFilter === 'selected' && !selectedTestTopics.includes(tp.id)) return false;
      if (!q) return true;
      return tp.name.toLowerCase().includes(q) || tp.nameHi.toLowerCase().includes(q);
    });
  }, [allActiveTopics, selectedTestTopics, topicFilter, topicSearch]);

  const toggleTestTopic = (id: string) => {
    setSelectedTestTopics((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAnytimeFormat = (nextType: AnytimeFormat) => {
    setTestType(nextType);
    if (nextType === 'topic' && topicFilter === 'selected') {
      setTopicFilter('all');
    }
    if (nextType === 'full_length') {
      setTestQuestionCount(50);
      setTestTimeMin(45);
      setTestDifficulty('mixed');
      setMarksPerQ(2);
      setNegativeMarking(0.5);
    } else if (nextType === 'topic') {
      if (selectedTestTopics.length === 0 && allActiveTopics.length > 0) {
        setSelectedTestTopics([allActiveTopics[0].id]);
      } else if (selectedTestTopics.length > 1) {
        setSelectedTestTopics([selectedTestTopics[0]]);
      }
      setTestQuestionCount(20);
      setTestTimeMin(10);
    } else if (nextType === 'mixed') {
      if (selectedTestTopics.length < 2) {
        setSelectedTestTopics(allActiveTopics.slice(0, 4).map((tp) => tp.id));
      }
      setTestQuestionCount(25);
      setTestTimeMin(15);
    } else if (nextType === 'difficulty') {
      setTestQuestionCount(25);
      setTestTimeMin(15);
      if (testDifficulty === 'mixed') setTestDifficulty('medium');
    }
  };

  const resetParameterDefaults = () => {
    if (testType === 'full_length') {
      setTestQuestionCount(50);
      setTestTimeMin(45);
      setTestDifficulty('mixed');
    } else if (testType === 'topic') {
      setTestQuestionCount(20);
      setTestTimeMin(10);
      setTestDifficulty('mixed');
    } else if (testType === 'difficulty') {
      setTestQuestionCount(25);
      setTestTimeMin(15);
      setTestDifficulty('medium');
    } else {
      setTestQuestionCount(25);
      setTestTimeMin(15);
      setTestDifficulty('mixed');
    }
    setMarksPerQ(2);
    setNegativeMarking(0.5);
  };

  const resolvedTopics = useMemo<Topic[]>(() => {
    if (testType === 'full_length' || testType === 'difficulty') return allActiveTopics;
    if (testType === 'mixed') {
      return allActiveTopics.filter((tp) => selectedTestTopics.includes(tp.id));
    }
    const single =
      allActiveTopics.find((tp) => tp.id === selectedTestTopics[0]) ?? allActiveTopics[0];
    return single ? [single] : [];
  }, [allActiveTopics, selectedTestTopics, testType]);

  const resolvedTopicIds = useMemo(() => resolvedTopics.map((tp) => tp.id), [resolvedTopics]);

  const canLaunchTest = resolvedTopicIds.length > 0;

  const blueprintScopeLabel = useMemo(() => {
    if (testType === 'full_length') {
      return lang === 'hi'
        ? `पूर्ण पाठ्यक्रम (${allActiveTopics.length} विषय)`
        : `Full Syllabus (${allActiveTopics.length} Topics)`;
    }
    if (testType === 'difficulty') {
      const diffWord = testDifficulty.charAt(0).toUpperCase() + testDifficulty.slice(1);
      return lang === 'hi'
        ? `${diffWord} स्तर · सभी विषय`
        : `${diffWord} Tier · All Topics`;
    }
    if (testType === 'topic') {
      const tp = resolvedTopics[0];
      return tp ? (lang === 'hi' ? tp.nameHi : tp.name) : 'Single Topic';
    }
    if (resolvedTopics.length === 0) {
      return lang === 'hi' ? 'कोई विषय चयनित नहीं' : 'Select Blended Topics';
    }
    return lang === 'hi'
      ? `${resolvedTopics.length} मिश्रित विषय`
      : `${resolvedTopics.length} Blended Topics`;
  }, [allActiveTopics.length, lang, resolvedTopics, testDifficulty, testType]);

  const safeQuestionCount = Math.max(5, Math.min(100, Number.isFinite(testQuestionCount) ? testQuestionCount : 20));
  const safeTimeMin = Math.max(1, Math.min(180, Number.isFinite(testTimeMin) ? testTimeMin : 15));
  const maxScore = Number((safeQuestionCount * marksPerQ).toFixed(1));
  const secPerQuestion = Math.round((safeTimeMin * 60) / safeQuestionCount);
  const markingDisplay = negativeMarking > 0 ? `+${marksPerQ} / -${negativeMarking}` : `+${marksPerQ} / 0`;

  const handleStartTest = () => {
    if (!canLaunchTest) return;
    const label =
      testType === 'full_length'
        ? `Full-Length Math Mock (${safeQuestionCount} Qs)`
        : testType === 'difficulty'
          ? `${testDifficulty.charAt(0).toUpperCase() + testDifficulty.slice(1)} Difficulty Mock Test`
          : testType === 'topic'
            ? resolvedTopics[0]?.name || 'Topic-Wise Mock Test'
            : `Mixed Topic Mock (${resolvedTopicIds.length} Topics)`;

    onStartSession({
      mode: 'test',
      topicId: resolvedTopicIds[0],
      topicIds: resolvedTopicIds,
      topicName: label,
      difficulty: testDifficulty,
      questionCount: safeQuestionCount,
      timed: true,
      timeLimitSec: safeTimeMin * 60,
      questionTypeFilter: 'mcq',
      orderMode: 'random',
      instantFeedback: false,
      marksPerQuestion: marksPerQ,
      negativeMarking,
    });
  };

  const formatOptions: Array<{
    key: AnytimeFormat;
    title: string;
    titleHi: string;
    cue: string;
    cueHi: string;
    Icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      key: 'topic',
      title: 'Topic-Wise',
      titleHi: 'विषय-वार',
      cue: 'Single focus',
      cueHi: 'एक विषय',
      Icon: Calculator,
    },
    {
      key: 'mixed',
      title: 'Mixed Topic',
      titleHi: 'मिश्रित विषय',
      cue: 'Blended topics',
      cueHi: 'विषय मिश्रण',
      Icon: Layers,
    },
    {
      key: 'full_length',
      title: 'Full-Length',
      titleHi: 'पूर्ण लंबाई',
      cue: `${allActiveTopics.length} topics`,
      cueHi: `${allActiveTopics.length} विषय`,
      Icon: Award,
    },
    {
      key: 'difficulty',
      title: 'Difficulty Tier',
      titleHi: 'कठिनाई स्तर',
      cue: 'Targeted level',
      cueHi: 'लक्षित स्तर',
      Icon: Sliders,
    },
  ];

  const activeFormatMeta = formatOptions.find((f) => f.key === testType) ?? formatOptions[0];

  const allVisibleSelected =
    filteredTopics.length > 0 && filteredTopics.every((tp) => selectedTestTopics.includes(tp.id));

  const handleToggleVisibleTopics = () => {
    const visibleIds = filteredTopics.map((tp) => tp.id);
    if (visibleIds.length === 0) return;
    if (allVisibleSelected) {
      setSelectedTestTopics((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedTestTopics((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const renderFilterPillNav = (allowSelectedTab: boolean) => {
    const pills: Array<{ id: TopicGroupFilter; label: string; count: number }> = [
      { id: 'all', label: lang === 'hi' ? 'सभी' : 'All', count: allActiveTopics.length },
      { id: 'speed', label: lang === 'hi' ? 'त्वरित गणना' : 'Speed Math', count: speedTopicIds.length },
      { id: 'basics', label: lang === 'hi' ? 'अंकगणित' : 'Arithmetic', count: basicsTopicIds.length },
      ...(allowSelectedTab
        ? [{ id: 'selected' as const, label: lang === 'hi' ? 'चयनित' : 'Selected', count: selectedTestTopics.length }]
        : []),
    ];

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
        <div
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800"
          role="tablist"
          aria-label={lang === 'hi' ? 'विषय फ़िल्टर' : 'Topic filter pills'}
        >
          {pills.map((pill) => {
            const active = topicFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTopicFilter(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>{pill.label}</span>
                <span
                  className={`font-mono tabular-nums text-[11px] ${
                    active ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {pill.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 ml-auto">
          <div className="relative w-36 sm:w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={topicSearch}
              onChange={(e) => setTopicSearch(e.target.value)}
              placeholder={lang === 'hi' ? 'खोजें...' : 'Find topic...'}
              aria-label="Find topic"
              className="w-full h-8 pl-8 pr-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {allowSelectedTab && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <button
                type="button"
                onClick={handleToggleVisibleTopics}
                disabled={filteredTopics.length === 0}
                className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                {allVisibleSelected
                  ? lang === 'hi'
                    ? 'व्यू हटाएं'
                    : 'Unselect view'
                  : lang === 'hi'
                    ? 'व्यू चुनें'
                    : 'Select view'}
              </button>
              {selectedTestTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTestTopics([]);
                    if (topicFilter === 'selected') setTopicFilter('all');
                  }}
                  className="px-2 py-1 rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 transition-colors whitespace-nowrap"
                >
                  {lang === 'hi' ? 'रीसेट' : 'Clear'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTopicTile = (tp: Topic, multi: boolean) => {
    const chosen = multi
      ? selectedTestTopics.includes(tp.id)
      : selectedTestTopics[0] === tp.id;
    const style = getTopicStyle(tp.id);

    return (
      <button
        key={tp.id}
        type="button"
        onClick={() => (multi ? toggleTestTopic(tp.id) : setSelectedTestTopics([tp.id]))}
        className={`group px-3 py-2.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2.5 min-h-[48px] ${
          chosen
            ? 'border-indigo-600 bg-indigo-50/85 dark:bg-indigo-950/45 text-indigo-950 dark:text-indigo-100 shadow-xs'
            : 'border-slate-200/80 dark:border-slate-800 bg-slate-50/45 dark:bg-slate-900/35 text-slate-700 dark:text-slate-200 hover:border-indigo-300 hover:bg-white dark:hover:bg-slate-900/70'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${style.iconBg}`}
          >
            <TopicMathSymbol topicId={tp.id} size="sm" />
          </div>
          <span className={`text-xs leading-snug truncate ${chosen ? 'font-bold' : 'font-semibold'}`}>
            {lang === 'hi' ? tp.nameHi : tp.name}
          </span>
        </div>

        {multi ? (
          <span
            className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-colors ${
              chosen
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 dark:border-slate-700 group-hover:border-indigo-400'
            }`}
          >
            {chosen && <Check className="w-2.5 h-2.5" />}
          </span>
        ) : (
          chosen && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
        )}
      </button>
    );
  };

  const renderSummaryTopicShowcase = () => {
    if (testType === 'topic') {
      const single = resolvedTopics[0];
      if (!single) return null;
      const st = getTopicStyle(single.id);
      return (
        <div className="flex items-center gap-3 pt-1">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${st.iconBg}`}>
            <TopicMathSymbol topicId={single.id} size="lg" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-bold leading-snug text-white truncate">
              {lang === 'hi' ? single.nameHi : single.name}
            </h3>
            <p className="text-xs text-indigo-200/80 truncate mt-0.5">
              {lang === 'hi' ? 'एकल विषय मूल्यांकन' : 'Single topic simulation'}
            </p>
          </div>
        </div>
      );
    }

    if (testType === 'mixed') {
      if (resolvedTopics.length === 0) {
        return (
          <div className="pt-1">
            <h3 className="text-base font-bold text-white">
              {lang === 'hi' ? 'कोई विषय चयनित नहीं' : 'No topics selected'}
            </h3>
            <p className="text-xs text-indigo-200/75 mt-1">
              {lang === 'hi'
                ? 'परीक्षा शुरू करने के लिए बाईं ओर से कम से कम 1 विषय चुनें।'
                : 'Select at least 1 topic from Blended Topics to build your paper.'}
            </p>
          </div>
        );
      }

      const previewTopics = resolvedTopics.slice(0, 6);
      const remainingCount = resolvedTopics.length - previewTopics.length;

      return (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-base sm:text-lg font-bold leading-snug text-white truncate">
              {blueprintScopeLabel}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {previewTopics.map((tp) => {
              const st = getTopicStyle(tp.id);
              return (
                <div
                  key={tp.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/10 border border-white/10 min-w-0"
                >
                  <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${st.iconBg}`}>
                    <TopicMathSymbol topicId={tp.id} size="xs" />
                  </span>
                  <span className="text-[11px] font-medium text-white/95 truncate">
                    {lang === 'hi' ? st.shortLabelHi : st.shortLabel}
                  </span>
                </div>
              );
            })}
          </div>
          {remainingCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {resolvedTopics.slice(6, 12).map((tp) => {
                const st = getTopicStyle(tp.id);
                return (
                  <span
                    key={tp.id}
                    title={lang === 'hi' ? tp.nameHi : tp.name}
                    className={`w-6 h-6 rounded-md flex items-center justify-center ${st.iconBg}`}
                  >
                    <TopicMathSymbol topicId={tp.id} size="xs" />
                  </span>
                );
              })}
              {resolvedTopics.length > 12 && (
                <span className="text-[11px] font-mono text-indigo-200/90 pl-1">
                  +{resolvedTopics.length - 12}
                </span>
              )}
            </div>
          )}
        </div>
      );
    }

    // Full-Length or Difficulty Tier: display full syllabus symbol strip
    return (
      <div className="space-y-2.5 pt-1">
        <h3 className="text-base sm:text-lg font-bold leading-snug text-white truncate">
          {blueprintScopeLabel}
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {allActiveTopics.map((tp) => {
            const st = getTopicStyle(tp.id);
            return (
              <span
                key={tp.id}
                title={lang === 'hi' ? tp.nameHi : tp.name}
                className={`w-6 h-6 rounded-md flex items-center justify-center ${st.iconBg}`}
              >
                <TopicMathSymbol topicId={tp.id} size="xs" />
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {/* Studio Header & Segmented Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-[26px] font-bold text-slate-900 dark:text-white tracking-tight">
            {t(lang, 'navMockTests')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {lang === 'hi'
              ? 'कस्टम मॉक टेस्ट तैयार करें या लाइव प्रतियोगी परीक्षाओं में भाग लें।'
              : 'Configure timed exam simulations on demand or enter scheduled contests.'}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={lang === 'hi' ? 'मॉक टेस्ट श्रेणी' : 'Mock test categories'}
          className="grid grid-cols-2 p-1 rounded-2xl bg-slate-200/75 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/70 md:w-[400px] shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={category === 'anytime'}
            onClick={() => setCategory('anytime')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              category === 'anytime'
                ? 'bg-white dark:bg-[#11192E] text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-4 h-4 shrink-0" />
            <span>{lang === 'hi' ? 'एनीटाइम मॉक' : 'Anytime Mocks'}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={category === 'events'}
            onClick={() => setCategory('events')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
              category === 'events'
                ? 'bg-white dark:bg-[#11192E] text-amber-600 dark:text-amber-300 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span>{lang === 'hi' ? 'लाइव इवेंट्स' : 'Live Events'}</span>
            {eventsSummary && eventsSummary.liveOrOpen > 0 && (
              <span className="font-mono tabular-nums text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {eventsSummary.liveOrOpen}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dynamic Workspace Stage */}
      <AnimatePresence mode="wait">
        {category === 'events' ? (
          <motion.div
            key="events-stage"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          >
            <ScheduledEventsView
              onRequireSignIn={onOpenProfile}
              onEventsSummary={setEventsSummary}
            />
          </motion.div>
        ) : (
          <motion.div
            key="anytime-stage"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-4"
          >
            {/* Compact Format Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {formatOptions.map(({ key, title, titleHi, cue, cueHi, Icon }) => {
                const selected = testType === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectAnytimeFormat(key)}
                    className={`px-3.5 py-2.5 rounded-2xl border text-left transition-all flex items-center gap-3 ${
                      selected
                        ? 'border-indigo-600 bg-white dark:bg-[#11192E] shadow-sm ring-1 ring-indigo-600/15'
                        : 'border-slate-200/80 dark:border-slate-800/90 bg-white/65 dark:bg-[#11192E]/65 hover:bg-white dark:hover:bg-[#11192E] hover:border-indigo-300'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        selected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs sm:text-sm font-bold truncate leading-tight ${
                          selected
                            ? 'text-indigo-700 dark:text-indigo-300'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {lang === 'hi' ? titleHi : title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                        {lang === 'hi' ? cueHi : cue}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Two-Zone Exam Studio + Summary Pass */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Interactive Configuration Area */}
              <div className="lg:col-span-8 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-6 space-y-5 shadow-sm shadow-slate-200/40 dark:shadow-none">
                {/* Step 1: Syllabus & Topic Selection */}
                <AnimatePresence mode="wait">
                  {testType === 'topic' && (
                    <motion.div
                      key="fmt-topic"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="space-y-3"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          {lang === 'hi' ? 'एकल विषय चुनें' : 'Select Focus Topic'}
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {filteredTopics.length} {lang === 'hi' ? 'विषय' : 'topics'}
                        </span>
                      </div>

                      {renderFilterPillNav(false)}

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {filteredTopics.map((tp) => renderTopicTile(tp, false))}
                      </div>
                    </motion.div>
                  )}

                  {testType === 'mixed' && (
                    <motion.div
                      key="fmt-mixed"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="space-y-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          {lang === 'hi' ? 'मिश्रित विषय चुनें' : 'Blended Topics'}
                        </h2>
                        <span className="text-xs font-mono tabular-nums font-semibold text-indigo-600 dark:text-indigo-400">
                          {selectedTestTopics.length}/{allActiveTopics.length}{' '}
                          {lang === 'hi' ? 'चयनित' : 'selected'}
                        </span>
                      </div>

                      {renderFilterPillNav(true)}

                      {filteredTopics.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                          {topicFilter === 'selected'
                            ? lang === 'hi'
                              ? 'अभी कोई विषय चयनित नहीं है। विषय जोड़ने के लिए "सभी" चुनें।'
                              : 'No topics selected yet. Switch to All or a skill pill to pick topics.'
                            : lang === 'hi'
                              ? 'खोज से मेल खाने वाला कोई विषय नहीं मिला।'
                              : 'No matching topics found.'}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                          {filteredTopics.map((tp) => renderTopicTile(tp, true))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {testType === 'full_length' && (
                    <motion.div
                      key="fmt-full"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="space-y-4"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          {lang === 'hi' ? 'पूर्ण-लंबाई परीक्षा प्रारूप' : 'Full-Length Exam Templates'}
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                          {allActiveTopics.length} topics
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setTestQuestionCount(50);
                            setTestTimeMin(45);
                            setMarksPerQ(2);
                            setNegativeMarking(0.5);
                          }}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            testQuestionCount === 50 && testTimeMin === 45
                              ? 'border-indigo-600 bg-indigo-50/75 dark:bg-indigo-950/40 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              Tier-1 Standard Mock
                            </span>
                            <span className="font-mono tabular-nums text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              50 Qs · 45m
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            54s/Q pace · Balanced arithmetic &amp; speed math simulation
                          </p>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTestQuestionCount(100);
                            setTestTimeMin(60);
                            setMarksPerQ(2);
                            setNegativeMarking(0.5);
                          }}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            testQuestionCount === 100 && testTimeMin === 60
                              ? 'border-indigo-600 bg-indigo-50/75 dark:bg-indigo-950/40 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              Marathon Endurance
                            </span>
                            <span className="font-mono tabular-nums text-xs font-bold text-indigo-600 dark:text-indigo-400">
                              100 Qs · 60m
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            36s/Q sprint · High-volume speed &amp; stamina benchmark
                          </p>
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {lang === 'hi' ? 'शामिल सभी विषय:' : 'Included Syllabus Topics:'}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
                          {allActiveTopics.map((tp) => {
                            const st = getTopicStyle(tp.id);
                            return (
                              <div
                                key={tp.id}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 min-w-0"
                              >
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${st.iconBg}`}>
                                  <TopicMathSymbol topicId={tp.id} size="xs" />
                                </span>
                                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                                  {lang === 'hi' ? st.shortLabelHi : st.shortLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {testType === 'difficulty' && (
                    <motion.div
                      key="fmt-diff"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.14 }}
                      className="space-y-4"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Flame className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          {lang === 'hi' ? 'कठिनाई स्तर चुनें' : 'Select Difficulty Tier'}
                        </h2>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {lang === 'hi' ? 'सभी विषय शामिल' : 'Across all topics'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {(
                          [
                            {
                              id: 'easy',
                              title: lang === 'hi' ? 'सरल (Easy)' : 'Easy Tier',
                              desc: 'Warm-up speed & core recall',
                              accent: 'text-emerald-600 dark:text-emerald-400',
                            },
                            {
                              id: 'medium',
                              title: lang === 'hi' ? 'मध्यम (Medium)' : 'Medium Tier',
                              desc: 'Standard exam level',
                              accent: 'text-indigo-600 dark:text-indigo-400',
                            },
                            {
                              id: 'hard',
                              title: lang === 'hi' ? 'कठिन (Hard)' : 'Hard Tier',
                              desc: 'High-pressure multi-step',
                              accent: 'text-amber-600 dark:text-amber-400',
                            },
                          ] as const
                        ).map((tier) => {
                          const selected = testDifficulty === tier.id;
                          return (
                            <button
                              key={tier.id}
                              type="button"
                              onClick={() => setTestDifficulty(tier.id)}
                              className={`p-3.5 rounded-xl border text-left transition-all ${
                                selected
                                  ? 'border-indigo-600 bg-indigo-50/75 dark:bg-indigo-950/40 shadow-xs'
                                  : 'border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                              }`}
                            >
                              <div className={`text-sm font-bold ${selected ? tier.accent : 'text-slate-900 dark:text-white'}`}>
                                {tier.title}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {tier.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                          {lang === 'hi' ? 'शामिल विषय:' : 'Covered:'}
                        </span>
                        {allActiveTopics.map((tp) => {
                          const st = getTopicStyle(tp.id);
                          return (
                            <span
                              key={tp.id}
                              title={lang === 'hi' ? tp.nameHi : tp.name}
                              className={`w-6 h-6 rounded-md flex items-center justify-center ${st.iconBg}`}
                            >
                              <TopicMathSymbol topicId={tp.id} size="xs" />
                            </span>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Step 2: Structured 'Advanced Settings' Configuration Area */}
                <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800">
                  <button
                    type="button"
                    aria-expanded={showAdvanced}
                    onClick={() => setShowAdvanced((v) => !v)}
                    className="w-full flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 rounded-xl bg-slate-50/85 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors text-left"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
                      <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        {t(lang, 'advancedSettings')}
                      </span>
                      <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                        {safeQuestionCount} Qs · {safeTimeMin}m · {markingDisplay} ·{' '}
                        <span className="capitalize">{testDifficulty}</span>
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 whitespace-nowrap shrink-0">
                      {showAdvanced
                        ? lang === 'hi'
                          ? 'बंद करें'
                          : 'Hide'
                        : lang === 'hi'
                          ? 'कस्टमाइज़ करें'
                          : 'Customize'}
                      {showAdvanced ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-4 pt-1 space-y-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {lang === 'hi'
                            ? 'प्रश्नों की संख्या, समय, अंकन नियम और कठिनाई स्तर समायोजित करें।'
                            : 'Fine-tune question volume, exam duration, marking rules, and difficulty.'}
                        </p>
                        <button
                          type="button"
                          onClick={resetParameterDefaults}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 whitespace-nowrap shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {lang === 'hi' ? 'डिफ़ॉल्ट रीसेट' : 'Reset'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* 1. Questions */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {t(lang, 'questionCount')}
                            </span>
                            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1 py-0.5">
                              <button
                                type="button"
                                aria-label="Decrease questions"
                                onClick={() => setTestQuestionCount((v) => Math.max(5, v - 5))}
                                className="p-1 text-slate-500 hover:text-indigo-600"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono tabular-nums font-bold px-1.5 min-w-[32px] text-center">
                                {safeQuestionCount}
                              </span>
                              <button
                                type="button"
                                aria-label="Increase questions"
                                onClick={() => setTestQuestionCount((v) => Math.min(100, v + 5))}
                                className="p-1 text-slate-500 hover:text-indigo-600"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-5 gap-1.5">
                            {QUESTION_PRESETS.map((cnt) => (
                              <button
                                key={cnt}
                                type="button"
                                onClick={() => setTestQuestionCount(cnt)}
                                className={`py-1.5 rounded-lg text-xs font-mono tabular-nums font-semibold border transition-colors ${
                                  safeQuestionCount === cnt
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                                }`}
                              >
                                {cnt}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 2. Duration */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                              {lang === 'hi' ? 'समय सीमा (मिनट)' : 'Duration (min)'}
                            </span>
                            <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-1 py-0.5">
                              <button
                                type="button"
                                aria-label="Decrease duration"
                                onClick={() => setTestTimeMin((v) => Math.max(1, v - 5))}
                                className="p-1 text-slate-500 hover:text-indigo-600"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-mono tabular-nums font-bold px-1.5 min-w-[36px] text-center">
                                {safeTimeMin}m
                              </span>
                              <button
                                type="button"
                                aria-label="Increase duration"
                                onClick={() => setTestTimeMin((v) => Math.min(180, v + 5))}
                                className="p-1 text-slate-500 hover:text-indigo-600"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-6 gap-1.5">
                            {DURATION_PRESETS.map((mins) => (
                              <button
                                key={mins}
                                type="button"
                                onClick={() => setTestTimeMin(mins)}
                                className={`py-1.5 rounded-lg text-xs font-mono tabular-nums font-semibold border transition-colors ${
                                  safeTimeMin === mins
                                    ? 'border-indigo-600 bg-indigo-600 text-white'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                                }`}
                              >
                                {mins}m
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 3. Marking Rules */}
                        <div className="space-y-2">
                          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {lang === 'hi' ? 'अंकन नियम (सही / गलत)' : 'Marking Rules (Correct / Negative)'}
                          </span>
                          <div className="grid grid-cols-4 gap-1.5">
                            {MARKING_PRESETS.map((preset) => {
                              const active = marksPerQ === preset.marks && negativeMarking === preset.neg;
                              return (
                                <button
                                  key={preset.id}
                                  type="button"
                                  onClick={() => {
                                    setMarksPerQ(preset.marks);
                                    setNegativeMarking(preset.neg);
                                  }}
                                  className={`px-1.5 py-2 rounded-lg border text-center transition-colors ${
                                    active
                                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200 font-bold'
                                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                                  }`}
                                >
                                  <div className="text-[11px] font-mono tabular-nums leading-tight">
                                    {preset.label}
                                  </div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                                    {lang === 'hi' ? preset.tagHi : preset.tag}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 4. Difficulty */}
                        <div className="space-y-2">
                          <span className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                            {t(lang, 'difficulty')}
                          </span>
                          <div
                            className={`grid gap-1.5 ${
                              testType === 'difficulty' ? 'grid-cols-3' : 'grid-cols-4'
                            }`}
                          >
                            {(
                              [
                                { id: 'mixed', label: t(lang, 'mixed') },
                                { id: 'easy', label: t(lang, 'easy') },
                                { id: 'medium', label: t(lang, 'medium') },
                                { id: 'hard', label: t(lang, 'hard') },
                              ] as const
                            )
                              .filter((d) => !(testType === 'difficulty' && d.id === 'mixed'))
                              .map((d) => {
                                const active = testDifficulty === d.id;
                                return (
                                  <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setTestDifficulty(d.id)}
                                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-colors ${
                                      active
                                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 hover:border-indigo-300'
                                    }`}
                                  >
                                    {d.label}
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Sticky Zone: Redesigned Test Summary Card */}
              <aside className="lg:col-span-4 lg:sticky lg:top-20">
                <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 shadow-sm">
                  {/* Slate-Indigo Pass Header with Mathematical Topic Symbols */}
                  <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-5 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-200">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                        {lang === 'hi' ? 'परीक्षा सारांश' : 'Test Summary'}
                      </span>
                      <span className="text-[11px] font-mono text-indigo-200/90">
                        {lang === 'hi' ? activeFormatMeta.titleHi : activeFormatMeta.title}
                      </span>
                    </div>

                    {renderSummaryTopicShowcase()}

                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/10 font-mono tabular-nums">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-indigo-200/75">
                          {lang === 'hi' ? 'प्रश्न' : 'Questions'}
                        </div>
                        <div className="text-base font-bold mt-0.5">{safeQuestionCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-indigo-200/75">
                          {lang === 'hi' ? 'समय' : 'Duration'}
                        </div>
                        <div className="text-base font-bold mt-0.5">{safeTimeMin}m</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-indigo-200/75">
                          {lang === 'hi' ? 'अधिकतम अंक' : 'Max Marks'}
                        </div>
                        <div className="text-base font-bold mt-0.5">{maxScore}</div>
                      </div>
                    </div>
                  </div>

                  {/* Pass Specification Body */}
                  <div className="p-5 space-y-4">
                    <dl className="space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">
                          {lang === 'hi' ? 'लक्षित गति' : 'Target Pace'}
                        </dt>
                        <dd className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          {secPerQuestion}s / Q
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">
                          {lang === 'hi' ? 'अंकन योजना' : 'Marking Rule'}
                        </dt>
                        <dd className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                          +{marksPerQ} correct · -{negativeMarking} wrong
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <dt className="text-slate-500 dark:text-slate-400">
                          {t(lang, 'difficulty')}
                        </dt>
                        <dd className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                          {testDifficulty}
                        </dd>
                      </div>
                    </dl>

                    <button
                      type="button"
                      disabled={!canLaunchTest}
                      onClick={handleStartTest}
                      className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-45 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>{t(lang, 'startTest')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="text-[11px] text-center text-slate-500 dark:text-slate-400">
                      {lang === 'hi'
                        ? 'समय समाप्त होने पर स्वतः सबमिट · तुरंत विश्लेषण'
                        : 'Auto-submits on timeout · Instant scorecard'}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
