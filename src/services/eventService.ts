import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { buildSessionQuestions, verifyAnswer } from '../engine/questionGenerator';
import { db as firestoreDb, handleFirestoreError, OperationType } from '../firebase';
import type {
  EventBannerPreset,
  EventPrize,
  EventQuestionAnswerRecord,
  EventRegistration,
  EventSubmission,
  GeneratorConfig,
  Question,
  TestEvent,
} from '../types/math';

export type EventLifecyclePhase =
  | 'cancelled'
  | 'upcoming_reg_soon'
  | 'reg_open'
  | 'reg_closed_waiting'
  | 'live'
  | 'ended';

export const EVENT_BANNER_PRESETS: Record<
  EventBannerPreset,
  {
    label: string;
    imageSrc?: string;
    gradientClass: string;
    badgeText: string;
  }
> = {
  championship: {
    label: 'Championship Gold & Indigo',
    imageSrc: '/src/assets/images/event_banner_championship_1794818222376.jpg',
    gradientClass: 'from-indigo-900 via-blue-900 to-slate-900',
    badgeText: 'Championship',
  },
  speed_sprint: {
    label: 'Speed Sprint Cyan & Cobalt',
    imageSrc: '/src/assets/images/event_banner_speed_sprint_1794818222364.jpg',
    gradientClass: 'from-slate-900 via-cyan-900 to-emerald-900',
    badgeText: 'Speed Sprint',
  },
  indigo_crown: {
    label: 'Royal Indigo & Violet',
    gradientClass: 'from-indigo-700 via-purple-700 to-blue-800',
    badgeText: 'Grand Mock',
  },
  emerald_math: {
    label: 'Emerald Arithmetic Arena',
    gradientClass: 'from-emerald-700 via-teal-700 to-cyan-800',
    badgeText: 'Open Challenge',
  },
  amber_trophy: {
    label: 'Amber Prize Cup',
    gradientClass: 'from-amber-600 via-orange-600 to-rose-700',
    badgeText: 'Prize Cup',
  },
};

export function getEventBannerVisual(preset: EventBannerPreset, bannerUrl?: string) {
  const cfg = EVENT_BANNER_PRESETS[preset] ?? EVENT_BANNER_PRESETS.championship;
  return {
    ...cfg,
    effectiveImageUrl: bannerUrl?.trim() || cfg.imageSrc || '',
  };
}

function toEpochMs(val: unknown, fallback = 0): number {
  if (!val) return fallback;
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'object' && val !== null && 'toMillis' in val && typeof (val as { toMillis: () => number }).toMillis === 'function') {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = Date.parse(val);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  return fallback;
}

function toIsoStr(val: unknown): string | undefined {
  const ms = toEpochMs(val, 0);
  return ms > 0 ? new Date(ms).toISOString() : undefined;
}

function mapDocToTestEvent(id: string, data: DocumentData): TestEvent {
  return {
    id,
    title: String(data.title ?? ''),
    titleHi: data.titleHi ? String(data.titleHi) : '',
    description: String(data.description ?? ''),
    descriptionHi: data.descriptionHi ? String(data.descriptionHi) : '',
    bannerPreset: (data.bannerPreset as EventBannerPreset) || 'championship',
    bannerUrl: data.bannerUrl ? String(data.bannerUrl) : '',
    regOpenAtMs: toEpochMs(data.regOpenAt),
    regCloseAtMs: toEpochMs(data.regCloseAt),
    startAtMs: toEpochMs(data.startAt),
    endAtMs: toEpochMs(data.endAt),
    durationMin: Number(data.durationMin ?? 30),
    totalQuestions: Number(data.totalQuestions ?? 25),
    topicIds: Array.isArray(data.topicIds) ? data.topicIds.map(String) : ['mixed_arithmetic'],
    difficulty: (data.difficulty as TestEvent['difficulty']) || 'mixed',
    marksPerQuestion: Number(data.marksPerQuestion ?? 2),
    negativeMarking: Number(data.negativeMarking ?? 0.5),
    maxParticipants: Number(data.maxParticipants ?? 0),
    registeredCount: Number(data.registeredCount ?? 0),
    registrationType: data.registrationType === 'paid' ? 'paid' : 'free',
    entryFee: Number(data.entryFee ?? 0),
    currency: String(data.currency ?? 'INR'),
    prizes: Array.isArray(data.prizes) ? (data.prizes as EventPrize[]) : [],
    status: (data.status as TestEvent['status']) || 'draft',
    resultsPublished: Boolean(data.resultsPublished),
    publishedResultCount: Number(data.publishedResultCount ?? 0),
    createdBy: String(data.createdBy ?? ''),
    createdAtIso: toIsoStr(data.createdAt),
    updatedAtIso: toIsoStr(data.updatedAt),
  };
}

