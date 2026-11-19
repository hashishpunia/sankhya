import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  LogOut,
  RotateCcw,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { generateQuestionForTopic, verifyAnswer } from '../engine/questionGenerator';
import { t } from '../i18n/translations';
import type { PracticeSession, Question, SessionLaunchConfig, UserAnswer } from '../types/math';
import { playFeedbackFeedback } from '../utils/sound';
import { ProgressRing } from './DesignSystem';

interface PracticeSessionRunnerProps {
  initialSession: PracticeSession;
  launchConfig?: SessionLaunchConfig | null;
  onExit: () => void;
  onRestart?: () => void;
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

type AnswerInputMode = 'integer' | 'decimal' | 'text';

function getAnswerInputConfig(question?: Question): { mode: AnswerInputMode; isPercent: boolean } {
  if (!question) return { mode: 'text', isPercent: false };
  const raw = question.correctAnswer.trim();
  const isPercent = raw.endsWith('%');
  const core = isPercent ? raw.slice(0, -1).trim() : raw;
  if (/^\d+$/.test(core)) {
    return { mode: 'integer', isPercent };
  }
  if (/^-?\d+(\.\d+)?$/.test(core)) {
    return { mode: 'decimal', isPercent };
  }
  return { mode: 'text', isPercent: false };
}

function sanitizeNumericInput(value: string, mode: AnswerInputMode): string {
  if (mode === 'integer') {
    return value.replace(/[^\d]/g, '');
  }
  if (mode === 'decimal') {
    let cleaned = value.replace(/[^0-9.-]/g, '');
    const isNeg = cleaned.startsWith('-');
    cleaned = cleaned.replace(/-/g, '');
    const dotIdx = cleaned.indexOf('.');
    if (dotIdx !== -1) {
      cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, '');
    }
    return isNeg ? `-${cleaned}` : cleaned;
  }
  return value;
}

