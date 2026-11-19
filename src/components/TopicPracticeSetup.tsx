import React, { useState } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Play, SlidersHorizontal } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { t } from '../i18n/translations';
import type { Difficulty, PracticeMode, QuestionType, SessionLaunchConfig, Topic } from '../types/math';
import { getTopicStyle } from '../utils/topicTheme';
import { TopicMathSymbol } from './DesignSystem';

interface TopicPracticeSetupProps {
  topic: Topic;
  mode: PracticeMode;
  backLabel: string;
  onBack: () => void;
  onStartSession: (config: SessionLaunchConfig) => void;
}

type TableRangePreset = '1-10' | '11-20' | '21-30' | '31-50' | '51-100' | 'custom';
type SquareRangePreset = '1-20' | '1-30' | '1-50' | '1-100' | 'custom';
type CubeRangePreset = '1-10' | '1-20' | '1-30' | 'custom';

export const TopicPracticeSetup: React.FC<TopicPracticeSetupProps> = ({
  topic,
  mode,
  backLabel,
  onBack,
  onStartSession,
}) => {
  const { generatorConfigs, settings } = usePlatform();
  const lang = settings.language;
  const st = getTopicStyle(topic.id);
  const syncedCfg = generatorConfigs.find((g) => g.topicKey === topic.id);

  // Sensible beginner-friendly defaults
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCountChoice, setQuestionCountChoice] = useState<10 | 20 | 30 | 'unlimited'>(10);
  const [orderMode, setOrderMode] = useState<'random' | 'sequential'>('random');

  // Module-specific simple selections
  const [tablePreset, setTablePreset] = useState<TableRangePreset>('1-10');
  const [customTablesText, setCustomTablesText] = useState<string>('12, 13, 14, 17, 19');

  const [squarePreset, setSquarePreset] = useState<SquareRangePreset>('1-30');
  const [cubePreset, setCubePreset] = useState<CubeRangePreset>('1-20');
  const [customMin, setCustomMin] = useState<string>('1');
  const [customMax, setCustomMax] = useState<string>(
    topic.id === 'cubes' || topic.id === 'cube_roots' ? '30' : '50'
  );

  const [percentageType, setPercentageType] = useState<'all' | 'basic' | 'reverse' | 'successive'>('all');
  const [fractionOperation, setFractionOperation] = useState<
    'all' | 'addition' | 'multiplication' | 'comparison' | 'to_percent'
  >('all');
  const [digitRange, setDigitRange] = useState<2 | 3 | 4 | 5>(topic.id === 'di_addition' ? 4 : 3);
  const [diTerms, setDiTerms] = useState<number>(syncedCfg?.termCount ?? 3);
  const [divisionMode, setDivisionMode] = useState<'mixed' | 'exact' | 'remainder'>('mixed');
  const [multiplicationFocus, setMultiplicationFocus] = useState<'all' | 'shortcuts' | 'tables'>('all');
  const [trigFocus, setTrigFocus] = useState<'all' | 'values'>('all');

  // Collapsed Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [timed, setTimed] = useState<boolean>(false);
  const [timeLimitMin, setTimeLimitMin] = useState<number>(5);
  const [questionTypeFilter, setQuestionTypeFilter] = useState<QuestionType | 'all'>('all');
  const [instantFeedback, setInstantFeedback] = useState<boolean>(true);

  const isRangeModule = ['squares', 'cubes', 'square_roots', 'cube_roots'].includes(topic.id);
  const isTablesOrMultTables =
    topic.id === 'tables' || (topic.id === 'multiplication' && multiplicationFocus === 'tables');
  const supportsSequence = isRangeModule || isTablesOrMultTables;

  const handleStart = () => {
    let minVal: number | undefined;
    let maxVal: number | undefined;
    let selectedTables: number[] | undefined;

    if (isTablesOrMultTables) {
      if (tablePreset === '1-10') {
        minVal = 1;
        maxVal = 10;
      } else if (tablePreset === '11-20') {
        minVal = 11;
        maxVal = 20;
      } else if (tablePreset === '21-30') {
        minVal = 21;
        maxVal = 30;
      } else if (tablePreset === '31-50') {
        minVal = 31;
        maxVal = 50;
      } else if (tablePreset === '51-100') {
        minVal = 51;
        maxVal = 100;
      } else {
        const parsed = customTablesText
          .split(',')
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n >= 1 && n <= 100);
        selectedTables = parsed.length > 0 ? parsed : [12, 13, 14, 15];
      }
    } else if (topic.id === 'squares' || topic.id === 'square_roots') {
      if (squarePreset === 'custom') {
        minVal = Math.max(1, Number(customMin) || 1);
        maxVal = Math.max(minVal, Number(customMax) || 50);
      } else {
        const [a, b] = squarePreset.split('-').map(Number);
        minVal = a;
        maxVal = b;
      }
    } else if (topic.id === 'cubes' || topic.id === 'cube_roots') {
      if (cubePreset === 'custom') {
        minVal = Math.max(1, Number(customMin) || 1);
        maxVal = Math.max(minVal, Number(customMax) || 30);
      } else {
        const [a, b] = cubePreset.split('-').map(Number);
        minVal = a;
        maxVal = b;
      }
    }

    onStartSession({
      mode,
      topicId: topic.id,
      topicName: lang === 'hi' ? topic.nameHi : topic.name,
      difficulty,
      questionCount: questionCountChoice === 'unlimited' ? 15 : questionCountChoice,
      unlimited: questionCountChoice === 'unlimited',
      timed,
      timeLimitSec: timed ? Math.max(1, timeLimitMin) * 60 : 0,
      questionTypeFilter,
      orderMode: supportsSequence ? orderMode : 'random',
      instantFeedback,
      customMin: minVal,
      customMax: maxVal,
      selectedTables,
      digitLength: ['addition', 'subtraction', 'di_addition'].includes(topic.id) ? digitRange : undefined,
      termCount: topic.id === 'di_addition' ? diTerms : undefined,
      percentageType: topic.id === 'percentages' ? percentageType : undefined,
      fractionOperation: topic.id === 'fractions' ? fractionOperation : undefined,
      divisionMode: topic.id === 'division' ? divisionMode : undefined,
      multiplicationFocus: topic.id === 'multiplication' ? multiplicationFocus : undefined,
      trigFocus: topic.id === 'trigonometry' ? trigFocus : undefined,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Back Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-xl hover:border-indigo-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {backLabel}
        </button>
      </div>

      {/* Topic Header Banner */}
      <div className={`rounded-2xl p-6 text-white bg-gradient-to-r ${st.gradient} shadow-lg shadow-indigo-500/15`}>
        <div className="flex items-center gap-4">
          <div className="w-13 h-13 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <TopicMathSymbol topicId={topic.id} size="lg" className="text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-white/85">{t(lang, 'whatToPractice')}</p>
            <h1 className="text-2xl font-bold mt-0.5">{lang === 'hi' ? topic.nameHi : topic.name}</h1>
            <p className="text-xs sm:text-sm text-white/90 mt-1">
              {lang === 'hi' ? topic.descriptionHi : topic.description}
            </p>
          </div>
        </div>
      </div>

      {/* Simple Setup Card */}
      <section className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-6">
        {/* Topic-Specific Primary Selection */}
        {topic.id === 'multiplication' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {lang === 'hi' ? 'अभ्यास का विषय चुनें' : 'Focus Area'}
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'all', label: lang === 'hi' ? 'सामान्य व शॉर्टकट' : 'Standard & Shortcuts' },
                  { id: 'shortcuts', label: lang === 'hi' ? 'स्पीड शॉर्टकट (×11, ×25, ×50)' : 'Speed Shortcuts (×11, ×25, ×50)' },
                  { id: 'tables', label: lang === 'hi' ? 'पहाड़े अभ्यास' : 'Tables Drill' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMultiplicationFocus(opt.id)}
                  className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all text-center ${
                    multiplicationFocus === opt.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {isTablesOrMultTables && (
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'selectTables')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(
                [
                  { id: '1-10', label: '1–10' },
                  { id: '11-20', label: '11–20' },
                  { id: '21-30', label: '21–30' },
                  { id: '31-50', label: '31–50' },
                  { id: '51-100', label: '51–100' },
                  { id: 'custom', label: lang === 'hi' ? 'कस्टम चयन' : 'Custom Selection' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTablePreset(item.id)}
                  className={`px-3.5 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    tablePreset === item.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {tablePreset === 'custom' && (
              <div className="pt-1">
                <input
                  type="text"
                  value={customTablesText}
                  onChange={(e) => setCustomTablesText(e.target.value)}
                  placeholder="e.g. 12, 13, 14, 17, 19"
                  className="w-full px-3.5 py-2.5 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            )}
          </div>
        )}

        {(topic.id === 'squares' || topic.id === 'square_roots') && (
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'selectRange')}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {(['1-20', '1-30', '1-50', '1-100', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSquarePreset(r)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    squarePreset === r
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {r === 'custom' ? (lang === 'hi' ? 'कस्टम' : 'Custom') : r}
                </button>
              ))}
            </div>
            {squarePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="Min (e.g. 1)"
                  className="px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={customMax}
                  onChange={(e) => setCustomMax(e.target.value)}
                  placeholder="Max (e.g. 50)"
                  className="px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            )}
          </div>
        )}

        {(topic.id === 'cubes' || topic.id === 'cube_roots') && (
          <div className="space-y-2.5">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'selectRange')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['1-10', '1-20', '1-30', 'custom'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCubePreset(r)}
                  className={`px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                    cubePreset === r
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {r === 'custom' ? (lang === 'hi' ? 'कस्टम' : 'Custom') : r}
                </button>
              ))}
            </div>
            {cubePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={customMin}
                  onChange={(e) => setCustomMin(e.target.value)}
                  placeholder="Min"
                  className="px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={customMax}
                  onChange={(e) => setCustomMax(e.target.value)}
                  placeholder="Max"
                  className="px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                />
              </div>
            )}
          </div>
        )}

        {topic.id === 'percentages' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'questionType')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'all', label: lang === 'hi' ? 'सभी प्रकार' : 'All Types' },
                  { id: 'basic', label: lang === 'hi' ? 'मान निकालें' : 'Find Value' },
                  { id: 'reverse', label: lang === 'hi' ? 'मूल संख्या' : 'Find Base (x)' },
                  { id: 'successive', label: lang === 'hi' ? 'क्रमिक %' : 'Successive %' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPercentageType(opt.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                    percentageType === opt.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {topic.id === 'fractions' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'operationLabel')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(
                [
                  { id: 'all', label: lang === 'hi' ? 'सभी' : 'All' },
                  { id: 'addition', label: lang === 'hi' ? 'जोड़' : 'Addition' },
                  { id: 'multiplication', label: lang === 'hi' ? 'गुणा' : 'Multiply' },
                  { id: 'comparison', label: lang === 'hi' ? 'तुलना' : 'Compare' },
                  { id: 'to_percent', label: lang === 'hi' ? 'प्रतिशत' : 'To %' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFractionOperation(opt.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                    fractionOperation === opt.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {['addition', 'subtraction', 'di_addition'].includes(topic.id) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t(lang, 'digitRange')}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {([2, 3, 4, 5] as const)
                  .filter((d) => topic.id === 'di_addition' || d <= 4)
                  .map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDigitRange(d)}
                      className={`py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        digitRange === d
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {d}D
                    </button>
                  ))}
              </div>
            </div>

            {topic.id === 'di_addition' && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {lang === 'hi' ? 'संख्याओं की गिनती' : 'Numbers per Sum'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setDiTerms(n)}
                      className={`py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                        diTerms === n
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {topic.id === 'division' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'divisionType')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'mixed', label: lang === 'hi' ? 'मिश्रित' : 'Mixed' },
                  { id: 'exact', label: lang === 'hi' ? 'पूर्ण भाग' : 'Exact Division' },
                  { id: 'remainder', label: lang === 'hi' ? 'शेषफल सहित' : 'With Remainder' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDivisionMode(opt.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                    divisionMode === opt.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {topic.id === 'trigonometry' && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {lang === 'hi' ? 'अभ्यास प्रकार' : 'Focus'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'all', label: lang === 'hi' ? 'मान व सर्वसमिकाएँ' : 'Angles & Identities' },
                  { id: 'values', label: lang === 'hi' ? 'मानक कोण (0°–90°)' : 'Standard Angles (0°–90°)' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTrigFocus(opt.id)}
                  className={`px-3 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all ${
                    trigFocus === opt.id
                      ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200'
                      : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Practice Mode (Random vs Sequence) - Only where relevant */}
        {supportsSequence && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'practiceMode')}
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              {(
                [
                  { id: 'random', label: t(lang, 'randomPractice') },
                  { id: 'sequential', label: t(lang, 'sequencePractice') },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOrderMode(opt.id)}
                  className={`py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                    orderMode === opt.id
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Difficulty & Question Count */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'difficulty')}
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  className={`py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                    difficulty === d
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t(lang, d)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t(lang, 'questionCount')}
            </label>
            <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
              {([10, 20, 30, 'unlimited'] as const).map((cnt) => (
                <button
                  key={String(cnt)}
                  type="button"
                  onClick={() => setQuestionCountChoice(cnt)}
                  className={`py-2.5 text-xs sm:text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    questionCountChoice === cnt
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {cnt === 'unlimited' ? t(lang, 'unlimited') : cnt}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Optional Collapsible Advanced Settings */}
        <div className="pt-1 border-t border-slate-200/80 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 py-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {t(lang, 'advancedSettings')}
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {t(lang, 'questionFormat')}
                </label>
                <select
                  value={questionTypeFilter}
                  onChange={(e) => setQuestionTypeFilter(e.target.value as QuestionType | 'all')}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                >
                  <option value="all">{t(lang, 'allFormats')}</option>
                  <option value="direct">Direct Answer</option>
                  <option value="mcq">Multiple Choice (MCQ)</option>
                  <option value="missing_number">Missing Number</option>
                </select>
              </div>

              <div className="flex flex-col justify-center gap-2.5">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={timed}
                    onChange={(e) => setTimed(e.target.checked)}
                    className="rounded accent-indigo-600 w-4 h-4"
                  />
                  {t(lang, 'timedMode')}
                  {timed && (
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={timeLimitMin}
                      onChange={(e) => setTimeLimitMin(Number(e.target.value))}
                      className="ml-2 w-16 px-2 py-0.5 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  )}
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={instantFeedback}
                    onChange={(e) => setInstantFeedback(e.target.checked)}
                    className="rounded accent-indigo-600 w-4 h-4"
                  />
                  {t(lang, 'instantFeedback')}
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Direct Primary Start Practice CTA */}
        <button
          type="button"
          onClick={handleStart}
          className={`w-full py-3.5 px-6 rounded-xl bg-gradient-to-r ${st.gradient} text-white text-base font-bold inline-flex items-center justify-center gap-2.5 hover:opacity-95 transition-opacity shadow-md`}
        >
          <Play className="w-5 h-5 fill-white" />
          {t(lang, 'startPractice')}
        </button>
      </section>
    </div>
  );
};
