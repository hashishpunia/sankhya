import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CheckCircle2,
  Clock,
  Eraser,
  Grid3x3,
  Loader2,
  ShieldCheck,
  Trophy,
  XCircle,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import {
  fetchEventPaper,
  formatCountdownMs,
  submitEventAttemptCloud,
} from '../services/eventService';
import type { EventSubmission, Language, Question, TestEvent } from '../types/math';
import { ProgressRing } from './DesignSystem';

interface ScheduledExamRunnerProps {
  event: TestEvent;
  existingSubmission?: EventSubmission | null;
  onExit: () => void;
  onSubmitted: (submission: EventSubmission) => void;
  onOpenLeaderboard: (event: TestEvent) => void;
}

interface SelectionState {
  selectedAnswer: string;
  markedForReview: boolean;
  visited: boolean;
  responseTimeSec: number;
}

function getNumericInputMode(q?: Question): 'none' | 'numeric' | 'decimal' | 'text' {
  if (!q) return 'text';
  const core = q.correctAnswer.trim().replace(/%$/, '');
  if (/^\d+$/.test(core)) return 'numeric';
  if (/^-?\d+(\.\d+)?$/.test(core)) return 'decimal';
  return 'text';
}

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (hrs > 0) {
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export const ScheduledExamRunner: React.FC<ScheduledExamRunnerProps> = ({
  event,
  existingSubmission,
  onExit,
  onSubmitted,
  onOpenLeaderboard,
}) => {
  const { firebaseUser, userProfile, settings } = usePlatform();
  const lang: Language = settings.language;

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [loadingPaper, setLoadingPaper] = useState(false);
  const [paperError, setPaperError] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<string, SelectionState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [paletteOpenMobile, setPaletteOpenMobile] = useState(false);
  const [completedSubmission, setCompletedSubmission] = useState<EventSubmission | null>(
    existingSubmission ?? null
  );

  const examStartedAtRef = useRef<number | null>(null);
  const questionEnterTimeRef = useRef<number>(Date.now());
  const autoSubmittedRef = useRef(false);

  // Live clock tick every second for countdown & exam timer
  useEffect(() => {
    const id = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const isBeforeStart = nowMs < event.startAtMs;
  const isAfterEnd = nowMs > event.endAtMs;
  const isWindowLive = nowMs >= event.startAtMs && nowMs <= event.endAtMs;

  // Load locked question paper when event window becomes live (or if reviewing a published submission)
  const loadPaper = useCallback(async () => {
    if (loadingPaper || questions.length > 0) return;
    setLoadingPaper(true);
    setPaperError('');
    try {
      const qs = await fetchEventPaper(event.id);
      if (qs.length === 0) {
        throw new Error('No questions were found in the official exam paper.');
      }
      setQuestions(qs);
      const initSelections: Record<string, SelectionState> = {};
      qs.forEach((q, idx) => {
        initSelections[q.id] = {
          selectedAnswer: '',
          markedForReview: false,
          visited: idx === 0,
          responseTimeSec: 0,
        };
      });
      setSelections(initSelections);
      examStartedAtRef.current = Date.now();
      questionEnterTimeRef.current = Date.now();
    } catch (err) {
      setPaperError(err instanceof Error ? err.message : 'Unable to load exam paper.');
    } finally {
      setLoadingPaper(false);
    }
  }, [event.id, loadingPaper, questions.length]);

  useEffect(() => {
    if (!completedSubmission && isWindowLive && questions.length === 0 && !loadingPaper && !paperError) {
      void loadPaper();
    }
  }, [completedSubmission, isWindowLive, questions.length, loadingPaper, paperError, loadPaper]);

  const remainingSec = useMemo(() => {
    if (!examStartedAtRef.current) return event.durationMin * 60;
    const elapsedSinceStartSec = Math.floor((nowMs - examStartedAtRef.current) / 1000);
    const remainingDuration = Math.max(0, event.durationMin * 60 - elapsedSinceStartSec);
    const remainingWindow = Math.max(0, Math.floor((event.endAtMs - nowMs) / 1000));
    return Math.min(remainingDuration, remainingWindow);
  }, [event.durationMin, event.endAtMs, nowMs]);

  const handleFinalSubmit = useCallback(async () => {
    if (!firebaseUser || submitting || completedSubmission || questions.length === 0) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const startedAt = examStartedAtRef.current ?? Date.now();
      const totalElapsed = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
      const payloadSelections: Record<
        string,
        { selectedAnswer: string; markedForReview?: boolean; responseTimeSec?: number }
      > = {};
      for (const q of questions) {
        const s = selections[q.id];
        payloadSelections[q.id] = {
          selectedAnswer: s?.selectedAnswer ?? '',
          markedForReview: Boolean(s?.markedForReview),
          responseTimeSec: s?.responseTimeSec ?? 0,
        };
      }
      const sub = await submitEventAttemptCloud(
        event,
        {
          uid: firebaseUser.uid,
          fullName: userProfile?.fullName || firebaseUser.displayName || 'Student',
        },
        questions,
        payloadSelections,
        Math.min(event.durationMin * 60, totalElapsed)
      );
      setCompletedSubmission(sub);
      setConfirmSubmitOpen(false);
      onSubmitted(sub);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit official exam.');
    } finally {
      setSubmitting(false);
    }
  }, [completedSubmission, event, firebaseUser, onSubmitted, questions, selections, submitting, userProfile?.fullName]);

  // Automatic submit when exam timer reaches 0
  useEffect(() => {
    if (
      !completedSubmission &&
      questions.length > 0 &&
      examStartedAtRef.current !== null &&
      remainingSec <= 0 &&
      !autoSubmittedRef.current
    ) {
      autoSubmittedRef.current = true;
      void handleFinalSubmit();
    }
  }, [completedSubmission, handleFinalSubmit, questions.length, remainingSec]);

  const recordTimeForCurrentQuestion = () => {
    const q = questions[currentIndex];
    if (!q) return;
    const spent = Math.max(0, Math.round((Date.now() - questionEnterTimeRef.current) / 1000));
    setSelections((prev) => {
      const cur = prev[q.id] ?? { selectedAnswer: '', markedForReview: false, visited: true, responseTimeSec: 0 };
      return {
        ...prev,
        [q.id]: {
          ...cur,
          visited: true,
          responseTimeSec: cur.responseTimeSec + spent,
        },
      };
    });
    questionEnterTimeRef.current = Date.now();
  };

  const navigateToQuestion = (targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    recordTimeForCurrentQuestion();
    const targetQ = questions[targetIdx];
    setSelections((prev) => ({
      ...prev,
      [targetQ.id]: {
        ...(prev[targetQ.id] ?? { selectedAnswer: '', markedForReview: false, responseTimeSec: 0 }),
        visited: true,
      },
    }));
    setCurrentIndex(targetIdx);
    setPaletteOpenMobile(false);
  };

  const updateAnswer = (qId: string, answer: string) => {
    setSelections((prev) => {
      const cur = prev[qId] ?? { selectedAnswer: '', markedForReview: false, visited: true, responseTimeSec: 0 };
      return {
        ...prev,
        [qId]: { ...cur, visited: true, selectedAnswer: answer },
      };
    });
  };

  const toggleMarkForReview = (qId: string) => {
    setSelections((prev) => {
      const cur = prev[qId] ?? { selectedAnswer: '', markedForReview: false, visited: true, responseTimeSec: 0 };
      return {
        ...prev,
        [qId]: { ...cur, visited: true, markedForReview: !cur.markedForReview },
      };
    });
  };

  const summaryCounts = useMemo(() => {
    let answered = 0;
    let marked = 0;
    let answeredAndMarked = 0;
    let notVisited = 0;
    let unansweredVisited = 0;
    for (const q of questions) {
      const s = selections[q.id];
      const hasAns = Boolean(s?.selectedAnswer?.trim());
      if (hasAns && s?.markedForReview) answeredAndMarked += 1;
      else if (hasAns) answered += 1;
      else if (s?.markedForReview) marked += 1;
      else if (s?.visited) unansweredVisited += 1;
      else notVisited += 1;
    }
    return {
      answered,
      marked,
      answeredAndMarked,
      notVisited,
      unansweredVisited,
      totalAnswered: answered + answeredAndMarked,
      totalMarked: marked + answeredAndMarked,
    };
  }, [questions, selections]);

  // --- 1. POST-SUBMISSION SUMMARY SCREEN ---
  if (completedSubmission) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                {lang === 'hi' ? 'आधिकारिक परीक्षा जमा' : 'Official Event Attempt Recorded'}
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{event.title}</h1>
            </div>
            <ProgressRing
              percentage={completedSubmission.accuracy}
              size={96}
              strokeWidth={9}
              strokeColor="#10b981"
              label={`${completedSubmission.accuracy}%`}
              sublabel="Accuracy"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Official Score</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400 mt-1">
                {completedSubmission.score} / {completedSubmission.maxScore}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Correct</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {completedSubmission.correctAnswers}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Incorrect</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
                {completedSubmission.incorrectAnswers}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
              <div className="text-xs text-slate-500 dark:text-slate-400">Time Taken</div>
              <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {formatClock(completedSubmission.timeTakenSec)}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                {event.resultsPublished
                  ? completedSubmission.rank > 0
                    ? `Official Rank: #${completedSubmission.rank}`
                    : 'Final Results Published'
                  : 'Rankings Pending Official Publication'}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {event.resultsPublished
                  ? 'Verified leaderboard and winner announcements are now live.'
                  : 'Admins will compute rankings, verify top winners, and publish the official leaderboard after the event window closes.'}
              </p>
            </div>

            {event.resultsPublished && (
              <button
                type="button"
                onClick={() => onOpenLeaderboard(event)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700"
              >
                View Official Leaderboard
              </button>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onExit}
              className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-semibold rounded-xl"
            >
              Back to Scheduled Events
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. PRE-START COUNTDOWN SCREEN ---
  if (isBeforeStart) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="w-4 h-4" />
            Official Scheduled Exam Waiting Room
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{event.title}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{event.description}</p>
          </div>

          <div className="py-6 px-4 rounded-2xl bg-slate-950 text-white space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-400">Exam Starts In</div>
            <div className="text-4xl sm:text-5xl font-bold font-mono tabular-nums text-amber-300">
              {formatCountdownMs(event.startAtMs - nowMs)}
            </div>
            <div className="text-xs text-slate-400">
              Scheduled Start: {new Date(event.startAtMs).toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] text-slate-500">Questions</div>
              <div className="text-lg font-bold font-mono tabular-nums">{event.totalQuestions}</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] text-slate-500">Duration</div>
              <div className="text-lg font-bold font-mono tabular-nums">{event.durationMin} min</div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
              <div className="text-[11px] text-slate-500">Marking</div>
              <div className="text-lg font-bold font-mono tabular-nums">
                +{event.marksPerQuestion} / -{event.negativeMarking}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            Stay on this screen — the official exam paper unlocks automatically the second the scheduled start time arrives.
          </p>

          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Events
          </button>
        </div>
      </div>
    );
  }

  // --- 3. WINDOW ENDED OR PAPER LOAD ERROR ---
  if ((isAfterEnd && questions.length === 0) || paperError) {
    return (
      <div className="max-w-xl mx-auto bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center space-y-4">
        <XCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {paperError ? 'Unable to Enter Exam' : 'Scheduled Test Window Ended'}
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {paperError ||
            `This scheduled test window closed on ${new Date(event.endAtMs).toLocaleString()}.`}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {paperError && isWindowLive && (
            <button
              type="button"
              onClick={() => void loadPaper()}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
            >
              Retry Loading Paper
            </button>
          )}
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-xs font-semibold rounded-xl"
          >
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  if (loadingPaper || questions.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-20 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
        <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Unlocking official scheduled question paper...
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const currentSel = selections[currentQuestion.id] ?? {
    selectedAnswer: '',
    markedForReview: false,
    visited: true,
    responseTimeSec: 0,
  };
  const isUrgent = remainingSec <= 120;

  return (
    <div className="space-y-5">
      {/* Top Exam Bar */}
      <div className="bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Scheduled Competition Exam
          </div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
            {lang === 'hi' && event.titleHi ? event.titleHi : event.title}
          </h1>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono tabular-nums text-sm font-bold border ${
              isUrgent
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{formatClock(remainingSec)}</span>
          </div>

          <button
            type="button"
            onClick={() => setPaletteOpenMobile((v) => !v)}
            className="lg:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold"
          >
            <Grid3x3 className="w-4 h-4" />
            {currentIndex + 1}/{questions.length}
          </button>

          <button
            type="button"
            onClick={() => setConfirmSubmitOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors"
          >
            Submit Exam
          </button>
        </div>
      </div>

      {submitError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Main Two-Zone Exam Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Question Panel */}
        <div className="lg:col-span-8 bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold font-mono tabular-nums text-indigo-600 dark:text-indigo-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                +{event.marksPerQuestion} / -{event.negativeMarking}
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleMarkForReview(currentQuestion.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                currentSel.markedForReview
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 text-amber-800 dark:text-amber-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-amber-400'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${currentSel.markedForReview ? 'fill-amber-500 text-amber-500' : ''}`} />
              {currentSel.markedForReview ? 'Marked for Review' : 'Mark for Review'}
            </button>
          </div>

          <div className="space-y-5">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              {lang === 'hi' && currentQuestion.questionTextHi
                ? currentQuestion.questionTextHi
                : currentQuestion.questionText}
            </h2>

            {currentQuestion.options && currentQuestion.options.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((opt, idx) => {
                  const isSelected = currentSel.selectedAnswer === opt;
                  const letter = String.fromCharCode(65 + idx);
                  return (
                    <button
                      key={`${currentQuestion.id}_opt_${idx}`}
                      type="button"
                      onClick={() => updateAnswer(currentQuestion.id, opt)}
                      className={`p-4 rounded-xl border text-left transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-900 dark:text-indigo-100 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 hover:border-indigo-400 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="font-mono text-base font-semibold">{opt}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 max-w-sm">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Enter Your Answer
                </label>
                <input
                  type="text"
                  inputMode={getNumericInputMode(currentQuestion)}
                  value={currentSel.selectedAnswer}
                  onChange={(e) => updateAnswer(currentQuestion.id, e.target.value)}
                  placeholder="Type numeric answer..."
                  className="w-full px-4 py-3 text-lg font-mono font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Question Footer Navigation */}
          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => navigateToQuestion(currentIndex - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </button>
              <button
                type="button"
                disabled={!currentSel.selectedAnswer}
                onClick={() => updateAnswer(currentQuestion.id, '')}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clear
              </button>
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                type="button"
                onClick={() => navigateToQuestion(currentIndex + 1)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors"
              >
                Save & Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSubmitOpen(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors"
              >
                Finish & Submit
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Question Navigation Palette */}
        <aside
          className={`lg:col-span-4 bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-5 ${
            paletteOpenMobile ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Question Palette</h3>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {summaryCounts.totalAnswered}/{questions.length} Answered
            </span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const s = selections[q.id];
              const isCurrent = idx === currentIndex;
              const hasAns = Boolean(s?.selectedAnswer?.trim());
              const isMarked = Boolean(s?.markedForReview);
              const isVisited = Boolean(s?.visited);

              let styleClass =
                'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700';
              if (hasAns && isMarked) {
                styleClass = 'bg-emerald-600 text-white border-amber-400 ring-2 ring-amber-400/60';
              } else if (hasAns) {
                styleClass = 'bg-emerald-600 text-white border-emerald-600';
              } else if (isMarked) {
                styleClass = 'bg-amber-500 text-white border-amber-500';
              } else if (isVisited) {
                styleClass = 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800';
              }

              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => navigateToQuestion(idx)}
                  aria-label={`Question ${idx + 1}${hasAns ? ' answered' : ''}${isMarked ? ' marked for review' : ''}`}
                  className={`h-10 rounded-xl border text-xs font-bold font-mono tabular-nums relative transition-transform ${styleClass} ${
                    isCurrent ? 'ring-2 ring-indigo-600 dark:ring-indigo-400 scale-105' : ''
                  }`}
                >
                  {idx + 1}
                  {isMarked && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-300 border border-white dark:border-slate-900" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explicit Legend with Labels */}
          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 inline-block shrink-0" />
              <span>Answered ({summaryCounts.answered})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-amber-500 inline-block shrink-0" />
              <span>Review ({summaryCounts.marked})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-emerald-600 ring-2 ring-amber-400 inline-block shrink-0" />
              <span>Ans + Review ({summaryCounts.answeredAndMarked})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded bg-slate-200 dark:bg-slate-700 inline-block shrink-0" />
              <span>Not Answered ({summaryCounts.notVisited + summaryCounts.unansweredVisited})</span>
            </div>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-5 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submit Official Event Test?</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Once submitted, your answers are locked for ranking and cannot be re-attempted.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center font-mono tabular-nums">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40">
                <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                  {summaryCounts.totalAnswered}
                </div>
                <div className="text-[11px] font-sans text-slate-600 dark:text-slate-400">Answered</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40">
                <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                  {summaryCounts.totalMarked}
                </div>
                <div className="text-[11px] font-sans text-slate-600 dark:text-slate-400">Marked</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                <div className="text-lg font-bold text-slate-700 dark:text-slate-200">
                  {questions.length - summaryCounts.totalAnswered}
                </div>
                <div className="text-[11px] font-sans text-slate-600 dark:text-slate-400">Unanswered</div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmSubmitOpen(false)}
                className="px-4 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                Continue Test
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleFinalSubmit()}
                className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