export const PracticeSessionRunner: React.FC<PracticeSessionRunnerProps> = ({
  initialSession,
  launchConfig,
  onExit,
  onRestart,
}) => {
  const {
    activeUserId,
    settings,
    generatorConfigs,
    persistSessionProgress,
    finalizeSession,
    submitQuestionReport,
  } = usePlatform();
  const lang = settings.language;

  const isUnlimited = Boolean(initialSession.unlimited);
  const [questions, setQuestions] = useState<Question[]>(initialSession.questionsSnapshot ?? []);
  const [currentIndex, setCurrentIndex] = useState<number>(initialSession.currentIndex ?? 0);
  const [answersMap, setAnswersMap] = useState<
    Record<string, { selectedAnswer: string; isCorrect: boolean; isSkipped: boolean; responseTimeSec: number }>
  >(initialSession.answersSnapshot ?? {});

  const [inputVal, setInputVal] = useState('');
  const [submittedCurrent, setSubmittedCurrent] = useState(false);
  const [elapsedSec, setElapsedSec] = useState<number>(initialSession.totalTimeSec ?? 0);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [completedSession, setCompletedSession] = useState<PracticeSession | null>(
    initialSession.status === 'completed' ? initialSession : null
  );
  const [reviewFilter, setReviewFilter] = useState<'all' | 'correct' | 'incorrect' | 'skipped'>('all');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportSent, setReportSent] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const isTimed = Boolean(initialSession.timed && (initialSession.timeLimitSec ?? 0) > 0);
  const timeLimitSec = initialSession.timeLimitSec ?? 0;
  const instantFeedback = initialSession.mode === 'test' ? false : Boolean(initialSession.instantFeedback ?? true);

  const currentQuestion = questions[currentIndex];
  const currentRecorded = currentQuestion ? answersMap[currentQuestion.id] : undefined;

  useEffect(() => {
    if (completedSession) return;
    const timer = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [completedSession]);

  useEffect(() => {
    if (completedSession) return;
    if (isTimed && elapsedSec >= timeLimitSec) {
      void finishEntireSession(answersMap, timeLimitSec);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSec, isTimed, timeLimitSec, completedSession]);

  useEffect(() => {
    setInputVal('');
    setSubmittedCurrent(Boolean(currentRecorded));
    setQuestionStartTime(Date.now());
    setReportOpen(false);
    setReportReason('');
    setReportSent(false);
    if (
      inputRef.current &&
      currentQuestion?.questionType !== 'mcq' &&
      currentQuestion?.questionType !== 'true_false' &&
      currentQuestion?.questionType !== 'identify_incorrect'
    ) {
      inputRef.current.focus();
    }
  }, [currentIndex, currentQuestion?.id]);

  const computeTotals = (
    map: Record<string, { selectedAnswer: string; isCorrect: boolean; isSkipped: boolean; responseTimeSec: number }>,
    questionList: Question[] = questions
  ) => {
    let attempted = 0;
    let correct = 0;
    let incorrect = 0;
    let skipped = 0;
    let score = 0;

    for (const q of questionList) {
      const rec = map[q.id];
      if (!rec || rec.isSkipped) {
        skipped++;
      } else {
        attempted++;
        if (rec.isCorrect) {
          correct++;
          score += q.marks ?? 1;
        } else {
          incorrect++;
          score -= initialSession.negativeMarking ?? 0;
        }
      }
    }
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    return { attempted, correct, incorrect, skipped, score: Number(score.toFixed(2)), accuracy };
  };

  const buildMoreUnlimitedQuestions = (currentList: Question[], batchSize = 5): Question[] => {
    if (!isUnlimited || currentList.length >= 200) return currentList;
    const effectiveCfg: SessionLaunchConfig = launchConfig ?? {
      mode: initialSession.mode,
      topicId: initialSession.topicId,
      topicName: initialSession.topicName,
      difficulty: initialSession.difficulty,
      questionCount: 15,
      unlimited: true,
      timed: isTimed,
      timeLimitSec,
      questionTypeFilter: 'all',
      orderMode: 'random',
      instantFeedback,
    };
    const nextList = [...currentList];
    const seen = new Set(nextList.map((q) => q.questionText));
    let attempts = 0;
    let offset = nextList.length;
    const targetLen = Math.min(200, nextList.length + batchSize);
    while (nextList.length < targetLen && attempts < batchSize * 6) {
      attempts++;
      const q = generateQuestionForTopic(initialSession.topicId, offset, effectiveCfg, generatorConfigs);
      offset++;
      if (!seen.has(q.questionText) || effectiveCfg.orderMode === 'sequential') {
        seen.add(q.questionText);
        nextList.push({ ...q, id: `${q.id}_u${nextList.length}` });
      }
    }
    return nextList;
  };

  const finishEntireSession = async (
    finalMap: Record<string, { selectedAnswer: string; isCorrect: boolean; isSkipped: boolean; responseTimeSec: number }>,
    finalElapsedSec = elapsedSec,
    questionList = questions
  ) => {
    let activeQuestions = questionList;
    if (isUnlimited) {
      let maxVisited = 0;
      questionList.forEach((q, idx) => {
        if (finalMap[q.id]) maxVisited = Math.max(maxVisited, idx);
      });
      if (finalMap[questionList[currentIndex]?.id ?? '']) {
        maxVisited = Math.max(maxVisited, currentIndex);
      }
      const sliceLen = Math.min(200, Math.max(1, maxVisited + 1));
      activeQuestions = questionList.slice(0, sliceLen);
    }

    const totals = computeTotals(finalMap, activeQuestions);
    const avgTime = activeQuestions.length > 0 ? Number((finalElapsedSec / activeQuestions.length).toFixed(1)) : 0;
    const finalSess: PracticeSession = {
      ...initialSession,
      totalQuestions: activeQuestions.length,
      attemptedQuestions: totals.attempted,
      correctAnswers: totals.correct,
      incorrectAnswers: totals.incorrect,
      skippedQuestions: totals.skipped,
      score: totals.score,
      accuracy: totals.accuracy,
      totalTimeSec: finalElapsedSec,
      avgTimePerQuestionSec: avgTime,
      status: 'completed',
      completedAtIso: new Date().toISOString(),
      questionsSnapshot: activeQuestions,
      answersSnapshot: finalMap,
      currentIndex,
    };

    const userAnswers: UserAnswer[] = activeQuestions.map((q) => {
      const rec = finalMap[q.id];
      return {
        id: `${initialSession.id}_${q.id}`,
        userId: activeUserId,
        sessionId: initialSession.id,
        questionId: q.id,
        topicId: q.topicId,
        questionText: q.questionText,
        selectedAnswer: rec?.selectedAnswer ?? '',
        correctAnswer: q.correctAnswer,
        isCorrect: Boolean(rec?.isCorrect),
        isSkipped: rec ? rec.isSkipped : true,
        responseTimeSec: rec?.responseTimeSec ?? 0,
        answeredAtIso: new Date().toISOString(),
      };
    });

    await finalizeSession(finalSess, userAnswers);
    setQuestions(activeQuestions);
    setCompletedSession(finalSess);
  };

  const handleRecordAnswer = async (rawValue: string, skipped = false) => {
    if (!currentQuestion || submittedCurrent) return;
    const responseTimeSec = Math.max(0.5, Number(((Date.now() - questionStartTime) / 1000).toFixed(1)));
    const trimmed = rawValue.trim();
    const isCorrect = !skipped && verifyAnswer(trimmed, currentQuestion);

    const nextMap = {
      ...answersMap,
      [currentQuestion.id]: {
        selectedAnswer: skipped ? '' : trimmed,
        isCorrect,
        isSkipped: skipped,
        responseTimeSec,
      },
    };
    setAnswersMap(nextMap);

    if (!skipped && instantFeedback) {
      playFeedbackFeedback(isCorrect, settings.soundEnabled, settings.vibrationEnabled);
    }

    const totals = computeTotals(nextMap);
    const updatedProgress: PracticeSession = {
      ...initialSession,
      totalQuestions: questions.length,
      attemptedQuestions: totals.attempted,
      correctAnswers: totals.correct,
      incorrectAnswers: totals.incorrect,
      skippedQuestions: totals.skipped,
      score: totals.score,
      accuracy: totals.accuracy,
      totalTimeSec: elapsedSec,
      avgTimePerQuestionSec: totals.attempted > 0 ? Number((elapsedSec / totals.attempted).toFixed(1)) : 0,
      status: 'in_progress',
      questionsSnapshot: questions,
      answersSnapshot: nextMap,
      currentIndex,
    };
    await persistSessionProgress(updatedProgress);

    if (instantFeedback && !skipped) {
      setSubmittedCurrent(true);
    } else {
      await handleAdvance(nextMap);
    }
  };

  const handleAdvance = async (overrideMap = answersMap) => {
    const nextIdx = currentIndex + 1;
    let workingList = questions;

    if (isUnlimited && nextIdx + 2 >= workingList.length && workingList.length < 200) {
      workingList = buildMoreUnlimitedQuestions(workingList, 5);
      setQuestions(workingList);
    }

    if (nextIdx < workingList.length) {
      setCurrentIndex(nextIdx);
      const totals = computeTotals(overrideMap, workingList);
      await persistSessionProgress({
        ...initialSession,
        totalQuestions: workingList.length,
        attemptedQuestions: totals.attempted,
        correctAnswers: totals.correct,
        incorrectAnswers: totals.incorrect,
        skippedQuestions: totals.skipped,
        score: totals.score,
        accuracy: totals.accuracy,
        totalTimeSec: elapsedSec,
        currentIndex: nextIdx,
        questionsSnapshot: workingList,
        answersSnapshot: overrideMap,
        status: 'in_progress',
      });
    } else {
      await finishEntireSession(overrideMap, elapsedSec, workingList);
    }
  };

  const handleExitAndSave = async () => {
    if (!completedSession) {
      const totals = computeTotals(answersMap);
      await persistSessionProgress({
        ...initialSession,
        totalQuestions: questions.length,
        attemptedQuestions: totals.attempted,
        correctAnswers: totals.correct,
        incorrectAnswers: totals.incorrect,
        skippedQuestions: totals.skipped,
        score: totals.score,
        accuracy: totals.accuracy,
        totalTimeSec: elapsedSec,
        currentIndex,
        questionsSnapshot: questions,
        answersSnapshot: answersMap,
        status: 'in_progress',
      });
    }
    onExit();
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion || reportReason.trim().length < 3) return;
    await submitQuestionReport(currentQuestion.id, currentQuestion.topicId, reportReason);
    setReportSent(true);
    setReportReason('');
  };

  const reviewItems = useMemo(() => {
    return questions
      .map((q, idx) => ({ q, idx, rec: answersMap[q.id] }))
      .filter((item) => {
        if (reviewFilter === 'all') return true;
        if (reviewFilter === 'correct') return item.rec?.isCorrect;
        if (reviewFilter === 'incorrect') return item.rec && !item.rec.isSkipped && !item.rec.isCorrect;
        return !item.rec || item.rec.isSkipped;
      });
  }, [answersMap, questions, reviewFilter]);

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto p-8 bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl text-center">
        <p className="text-slate-600 dark:text-slate-300 mb-4">No questions matched this configuration.</p>
        <button
          onClick={onExit}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700"
        >
          {t(lang, 'exitSession')}
        </button>
      </div>
    );
  }

  // --- RESULT SCREEN ---
  if (completedSession) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm shadow-slate-200/50 dark:shadow-none space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-5">
              <ProgressRing
                percentage={completedSession.accuracy}
                size={96}
                strokeWidth={9}
                strokeColor={completedSession.accuracy >= 70 ? '#059669' : '#4f46e5'}
                label={`${completedSession.accuracy}%`}
                sublabel="Accuracy"
              />
              <div>
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  {completedSession.mode.replace('_', ' ').toUpperCase()} · {completedSession.difficulty}
                </p>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                  {completedSession.topicName}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-1">
                  Score: {completedSession.score} / {completedSession.totalQuestions * (questions[0]?.marks ?? 1)} ·{' '}
                  Total Time: {formatDuration(completedSession.totalTimeSec)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {onRestart && (
                <button
                  onClick={onRestart}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  Practice Again
                </button>
              )}
              <button
                onClick={onExit}
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl hover:opacity-95 whitespace-nowrap shrink-0"
              >
                Done
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">{t(lang, 'totalQuestions')}</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1">{completedSession.totalQuestions}</div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/70 text-emerald-700 dark:text-emerald-300">
              <div className="text-xs">{t(lang, 'correct')}</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1">{completedSession.correctAnswers}</div>
            </div>
            <div className="p-4 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/70 text-rose-700 dark:text-rose-300">
              <div className="text-xs">{t(lang, 'incorrect')}</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1">{completedSession.incorrectAnswers}</div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/70 text-amber-700 dark:text-amber-300">
              <div className="text-xs">{t(lang, 'avgTime')}</div>
              <div className="font-mono text-2xl font-bold tabular-nums mt-1">
                {completedSession.avgTimePerQuestionSec}s
              </div>
            </div>
          </div>
        </div>

        {/* Question-Wise Review */}
        <div className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm shadow-slate-200/50 dark:shadow-none">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t(lang, 'answerReview')}</h3>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              {(['all', 'correct', 'incorrect', 'skipped'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setReviewFilter(f)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                    reviewFilter === f
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-300 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {f === 'all' ? 'All' : t(lang, f)}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {reviewItems.map(({ q, idx, rec }) => {
              const isCorrect = rec?.isCorrect;
              const isSkipped = !rec || rec.isSkipped;
              return (
                <div key={q.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        Q{idx + 1} · {q.difficulty} · {rec?.responseTimeSec ?? 0}s
                      </div>
                      <div className="text-base font-semibold text-slate-900 dark:text-white font-mono">
                        {lang === 'hi' && q.questionTextHi ? q.questionTextHi : q.questionText}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isSkipped ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4" /> {t(lang, 'skipped')}
                        </span>
                      ) : isCorrect ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" /> {t(lang, 'correct')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                          <XCircle className="w-4 h-4" /> {t(lang, 'incorrect')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">Your Answer: </span>
                      <span className="font-mono font-medium text-slate-900 dark:text-slate-100">
                        {isSkipped ? '—' : rec?.selectedAnswer}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400">{t(lang, 'correctLabel')}: </span>
                      <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        {q.correctAnswer}
                      </span>
                    </div>
                  </div>
                  {(q.explanation || q.explanationHi) && (
                    <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 px-3.5 py-2.5 rounded-xl">
                      {lang === 'hi' && q.explanationHi ? q.explanationHi : q.explanation}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // --- DISTRACTION-FREE QUESTION SOLVING INTERFACE ---
  const remainingSec = isTimed ? Math.max(0, timeLimitSec - elapsedSec) : elapsedSec;
  const isMcqStyle =
    currentQuestion.questionType === 'mcq' ||
    currentQuestion.questionType === 'true_false' ||
    currentQuestion.questionType === 'identify_incorrect';
  const showOptions = isMcqStyle && currentQuestion.options && currentQuestion.options.length > 0;
  const answerConfig = getAnswerInputConfig(currentQuestion);
  const questionPrompt =
    lang === 'hi' && currentQuestion.questionTextHi ? currentQuestion.questionTextHi : currentQuestion.questionText;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Compact Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3.5 bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm shadow-slate-200/50 dark:shadow-none">
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-slate-900 dark:text-white">{initialSession.topicName}</span>
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold tabular-nums">
            {isUnlimited
              ? `Question ${currentIndex + 1} · ${t(lang, 'unlimited')}`
              : `Question ${currentIndex + 1} / ${questions.length}`}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isTimed && (
            <div
              className={`inline-flex items-center gap-1.5 text-sm font-mono font-bold tabular-nums px-3 py-1 rounded-lg ${
                remainingSec <= 30
                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              {formatDuration(remainingSec)}
            </div>
          )}
          {(initialSession.mode === 'test' || isUnlimited) && (
            <button
              onClick={() => void finishEntireSession(answersMap)}
              className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 whitespace-nowrap"
            >
              {initialSession.mode === 'test' ? 'Submit Test' : t(lang, 'finishSession')}
            </button>
          )}
          <button
            onClick={() => void handleExitAndSave()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t(lang, 'exitSession')}
          </button>
        </div>
      </div>

      {/* Smooth Progress Bar */}
      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-300"
          style={{
            width: isUnlimited
              ? `${Math.min(100, Math.max(8, ((currentIndex + (submittedCurrent ? 1 : 0)) % 20) * 5 || 100))}%`
              : `${Math.round(((currentIndex + (submittedCurrent ? 1 : 0)) / questions.length) * 100)}%`,
          }}
        />
      </div>

      {/* Animated Question Surface */}
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm shadow-slate-200/60 dark:shadow-none space-y-6"
      >
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>
            {currentQuestion.difficulty.toUpperCase()} · {currentQuestion.questionType.replace('_', ' ')} ·{' '}
            {currentQuestion.marks} mark{currentQuestion.marks !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => setReportOpen((v) => !v)}
            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <Flag className="w-3.5 h-3.5" />
            {t(lang, 'reportQuestion')}
          </button>
        </div>

        {currentQuestion.columnTerms && currentQuestion.columnTerms.length > 0 ? (
          <div className="py-5 px-7 bg-indigo-50/60 dark:bg-slate-900/70 rounded-2xl border border-indigo-200/70 dark:border-slate-800 inline-block min-w-[240px]">
            <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-2">Column Addition</div>
            <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums text-right text-slate-900 dark:text-white space-y-1">
              {currentQuestion.columnTerms.map((term, i) => (
                <div key={i}>{i === currentQuestion.columnTerms!.length - 1 ? `+ ${term}` : term}</div>
              ))}
              <div className="border-t-2 border-indigo-400 dark:border-indigo-600 pt-1 text-indigo-600 dark:text-indigo-400">
                ?
              </div>
            </div>
          </div>
        ) : (
          <div className="text-2xl sm:text-4xl font-bold font-mono tabular-nums text-slate-900 dark:text-white leading-snug">
            {questionPrompt}
          </div>
        )}

        {showOptions ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {currentQuestion.options.map((opt, idx) => {
              const isSelected = currentRecorded?.selectedAnswer === opt;
              const isCorrectOpt = opt === currentQuestion.correctAnswer;
              let btnClass =
                'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-slate-900 dark:text-slate-100';
              if (submittedCurrent) {
                if (isCorrectOpt) {
                  btnClass =
                    'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200';
                } else if (isSelected && !isCorrectOpt) {
                  btnClass = 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200';
                }
              }
              return (
                <button
                  key={idx}
                  disabled={submittedCurrent}
                  onClick={() => void handleRecordAnswer(opt, false)}
                  className={`flex items-center justify-between px-4 py-4 rounded-xl border text-left font-mono text-base font-semibold transition-all ${btnClass}`}
                >
                  <span>
                    <span className="text-xs text-slate-400 mr-2.5">{String.fromCharCode(65 + idx)}.</span>
                    {opt}
                  </span>
                  {submittedCurrent && isCorrectOpt && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />}
                  {submittedCurrent && isSelected && !isCorrectOpt && (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!inputVal.trim()) return;
              void handleRecordAnswer(inputVal, false);
            }}
            className="space-y-4"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 flex items-center">
                <input
                  key={`${currentQuestion.id}_${answerConfig.mode}`}
                  ref={inputRef}
                  type="text"
                  inputMode={
                    answerConfig.mode === 'integer'
                      ? 'numeric'
                      : answerConfig.mode === 'decimal'
                        ? 'decimal'
                        : 'text'
                  }
                  pattern={answerConfig.mode === 'integer' ? '[0-9]*' : undefined}
                  enterKeyHint="done"
                  autoComplete="off"
                  disabled={submittedCurrent}
                  value={submittedCurrent ? currentRecorded?.selectedAnswer ?? '' : inputVal}
                  onChange={(e) => setInputVal(sanitizeNumericInput(e.target.value, answerConfig.mode))}
                  placeholder={
                    answerConfig.mode === 'integer'
                      ? lang === 'hi'
                        ? 'केवल संख्या लिखें (जैसे 289)'
                        : 'Enter number (e.g. 289)'
                      : answerConfig.mode === 'decimal'
                        ? lang === 'hi'
                          ? 'संख्या लिखें (जैसे 12.5)'
                          : 'Enter number (e.g. 12.5)'
                        : lang === 'hi'
                          ? 'उत्तर लिखें (जैसे 2/3, 1/√2, 12 R 5)'
                          : 'Type your answer (e.g. 2/3, 1/√2, 12 R 5)'
                  }
                  className={`w-full px-4 py-3.5 text-lg font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                    answerConfig.isPercent ? 'pr-10' : ''
                  }`}
                />
                {answerConfig.isPercent && (
                  <span className="absolute right-4 text-lg font-mono font-semibold text-slate-500 dark:text-slate-400 pointer-events-none">
                    %
                  </span>
                )}
              </div>
              {!submittedCurrent && (
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:opacity-95 disabled:opacity-40 whitespace-nowrap shrink-0"
                >
                  {t(lang, 'submitAnswer')}
                </button>
              )}
            </div>

            {!submittedCurrent && answerConfig.mode !== 'integer' && (
              <div className="flex flex-wrap items-center gap-2">
                {(answerConfig.mode === 'decimal'
                  ? ['-', '.']
                  : ['/', '√', '%', '-', '.', ' R ', 'Undefined']
                ).map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => setInputVal((p) => sanitizeNumericInput(p + sym, answerConfig.mode))}
                    className="px-3 py-1.5 text-xs font-mono bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    {sym === ' R ' ? 'R (Rem)' : sym}
                  </button>
                ))}
              </div>
            )}
          </form>
        )}

        {submittedCurrent && currentRecorded && (
          <div
            className={`p-4 rounded-xl border ${
              currentRecorded.isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900'
                : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900'
            }`}
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              {currentRecorded.isCorrect ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-800 dark:text-emerald-200">Correct Answer!</span>
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  <span className="text-rose-800 dark:text-rose-200">
                    {t(lang, 'incorrectLabel')} — {t(lang, 'correctLabel')}:{' '}
                    <span className="font-mono font-bold">{currentQuestion.correctAnswer}</span>
                  </span>
                </>
              )}
            </div>
            {(currentQuestion.explanation || currentQuestion.explanationHi) && (
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                <span className="font-semibold">{t(lang, 'explanation')}: </span>
                {lang === 'hi' && currentQuestion.explanationHi
                  ? currentQuestion.explanationHi
                  : currentQuestion.explanation}
              </p>
            )}
          </div>
        )}

        {reportOpen && (
          <form
            onSubmit={handleReportSubmit}
            className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-2"
          >
            {reportSent ? (
              <div className="text-sm text-emerald-600 dark:text-emerald-400">
                Report saved and queued for admin review.
              </div>
            ) : (
              <>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
                  Describe the issue with question ID <span className="font-mono">{currentQuestion.id}</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="e.g., Incorrect option or typo in explanation"
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 text-white rounded-lg"
                  >
                    Send
                  </button>
                </div>
              </>
            )}
          </form>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          {!submittedCurrent ? (
            <button
              type="button"
              onClick={() => void handleRecordAnswer('', true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <SkipForward className="w-4 h-4" />
              {t(lang, 'skipQuestion')}
            </button>
          ) : (
            <div />
          )}

          {submittedCurrent && (
            <button
              type="button"
              onClick={() => void handleAdvance()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-semibold rounded-xl hover:opacity-95"
            >
              {isUnlimited || currentIndex + 1 < questions.length
                ? t(lang, 'nextQuestion')
                : t(lang, 'finishSession')}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
