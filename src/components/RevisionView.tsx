import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Calculator,
  Lightbulb,
  Play,
  Sparkles,
  Table2,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { REVISION_GUIDES, type TableRangeSpec } from '../data/revisionData';
import { t } from '../i18n/translations';
import type { SessionLaunchConfig } from '../types/math';
import { getTopicStyle } from '../utils/topicTheme';
import { FormulaCard, TopicIconGlyph } from './DesignSystem';

interface RevisionViewProps {
  onStartRevisionQuiz: (config: SessionLaunchConfig) => void;
  onOpenTopicPracticeSetup?: (topicId: string) => void;
}

const BOOKMARKS_STORAGE_KEY = 'sankhyaprep_formula_bookmarks_v1';

type RevisionRoute =
  | { view: 'home' }
  | { view: 'bookmarks' }
  | { view: 'category'; topicId: string }
  | { view: 'section'; topicId: string; sectionKind: 'block' | 'formulas' | 'examples' | 'table_range'; blockId?: string };

export const RevisionView: React.FC<RevisionViewProps> = ({
  onStartRevisionQuiz,
  onOpenTopicPracticeSetup,
}) => {
  const { settings } = usePlatform();
  const lang = settings.language;

  const [route, setRoute] = useState<RevisionRoute>({ view: 'home' });
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarkedIds));
    } catch {
      // Ignore storage failures
    }
  }, [bookmarkedIds]);

  const toggleBookmark = (formulaId: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(formulaId) ? prev.filter((id) => id !== formulaId) : [...prev, formulaId]
    );
  };

  const allBookmarkedFormulas = useMemo(() => {
    const out: Array<{ guideTitle: string; accent: string; formula: (typeof REVISION_GUIDES)[0]['formulas'][0] }> = [];
    for (const g of REVISION_GUIDES) {
      for (const f of g.formulas) {
        if (bookmarkedIds.includes(f.id)) {
          out.push({
            guideTitle: lang === 'hi' ? g.titleHi : g.title,
            accent: g.formulaAccent,
            formula: f,
          });
        }
      }
    }
    return out;
  }, [bookmarkedIds, lang]);

  // --- LEVEL 1: REVISION HOME (Category Grid Only) ---
  if (route.view === 'home') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lang === 'hi' ? 'पुनरावृत्ति विषय' : 'Revision'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">
              {lang === 'hi'
                ? 'मान, शॉर्टकट ट्रिक्स, पहाड़े और सूत्र देखने के लिए कोई भी विषय चुनें।'
                : 'Choose a mathematics category to study key values, tables, formulas, tricks, and solved examples.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setRoute({ view: 'bookmarks' })}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl border bg-white dark:bg-[#11192E] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-amber-400 transition-colors whitespace-nowrap"
          >
            <Bookmark className="w-4 h-4 text-amber-500" />
            {lang === 'hi' ? 'सहेजे गए सूत्र' : 'Saved Formulas'} ({bookmarkedIds.length})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REVISION_GUIDES.map((guide) => {
            const st = getTopicStyle(guide.topicId);
            const itemTotal =
              guide.sections.length +
              guide.formulas.length +
              (guide.tableRanges?.length ?? 0) +
              (guide.practiceExamples.length > 0 ? 1 : 0);

            return (
              <button
                key={guide.topicId}
                type="button"
                onClick={() => setRoute({ view: 'category', topicId: guide.topicId })}
                className="text-left p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm shadow-slate-200/50 dark:shadow-none transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${st.iconBg}`}>
                    <TopicIconGlyph name={st.iconName} className="w-6 h-6" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                </div>

                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {lang === 'hi' ? guide.titleHi : guide.title}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                    {lang === 'hi' ? guide.shortDescHi : guide.shortDesc}
                  </p>
                </div>

                <div className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                  {itemTotal} {lang === 'hi' ? 'अध्ययन अनुभाग' : 'revision sections'} · {guide.formulas.length}{' '}
                  {lang === 'hi' ? 'सूत्र' : 'formulas'}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // --- BOOKMARKS SUB-SCREEN ---
  if (route.view === 'bookmarks') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setRoute({ view: 'home' })}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-indigo-400"
          >
            <ArrowLeft className="w-4 h-4" />
            {t(lang, 'back')}
          </button>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {lang === 'hi' ? 'सहेजे गए सूत्र' : 'Saved Formulas'} ({allBookmarkedFormulas.length})
          </h1>
          <div className="w-16" />
        </div>

        {allBookmarkedFormulas.length === 0 ? (
          <div className="p-10 bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
            <Bookmark className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {lang === 'hi'
                ? 'अभी कोई सूत्र सहेजा नहीं गया है। किसी भी सूत्र कार्ड पर बुकमार्क आइकन दबाएं।'
                : 'No formulas bookmarked yet. Tap the bookmark icon on any formula card to save it for quick review.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {allBookmarkedFormulas.map(({ guideTitle, accent, formula }) => (
              <div key={formula.id} className="space-y-1.5">
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400 px-1">{guideTitle}</div>
                <FormulaCard
                  id={formula.id}
                  title={lang === 'hi' ? formula.titleHi : formula.title}
                  formula={formula.formula}
                  explanation={lang === 'hi' ? formula.explanationHi : formula.explanation}
                  example={formula.example}
                  accentClass={accent}
                  isBookmarked={true}
                  onToggleBookmark={toggleBookmark}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const activeGuide = REVISION_GUIDES.find((g) => g.topicId === route.topicId) ?? REVISION_GUIDES[0];
  const style = getTopicStyle(activeGuide.topicId);

  // --- LEVEL 2: DEDICATED CATEGORY REVISION SCREEN ---
  if (route.view === 'category') {
    const isSquareRoots = activeGuide.topicId === 'square_roots';
    const exampleStepTitle = isSquareRoots
      ? lang === 'hi'
        ? '6. हल किए गए उदाहरण'
        : '6. Solved Examples'
      : lang === 'hi'
        ? 'हल किए गए उदाहरण'
        : 'Solved Examples';
    const formulaStepTitle = isSquareRoots
      ? lang === 'hi'
        ? '4. महत्वपूर्ण सूत्र'
        : '4. Important Formulas'
      : lang === 'hi'
        ? 'महत्वपूर्ण सूत्र'
        : 'Important Formulas';
    const practiceStepTitle = isSquareRoots
      ? lang === 'hi'
        ? '7. अभ्यास प्रश्न'
        : '7. Practice Questions'
      : lang === 'hi'
        ? 'अभ्यास प्रश्न'
        : 'Practice Questions';

    // Build ordered navigation list matching Square Roots' explicit numbering or general ordering
    type NavCard = {
      key: string;
      title: string;
      subtitle: string;
      badge: string;
      onClick: () => void;
    };

    const navCards: NavCard[] = [];

    if (activeGuide.tableRanges) {
      for (const tr of activeGuide.tableRanges) {
        navCards.push({
          key: tr.id,
          title: lang === 'hi' ? tr.labelHi : tr.label,
          subtitle: lang === 'hi' ? tr.descriptionHi : tr.description,
          badge: `${tr.end - tr.start + 1} tables`,
          onClick: () =>
            setRoute({
              view: 'section',
              topicId: activeGuide.topicId,
              sectionKind: 'table_range',
              blockId: tr.id,
            }),
        });
      }
    }

    // For Square Roots, interleave Formulas as #4 before Shortcut Tricks (#5)
    for (const blk of activeGuide.sections) {
      if (isSquareRoots && blk.id === 'sr_tricks') {
        navCards.push({
          key: 'formulas',
          title: formulaStepTitle,
          subtitle: lang === 'hi' ? 'मुख्य सूत्र, उदाहरण व बुकमार्क विकल्प' : 'Key identities with worked examples and bookmarks',
          badge: `${activeGuide.formulas.length} formulas`,
          onClick: () => setRoute({ view: 'section', topicId: activeGuide.topicId, sectionKind: 'formulas' }),
        });
      }
      navCards.push({
        key: blk.id,
        title: lang === 'hi' ? blk.titleHi : blk.title,
        subtitle: lang === 'hi' ? blk.subtitleHi : blk.subtitle,
        badge: `${blk.items.length} items`,
        onClick: () =>
          setRoute({ view: 'section', topicId: activeGuide.topicId, sectionKind: 'block', blockId: blk.id }),
      });
    }

    if (!isSquareRoots && activeGuide.formulas.length > 0) {
      navCards.push({
        key: 'formulas',
        title: formulaStepTitle,
        subtitle: lang === 'hi' ? 'मुख्य सूत्र, उदाहरण व बुकमार्क विकल्प' : 'Key identities with worked examples and bookmarks',
        badge: `${activeGuide.formulas.length} formulas`,
        onClick: () => setRoute({ view: 'section', topicId: activeGuide.topicId, sectionKind: 'formulas' }),
      });
    }

    if (activeGuide.practiceExamples.length > 0) {
      navCards.push({
        key: 'examples',
        title: exampleStepTitle,
        subtitle: lang === 'hi' ? 'चरण-दर-चरण हल सहित अभ्यास उदाहरण' : 'Step-by-step solved numerical examples',
        badge: `${activeGuide.practiceExamples.length} examples`,
        onClick: () => setRoute({ view: 'section', topicId: activeGuide.topicId, sectionKind: 'examples' }),
      });
    }

    navCards.push({
      key: 'practice',
      title: practiceStepTitle,
      subtitle: lang === 'hi' ? 'इस विषय का अभ्यास सेटअप खोलें' : 'Configure range, difficulty and start practice',
      badge: 'Interactive',
      onClick: () => {
        if (onOpenTopicPracticeSetup) {
          onOpenTopicPracticeSetup(activeGuide.topicId);
        } else {
          onStartRevisionQuiz({
            mode: 'quick_recall',
            topicId: activeGuide.topicId,
            topicName: `${lang === 'hi' ? activeGuide.titleHi : activeGuide.title} Practice`,
            difficulty: 'medium',
            questionCount: 10,
            timed: false,
            timeLimitSec: 300,
            questionTypeFilter: 'all',
            orderMode: 'random',
            instantFeedback: true,
          });
        }
      },
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setRoute({ view: 'home' })}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-indigo-400"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === 'hi' ? 'पुनरावृत्ति होम' : 'Back to Revision'}
          </button>

          <button
            type="button"
            onClick={() =>
              onStartRevisionQuiz({
                mode: 'quick_recall',
                topicId: activeGuide.topicId,
                topicName: `${lang === 'hi' ? activeGuide.titleHi : activeGuide.title} Quiz`,
                difficulty: 'medium',
                questionCount: 10,
                timed: true,
                timeLimitSec: 180,
                questionTypeFilter: 'all',
                orderMode: 'random',
                instantFeedback: true,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-indigo-700 whitespace-nowrap"
          >
            <Play className="w-4 h-4 fill-white" />
            {lang === 'hi' ? 'त्वरित परीक्षण (10 प्रश्न)' : 'Quick Test (10 Qs)'}
          </button>
        </div>

        {/* Dedicated Category Hero */}
        <div className={`rounded-2xl p-6 text-white bg-gradient-to-r ${activeGuide.accentGradient} shadow-lg shadow-indigo-500/10`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <TopicIconGlyph name={style.iconName} className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xs font-medium text-white/85 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                {lang === 'hi' ? 'पुनरावृत्ति अनुभाग' : 'Revision Category'}
              </div>
              <h1 className="text-2xl font-bold mt-0.5">
                {lang === 'hi' ? `${activeGuide.titleHi} पुनरावृत्ति` : `${activeGuide.title} Revision`}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 mt-1">
                {lang === 'hi' ? activeGuide.taglineHi : activeGuide.tagline}
              </p>
            </div>
          </div>
        </div>

        {/* Category Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {navCards.map((card) => (
            <button
              key={card.key}
              type="button"
              onClick={card.onClick}
              className="text-left p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-sm shadow-slate-200/50 dark:shadow-none transition-all flex items-center justify-between gap-4 group"
            >
              <div className="space-y-1 min-w-0">
                <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">{card.badge}</div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {card.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{card.subtitle}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // --- LEVEL 3: DEDICATED SECTION / TABLE RANGE CONTENT SCREEN ---
  const backToCategoryButton = (
    <button
      type="button"
      onClick={() => setRoute({ view: 'category', topicId: activeGuide.topicId })}
      className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-indigo-400"
    >
      <ArrowLeft className="w-4 h-4" />
      {lang === 'hi' ? `${activeGuide.titleHi} पर वापस` : `Back to ${activeGuide.title}`}
    </button>
  );

  // 3A. Multiplication Tables Range View (e.g., Tables 11–20)
  if (route.sectionKind === 'table_range') {
    const range: TableRangeSpec =
      activeGuide.tableRanges?.find((tr) => tr.id === route.blockId) ??
      activeGuide.tableRanges?.[0] ?? {
        id: 'tbl_1_10',
        label: 'Tables 1–10',
        labelHi: 'पहाड़े 1–10',
        description: '',
        descriptionHi: '',
        start: 1,
        end: 10,
      };
    const numbers = Array.from({ length: range.end - range.start + 1 }, (_, i) => range.start + i);

    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backToCategoryButton}
          <button
            type="button"
            onClick={() =>
              onStartRevisionQuiz({
                mode: 'quick_recall',
                topicId: 'tables',
                topicName: lang === 'hi' ? range.labelHi : range.label,
                difficulty: 'medium',
                questionCount: 10,
                timed: false,
                timeLimitSec: 300,
                questionTypeFilter: 'all',
                orderMode: 'random',
                instantFeedback: true,
                customMin: range.start,
                customMax: range.end,
              })
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-indigo-700"
          >
            <Play className="w-4 h-4 fill-white" />
            {lang === 'hi' ? 'इस श्रेणी का अभ्यास करें' : `Practice ${range.label}`}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.iconBg}`}>
            <Table2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lang === 'hi' ? range.labelHi : range.label}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'hi' ? range.descriptionHi : range.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {numbers.map((num) => (
            <div
              key={num}
              className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 shadow-sm shadow-slate-200/50 dark:shadow-none"
            >
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800 font-mono">
                Table of {num}
              </div>
              <div className="space-y-1 text-xs font-mono tabular-nums text-slate-700 dark:text-slate-200">
                {Array.from({ length: 10 }, (_, k) => k + 1).map((m) => (
                  <div key={m} className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">
                      {num} × {m}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white">{num * m}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3B. Dedicated Formulas Screen
  if (route.sectionKind === 'formulas') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backToCategoryButton}
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.iconBg}`}>
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lang === 'hi' ? `${activeGuide.titleHi} — महत्वपूर्ण सूत्र` : `${activeGuide.title} — Important Formulas`}
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {lang === 'hi'
                ? 'सूत्र कॉपी करें या बाद में पढ़ने के लिए बुकमार्क करें।'
                : 'Copy any formula or bookmark it to review later.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeGuide.formulas.map((f) => (
            <FormulaCard
              key={f.id}
              id={f.id}
              title={lang === 'hi' ? f.titleHi : f.title}
              formula={f.formula}
              explanation={lang === 'hi' ? f.explanationHi : f.explanation}
              example={f.example}
              accentClass={activeGuide.formulaAccent}
              isBookmarked={bookmarkedIds.includes(f.id)}
              onToggleBookmark={toggleBookmark}
            />
          ))}
        </div>
      </div>
    );
  }

  // 3C. Dedicated Solved Examples Screen
  if (route.sectionKind === 'examples') {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {backToCategoryButton}
          <button
            type="button"
            onClick={() =>
              onOpenTopicPracticeSetup
                ? onOpenTopicPracticeSetup(activeGuide.topicId)
                : onStartRevisionQuiz({
                    mode: 'quick_recall',
                    topicId: activeGuide.topicId,
                    topicName: `${activeGuide.title} Practice`,
                    difficulty: 'medium',
                    questionCount: 10,
                    timed: false,
                    timeLimitSec: 300,
                    questionTypeFilter: 'all',
                    orderMode: 'random',
                    instantFeedback: true,
                  })
            }
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs sm:text-sm font-semibold rounded-xl hover:bg-indigo-700"
          >
            <Calculator className="w-4 h-4" />
            {t(lang, 'startPractice')}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.iconBg}`}>
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {lang === 'hi' ? `${activeGuide.titleHi} — हल किए गए उदाहरण` : `${activeGuide.title} — Solved Examples`}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeGuide.practiceExamples.map((ex, i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-3"
            >
              <div className="text-base font-bold font-mono text-slate-900 dark:text-white">{ex.question}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{ex.steps}</div>
              <div className="inline-flex items-center gap-1.5 text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400 pt-1">
                <CheckCircle2 className="w-4 h-4" />
                Answer: {ex.answer}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3D. Dedicated Section Content Block (e.g., Important Square Roots, Square Root Values, Simplification, Shortcut Tricks)
  const activeBlock =
    activeGuide.sections.find((b) => b.id === route.blockId) ?? activeGuide.sections[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {backToCategoryButton}
      </div>

      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${style.iconBg}`}>
          <TopicIconGlyph name={style.iconName} className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {lang === 'hi' ? activeBlock.titleHi : activeBlock.title}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {lang === 'hi' ? activeBlock.subtitleHi : activeBlock.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeBlock.items.map((item, idx) => (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-2"
          >
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.label}</div>
            <div className={`text-lg font-mono font-bold tabular-nums ${style.accentText}`}>{item.value}</div>
            {item.note && <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{item.note}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};
