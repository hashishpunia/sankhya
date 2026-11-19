import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  ChevronRight,
  ClipboardCheck,
  Zap,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { t } from '../i18n/translations';
import type { SessionLaunchConfig, Topic } from '../types/math';
import { getTopicStyle } from '../utils/topicTheme';
import { TopicMathSymbol } from './DesignSystem';
import { TopicPracticeSetup } from './TopicPracticeSetup';

export interface PracticePreselection {
  topicId?: string;
  subMode?: 'topics' | 'test';
  testCategory?: 'anytime' | 'events';
  filter?: 'all' | 'cat_quick_recall' | 'cat_basics';
  nonce: number;
}

interface PracticeAndTestViewProps {
  onStartSession: (config: SessionLaunchConfig) => void;
  onOpenMockTests?: () => void;
  preselection?: PracticePreselection | null;
}

export const PracticeAndTestView: React.FC<PracticeAndTestViewProps> = ({
  onStartSession,
  onOpenMockTests,
  preselection,
}) => {
  const { topics, settings } = usePlatform();
  const lang = settings.language;

  const allActiveTopics = useMemo(() => topics.filter((tp) => tp.active), [topics]);
  const speedTopics = useMemo(
    () => allActiveTopics.filter((tp) => tp.categoryId === 'cat_quick_recall'),
    [allActiveTopics]
  );
  const basicsTopics = useMemo(
    () => allActiveTopics.filter((tp) => tp.categoryId === 'cat_basics'),
    [allActiveTopics]
  );

  const [topicFilter, setTopicFilter] = useState<'all' | 'cat_quick_recall' | 'cat_basics'>(
    preselection?.filter ?? 'all'
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(() => {
    if (preselection?.topicId && allActiveTopics.some((tp) => tp.id === preselection.topicId)) {
      return preselection.topicId;
    }
    return null;
  });

  useEffect(() => {
    if (!preselection) return;
    if (preselection.filter) {
      setTopicFilter(preselection.filter);
    }
    if (preselection.topicId && allActiveTopics.some((tp) => tp.id === preselection.topicId)) {
      setSelectedTopicId(preselection.topicId);
    } else {
      setSelectedTopicId(null);
    }
  }, [preselection, allActiveTopics]);

  const activeTopic = selectedTopicId
    ? allActiveTopics.find((tp) => tp.id === selectedTopicId) ?? null
    : null;

  if (activeTopic) {
    return (
      <TopicPracticeSetup
        topic={activeTopic}
        mode={activeTopic.categoryId === 'cat_basics' ? 'basics' : 'quick_recall'}
        backLabel={t(lang, 'back')}
        onBack={() => setSelectedTopicId(null)}
        onStartSession={onStartSession}
      />
    );
  }

  const renderTopicGrid = (list: Topic[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((tp) => {
        const st = getTopicStyle(tp.id);

        return (
          <button
            key={tp.id}
            type="button"
            onClick={() => setSelectedTopicId(tp.id)}
            className="text-left p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-0.5 group flex flex-col justify-between gap-4"
          >
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${st.iconBg}`}>
                <TopicMathSymbol topicId={tp.id} size="lg" />
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {lang === 'hi' ? tp.nameHi : tp.name}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {lang === 'hi' ? tp.descriptionHi : tp.description}
              </p>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <span>{t(lang, 'startPractice')}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {lang === 'hi' ? 'अभ्यास विषय' : 'Practice Topics'}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
            {lang === 'hi'
              ? 'कोई भी विषय चुनें, अपनी सीमा और कठिनाई सेट करें, और तुरंत अभ्यास शुरू करें।'
              : 'Pick any topic below to customize number range, difficulty, and drill length.'}
          </p>
        </div>

        {onOpenMockTests && (
          <button
            type="button"
            onClick={onOpenMockTests}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl border border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/70 dark:bg-indigo-950/35 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400 transition-colors whitespace-nowrap"
          >
            <ClipboardCheck className="w-4 h-4" />
            {t(lang, 'navMockTests')}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              {
                id: 'all',
                label: lang === 'hi' ? `सभी विषय (${allActiveTopics.length})` : `All Topics (${allActiveTopics.length})`,
              },
              {
                id: 'cat_quick_recall',
                label: lang === 'hi' ? `त्वरित व स्मृति (${speedTopics.length})` : `Speed & Memory (${speedTopics.length})`,
              },
              {
                id: 'cat_basics',
                label: lang === 'hi' ? `मूल अंकगणित (${basicsTopics.length})` : `Arithmetic Basics (${basicsTopics.length})`,
              },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setTopicFilter(f.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                topicFilter === f.id
                  ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#11192E] text-slate-600 dark:text-slate-300 hover:border-indigo-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {(topicFilter === 'all' || topicFilter === 'cat_quick_recall') && speedTopics.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {lang === 'hi' ? 'त्वरित गणना और स्मृति विषय' : 'Speed & Mental Math'}
            </div>
            {renderTopicGrid(speedTopics)}
          </section>
        )}

        {(topicFilter === 'all' || topicFilter === 'cat_basics') && basicsTopics.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Calculator className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {lang === 'hi' ? 'मूलभूत अंकगणित व गणना' : 'Arithmetic Basics'}
            </div>
            {renderTopicGrid(basicsTopics)}
          </section>
        )}
      </div>
    </div>
  );
};