function mapDocToRegistration(id: string, data: DocumentData): EventRegistration {
  return {
    id,
    eventId: String(data.eventId ?? ''),
    userId: String(data.userId ?? ''),
    userName: String(data.userName ?? 'Student'),
    userEmail: String(data.userEmail ?? ''),
    targetExam: String(data.targetExam ?? ''),
    registrationType: data.registrationType === 'paid' ? 'paid' : 'free',
    feeAmount: Number(data.feeAmount ?? 0),
    paymentStatus: (data.paymentStatus as EventRegistration['paymentStatus']) || 'free',
    status: data.status === 'cancelled' ? 'cancelled' : 'registered',
    registeredAtIso: toIsoStr(data.registeredAt),
    updatedAtIso: toIsoStr(data.updatedAt),
  };
}

function mapDocToSubmission(id: string, data: DocumentData): EventSubmission {
  return {
    id,
    eventId: String(data.eventId ?? ''),
    eventTitle: String(data.eventTitle ?? ''),
    userId: String(data.userId ?? ''),
    userName: String(data.userName ?? 'Student'),
    totalQuestions: Number(data.totalQuestions ?? 0),
    attemptedQuestions: Number(data.attemptedQuestions ?? 0),
    correctAnswers: Number(data.correctAnswers ?? 0),
    incorrectAnswers: Number(data.incorrectAnswers ?? 0),
    skippedQuestions: Number(data.skippedQuestions ?? 0),
    score: Number(data.score ?? 0),
    maxScore: Number(data.maxScore ?? 0),
    accuracy: Number(data.accuracy ?? 0),
    timeTakenSec: Number(data.timeTakenSec ?? 0),
    markedForReviewCount: Number(data.markedForReviewCount ?? 0),
    answersMap: (data.answersMap as Record<string, EventQuestionAnswerRecord>) || {},
    status: data.status === 'disqualified' ? 'disqualified' : 'submitted',
    rank: Number(data.rank ?? 0),
    isWinnerVerified: Boolean(data.isWinnerVerified),
    prizeTitle: String(data.prizeTitle ?? ''),
    prizeRankLabel: String(data.prizeRankLabel ?? ''),
    prizeStatus: (data.prizeStatus as EventSubmission['prizeStatus']) || 'none',
    resultsPublished: Boolean(data.resultsPublished),
    submittedAtIso: toIsoStr(data.submittedAt),
    updatedAtIso: toIsoStr(data.updatedAt),
  };
}

export function getEventPhase(event: TestEvent, nowMs = Date.now()): EventLifecyclePhase {
  if (event.status === 'cancelled') return 'cancelled';
  if (nowMs >= event.startAtMs && nowMs <= event.endAtMs) return 'live';
  if (nowMs > event.endAtMs) return 'ended';
  if (nowMs < event.regOpenAtMs) return 'upcoming_reg_soon';
  if (nowMs >= event.regOpenAtMs && nowMs <= event.regCloseAtMs) return 'reg_open';
  return 'reg_closed_waiting';
}

export function formatCountdownMs(diffMs: number): string {
  const totalSec = Math.max(0, Math.floor(diffMs / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function computeEventScoreAndBreakdown(
  questions: Question[],
  selections: Record<string, { selectedAnswer: string; markedForReview?: boolean; responseTimeSec?: number }>,
  marksPerQuestion: number,
  negativeMarking: number
): {
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  score: number;
  maxScore: number;
  accuracy: number;
  markedForReviewCount: number;
  answersMap: Record<string, EventQuestionAnswerRecord>;
} {
  let attemptedQuestions = 0;
  let correctAnswers = 0;
  let incorrectAnswers = 0;
  let skippedQuestions = 0;
  let markedForReviewCount = 0;
  let score = 0;

  const answersMap: Record<string, EventQuestionAnswerRecord> = {};

  for (const q of questions) {
    const sel = selections[q.id];
    const selectedAnswer = sel?.selectedAnswer?.trim() ?? '';
    const markedForReview = Boolean(sel?.markedForReview);
    if (markedForReview) markedForReviewCount += 1;

    if (!selectedAnswer) {
      skippedQuestions += 1;
      answersMap[q.id] = {
        selectedAnswer: '',
        isCorrect: false,
        isSkipped: true,
        markedForReview,
        responseTimeSec: Number(sel?.responseTimeSec ?? 0),
      };
    } else {
      attemptedQuestions += 1;
      const isCorrect = verifyAnswer(selectedAnswer, q);
      if (isCorrect) {
        correctAnswers += 1;
        score += marksPerQuestion;
      } else {
        incorrectAnswers += 1;
        score -= negativeMarking;
      }
      answersMap[q.id] = {
        selectedAnswer: selectedAnswer.slice(0, 200),
        isCorrect,
        isSkipped: false,
        markedForReview,
        responseTimeSec: Number(sel?.responseTimeSec ?? 0),
      };
    }
  }

  const totalQuestions = questions.length;
  const maxScore = Number((totalQuestions * marksPerQuestion).toFixed(2));
  const roundedScore = Number(score.toFixed(2));
  const accuracy = attemptedQuestions > 0 ? Math.round((correctAnswers / attemptedQuestions) * 100) : 0;

  return {
    totalQuestions,
    attemptedQuestions,
    correctAnswers,
    incorrectAnswers,
    skippedQuestions,
    score: roundedScore,
    maxScore,
    accuracy,
    markedForReviewCount,
    answersMap,
  };
}

export function rankEventSubmissions(submissions: EventSubmission[], prizes: EventPrize[]): EventSubmission[] {
  const valid = submissions
    .filter((s) => s.status === 'submitted')
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.correctAnswers !== a.correctAnswers) return b.correctAnswers - a.correctAnswers;
      return a.timeTakenSec - b.timeTakenSec;
    });

  const disqualified = submissions.filter((s) => s.status === 'disqualified');

  const rankedValid = valid.map((sub, idx) => {
    const rank = idx + 1;
    const matchedPrize = prizes[idx];
    return {
      ...sub,
      rank,
      prizeRankLabel: sub.prizeRankLabel || (matchedPrize ? matchedPrize.rankLabel : ''),
      prizeTitle: sub.prizeTitle || (matchedPrize ? `${matchedPrize.title}${matchedPrize.valueText ? ` (${matchedPrize.valueText})` : ''}` : ''),
      prizeStatus:
        matchedPrize && sub.prizeStatus === 'none'
          ? ('pending' as const)
          : sub.prizeStatus,
    };
  });

  const unrankedDisq = disqualified.map((sub) => ({
    ...sub,
    rank: 0,
    isWinnerVerified: false,
    prizeStatus: 'none' as const,
    prizeTitle: '',
    prizeRankLabel: '',
  }));

  return [...rankedValid, ...unrankedDisq];
}

function sanitizeQuestionsForFirestore(list: Question[]): Question[] {
  return list.slice(0, 100).map((q) => ({
    id: String(q.id).slice(0, 128),
    categoryId: String(q.categoryId || 'cat_basics').slice(0, 128),
    topicId: String(q.topicId || 'mixed_arithmetic').slice(0, 128),
    questionText: String(q.questionText || '').slice(0, 1000),
    questionTextHi: String(q.questionTextHi || q.questionText || '').slice(0, 1000),
    questionType: q.questionType || 'mcq',
    difficulty: q.difficulty || 'medium',
    correctAnswer: String(q.correctAnswer || '').slice(0, 200),
    options: Array.isArray(q.options) ? q.options.slice(0, 6).map((o) => String(o).slice(0, 200)) : [],
    explanation: String(q.explanation || '').slice(0, 1500),
    explanationHi: String(q.explanationHi || q.explanation || '').slice(0, 1500),
    marks: Number(q.marks ?? 1),
    timeRecommendationSec: Number(q.timeRecommendationSec ?? 30),
    active: true,
    contentVersion: Number(q.contentVersion ?? 1),
    createdBy: String(q.createdBy || 'event_generator').slice(0, 128),
  }));
}

export async function fetchPublishedEvents(): Promise<TestEvent[]> {
  try {
    const q = query(collection(firestoreDb, 'test_events'), where('status', '==', 'published'));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDocToTestEvent(d.id, d.data()))
      .sort((a, b) => a.startAtMs - b.startAtMs);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'test_events');
  }
}

export async function fetchAllEventsAdmin(): Promise<TestEvent[]> {
  try {
    const snap = await getDocs(collection(firestoreDb, 'test_events'));
    return snap.docs
      .map((d) => mapDocToTestEvent(d.id, d.data()))
      .sort((a, b) => b.startAtMs - a.startAtMs);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'test_events');
  }
}

export async function saveEventAndPaperAdmin(
  eventInput: Omit<TestEvent, 'createdAtIso' | 'updatedAtIso'>,
  isNew: boolean,
  adminUid: string,
  bankQuestions: Question[],
  generatorConfigs: GeneratorConfig[],
  regeneratePaper = false
): Promise<void> {
  try {
    const eventRef = doc(firestoreDb, 'test_events', eventInput.id);
    const sanitizedPrizes = eventInput.prizes.slice(0, 10).map((p) => ({
      rankLabel: String(p.rankLabel || '').trim().slice(0, 40),
      title: String(p.title || '').trim().slice(0, 120),
      prizeType: p.prizeType || 'certificate',
      valueText: String(p.valueText || '').trim().slice(0, 60),
    }));

    const payloadBase = {
      title: eventInput.title.trim().slice(0, 120),
      titleHi: (eventInput.titleHi ?? '').trim().slice(0, 140),
      description: eventInput.description.trim().slice(0, 1000),
      descriptionHi: (eventInput.descriptionHi ?? '').trim().slice(0, 1000),
      bannerPreset: eventInput.bannerPreset,
      bannerUrl: (eventInput.bannerUrl ?? '').trim().slice(0, 500),
      regOpenAt: Timestamp.fromMillis(eventInput.regOpenAtMs),
      regCloseAt: Timestamp.fromMillis(eventInput.regCloseAtMs),
      startAt: Timestamp.fromMillis(eventInput.startAtMs),
      endAt: Timestamp.fromMillis(eventInput.endAtMs),
      durationMin: Number(eventInput.durationMin),
      totalQuestions: Number(eventInput.totalQuestions),
      topicIds: eventInput.topicIds.slice(0, 30),
      difficulty: eventInput.difficulty,
      marksPerQuestion: Number(eventInput.marksPerQuestion),
      negativeMarking: Number(eventInput.negativeMarking),
      maxParticipants: Number(eventInput.maxParticipants),
      registrationType: eventInput.registrationType,
      entryFee: eventInput.registrationType === 'paid' ? Number(eventInput.entryFee) : 0,
      currency: (eventInput.currency || 'INR').slice(0, 10),
      prizes: sanitizedPrizes,
      status: eventInput.status,
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      await setDoc(eventRef, {
        ...payloadBase,
        id: eventInput.id,
        registeredCount: 0,
        resultsPublished: false,
        publishedResultCount: 0,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(eventRef, payloadBase);
    }

    if (isNew || regeneratePaper) {
      const built = buildSessionQuestions(
        {
          mode: 'test',
          topicId: eventInput.topicIds[0] || 'mixed_arithmetic',
          topicIds: eventInput.topicIds,
          topicName: eventInput.title,
          difficulty: eventInput.difficulty,
          questionCount: eventInput.totalQuestions,
          timed: true,
          timeLimitSec: eventInput.durationMin * 60,
          questionTypeFilter: 'mcq',
          orderMode: 'random',
          instantFeedback: false,
          marksPerQuestion: eventInput.marksPerQuestion,
          negativeMarking: eventInput.negativeMarking,
        },
        bankQuestions,
        generatorConfigs
      );
      const cleanPaper = sanitizeQuestionsForFirestore(built);
      await setDoc(doc(firestoreDb, 'test_event_papers', eventInput.id), {
        eventId: eventInput.id,
        questions: cleanPaper,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `test_events/${eventInput.id}`);
  }
}

export async function deleteEventAdmin(eventId: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb, 'test_event_papers', eventId));
    await deleteDoc(doc(firestoreDb, 'test_events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `test_events/${eventId}`);
  }
}

export async function fetchEventPaper(eventId: string): Promise<Question[]> {
  try {
    const snap = await getDoc(doc(firestoreDb, 'test_event_papers', eventId));
    if (!snap.exists()) {
      throw new Error('Official test question paper is not available for this event.');
    }
    const data = snap.data();
    return Array.isArray(data.questions) ? (data.questions as Question[]) : [];
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `test_event_papers/${eventId}`);
  }
}

export async function registerForEventAtomic(
  eventId: string,
  user: { uid: string; fullName: string; email: string; targetExam: string }
): Promise<EventRegistration> {
  const regId = `${eventId}_${user.uid}`;
  const eventRef = doc(firestoreDb, 'test_events', eventId);
  const regRef = doc(firestoreDb, 'event_registrations', regId);

  try {
    return await runTransaction(firestoreDb, async (tx) => {
      const eventSnap = await tx.get(eventRef);
      if (!eventSnap.exists()) {
        throw new Error('Test event no longer exists.');
      }
      const existingRegSnap = await tx.get(regRef);
      if (existingRegSnap.exists()) {
        return mapDocToRegistration(existingRegSnap.id, existingRegSnap.data());
      }

      const ev = mapDocToTestEvent(eventSnap.id, eventSnap.data());
      const now = Date.now();
      if (ev.status !== 'published') {
        throw new Error('Registration is closed because this event is not published.');
      }
      if (now < ev.regOpenAtMs) {
        throw new Error('Registration has not opened yet.');
      }
      if (now > ev.regCloseAtMs) {
        throw new Error('Registration window has closed.');
      }
      if (ev.maxParticipants > 0 && ev.registeredCount >= ev.maxParticipants) {
        throw new Error('Maximum participant limit has been reached for this event.');
      }

      const paymentStatus: EventRegistration['paymentStatus'] =
        ev.registrationType === 'free' ? 'free' : 'pending';

      tx.set(regRef, {
        id: regId,
        eventId,
        userId: user.uid,
        userName: (user.fullName || 'Student').trim().slice(0, 120),
        userEmail: (user.email || '').trim().slice(0, 160),
        targetExam: (user.targetExam || '').trim().slice(0, 80),
        registrationType: ev.registrationType,
        feeAmount: ev.registrationType === 'paid' ? ev.entryFee : 0,
        paymentStatus,
        status: 'registered',
        registeredAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      tx.update(eventRef, {
        registeredCount: ev.registeredCount + 1,
        updatedAt: serverTimestamp(),
      });

      return {
        id: regId,
        eventId,
        userId: user.uid,
        userName: user.fullName || 'Student',
        userEmail: user.email || '',
        targetExam: user.targetExam || '',
        registrationType: ev.registrationType,
        feeAmount: ev.registrationType === 'paid' ? ev.entryFee : 0,
        paymentStatus,
        status: 'registered',
        registeredAtIso: new Date().toISOString(),
        updatedAtIso: new Date().toISOString(),
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `event_registrations/${regId}`);
  }
}

export async function cancelRegistrationAtomic(eventId: string, userId: string): Promise<void> {
  const regId = `${eventId}_${userId}`;
  const eventRef = doc(firestoreDb, 'test_events', eventId);
  const regRef = doc(firestoreDb, 'event_registrations', regId);

  try {
    await runTransaction(firestoreDb, async (tx) => {
      const eventSnap = await tx.get(eventRef);
      const regSnap = await tx.get(regRef);
      if (!eventSnap.exists() || !regSnap.exists()) return;
      const ev = mapDocToTestEvent(eventSnap.id, eventSnap.data());
      if (Date.now() >= ev.startAtMs) {
        throw new Error('Cannot cancel registration after the scheduled test has started.');
      }
      tx.delete(regRef);
      tx.update(eventRef, {
        registeredCount: Math.max(0, ev.registeredCount - 1),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `event_registrations/${regId}`);
  }
}

export async function fetchMyEventRegistrations(userId: string): Promise<EventRegistration[]> {
  try {
    const q = query(collection(firestoreDb, 'event_registrations'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToRegistration(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'event_registrations');
  }
}

export async function fetchMyEventSubmissions(userId: string): Promise<EventSubmission[]> {
  try {
    const q = query(collection(firestoreDb, 'event_submissions'), where('userId', '==', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToSubmission(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'event_submissions');
  }
}

export async function fetchEventRegistrationsAdmin(eventId: string): Promise<EventRegistration[]> {
  try {
    const q = query(collection(firestoreDb, 'event_registrations'), where('eventId', '==', eventId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapDocToRegistration(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'event_registrations');
  }
}

export async function updateRegistrationAdmin(
  regId: string,
  patch: Pick<EventRegistration, 'paymentStatus' | 'status'>
): Promise<void> {
  try {
    await updateDoc(doc(firestoreDb, 'event_registrations', regId), {
      paymentStatus: patch.paymentStatus,
      status: patch.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `event_registrations/${regId}`);
  }
}

export async function submitEventAttemptCloud(
  event: TestEvent,
  user: { uid: string; fullName: string },
  questions: Question[],
  selections: Record<string, { selectedAnswer: string; markedForReview?: boolean; responseTimeSec?: number }>,
  timeTakenSec: number
): Promise<EventSubmission> {
  const submissionId = `${event.id}_${user.uid}`;
  const breakdown = computeEventScoreAndBreakdown(
    questions,
    selections,
    event.marksPerQuestion,
    event.negativeMarking
  );

  try {
    const ref = doc(firestoreDb, 'event_submissions', submissionId);
    await setDoc(ref, {
      id: submissionId,
      eventId: event.id,
      eventTitle: event.title.slice(0, 120),
      userId: user.uid,
      userName: (user.fullName || 'Student').trim().slice(0, 120),
      totalQuestions: breakdown.totalQuestions,
      attemptedQuestions: breakdown.attemptedQuestions,
      correctAnswers: breakdown.correctAnswers,
      incorrectAnswers: breakdown.incorrectAnswers,
      skippedQuestions: breakdown.skippedQuestions,
      score: breakdown.score,
      maxScore: breakdown.maxScore,
      accuracy: breakdown.accuracy,
      timeTakenSec: Math.max(0, Math.min(21600, Math.round(timeTakenSec))),
      markedForReviewCount: breakdown.markedForReviewCount,
      answersMap: breakdown.answersMap,
      status: 'submitted',
      rank: 0,
      isWinnerVerified: false,
      prizeTitle: '',
      prizeRankLabel: '',
      prizeStatus: 'none',
      resultsPublished: false,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: submissionId,
      eventId: event.id,
      eventTitle: event.title,
      userId: user.uid,
      userName: user.fullName || 'Student',
      ...breakdown,
      timeTakenSec: Math.round(timeTakenSec),
      status: 'submitted',
      rank: 0,
      isWinnerVerified: false,
      prizeTitle: '',
      prizeRankLabel: '',
      prizeStatus: 'none',
      resultsPublished: false,
      submittedAtIso: new Date().toISOString(),
      updatedAtIso: new Date().toISOString(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `event_submissions/${submissionId}`);
  }
}

export async function fetchEventSubmissionsAdmin(eventId: string): Promise<EventSubmission[]> {
  try {
    const q = query(collection(firestoreDb, 'event_submissions'), where('eventId', '==', eventId));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDocToSubmission(d.id, d.data()))
      .sort((a, b) => {
        if (a.rank > 0 && b.rank > 0) return a.rank - b.rank;
        return b.score - a.score;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'event_submissions');
  }
}

export async function fetchPublishedLeaderboard(eventId: string): Promise<EventSubmission[]> {
  try {
    const q = query(
      collection(firestoreDb, 'event_submissions'),
      where('eventId', '==', eventId),
      where('resultsPublished', '==', true)
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => mapDocToSubmission(d.id, d.data()))
      .filter((s) => s.status === 'submitted')
      .sort((a, b) => {
        if (a.rank > 0 && b.rank > 0) return a.rank - b.rank;
        if (b.score !== a.score) return b.score - a.score;
        return a.timeTakenSec - b.timeTakenSec;
      });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'event_submissions');
  }
}

export async function computeAndSaveEventRankingsAdmin(
  event: TestEvent,
  submissions: EventSubmission[]
): Promise<EventSubmission[]> {
  const ranked = rankEventSubmissions(submissions, event.prizes);
  try {
    for (let i = 0; i < ranked.length; i += 400) {
      const chunk = ranked.slice(i, i + 400);
      const batch = writeBatch(firestoreDb);
      for (const sub of chunk) {
        batch.update(doc(firestoreDb, 'event_submissions', sub.id), {
          rank: sub.rank,
          prizeRankLabel: sub.prizeRankLabel.slice(0, 60),
          prizeTitle: sub.prizeTitle.slice(0, 160),
          prizeStatus: sub.prizeStatus,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
    return ranked;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `event_submissions_rank_${event.id}`);
  }
}

export async function verifyWinnerAdmin(
  submissionId: string,
  patch: Pick<EventSubmission, 'isWinnerVerified' | 'prizeTitle' | 'prizeRankLabel' | 'prizeStatus' | 'status'>
): Promise<void> {
  try {
    await updateDoc(doc(firestoreDb, 'event_submissions', submissionId), {
      isWinnerVerified: patch.isWinnerVerified,
      prizeTitle: patch.prizeTitle.trim().slice(0, 160),
      prizeRankLabel: patch.prizeRankLabel.trim().slice(0, 60),
      prizeStatus: patch.prizeStatus,
      status: patch.status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `event_submissions/${submissionId}`);
  }
}

export async function publishEventResultsAdmin(
  eventId: string,
  submissions: EventSubmission[],
  publishFlag: boolean
): Promise<void> {
  try {
    for (let i = 0; i < submissions.length; i += 400) {
      const chunk = submissions.slice(i, i + 400);
      const batch = writeBatch(firestoreDb);
      for (const sub of chunk) {
        batch.update(doc(firestoreDb, 'event_submissions', sub.id), {
          resultsPublished: publishFlag,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }

    await updateDoc(doc(firestoreDb, 'test_events', eventId), {
      resultsPublished: publishFlag,
      publishedResultCount: publishFlag ? submissions.filter((s) => s.status === 'submitted').length : 0,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `test_events/${eventId}`);
  }
}
