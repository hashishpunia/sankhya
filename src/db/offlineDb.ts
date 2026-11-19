import { openDB, type DBSchema, type IDBPDatabase, type StoreNames } from 'idb';
import {
  SEED_CATEGORIES,
  SEED_GENERATOR_CONFIGS,
  SEED_QUESTIONS,
  SEED_TOPICS,
} from '../data/seedQuestionBank';
import type {
  Category,
  DailyActivity,
  GeneratorConfig,
  PendingSyncRecord,
  PracticeSession,
  Question,
  ReportedQuestion,
  SyncMetadata,
  Topic,
  UserAnswer,
  UserSettings,
  UserStatistics,
} from '../types/math';

interface MathPlatformDB extends DBSchema {
  categories: { key: string; value: Category };
  topics: { key: string; value: Topic };
  questions: { key: string; value: Question };
  generator_configs: { key: string; value: GeneratorConfig };
  practice_sessions: { key: string; value: PracticeSession };
  user_answers: { key: string; value: UserAnswer };
  user_statistics: { key: string; value: UserStatistics };
  daily_activity: { key: string; value: DailyActivity };
  user_settings: { key: string; value: UserSettings };
  pending_sync_records: { key: string; value: PendingSyncRecord };
  sync_metadata: { key: string; value: SyncMetadata };
  reported_questions: { key: string; value: ReportedQuestion };
}

const DB_NAME = 'sankhyaprep_offline_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MathPlatformDB>> | null = null;

export function getDb(): Promise<IDBPDatabase<MathPlatformDB>> {
  if (!dbPromise) {
    dbPromise = openDB<MathPlatformDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const stores: Array<StoreNames<MathPlatformDB>> = [
          'categories',
          'topics',
          'questions',
          'generator_configs',
          'practice_sessions',
          'user_answers',
          'user_statistics',
          'daily_activity',
          'user_settings',
          'pending_sync_records',
          'sync_metadata',
          'reported_questions',
        ];
        for (const name of stores) {
          if (!db.objectStoreNames.contains(name)) {
            const keyPath = name === 'user_statistics' || name === 'user_settings' ? 'userId' : 'id';
            db.createObjectStore(name, { keyPath });
          }
        }
      },
    });
  }
  return dbPromise;
}

export function getLocalDateStr(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function initializeOfflineDb(): Promise<void> {
  const db = await getDb();
  const existingCats = await db.count('categories');
  if (existingCats === 0) {
    const tx = db.transaction(
      ['categories', 'topics', 'questions', 'generator_configs', 'sync_metadata'],
      'readwrite'
    );
    for (const c of SEED_CATEGORIES) await tx.objectStore('categories').put(c);
    for (const t of SEED_TOPICS) await tx.objectStore('topics').put(t);
    for (const q of SEED_QUESTIONS) await tx.objectStore('questions').put(q);
    for (const g of SEED_GENERATOR_CONFIGS) await tx.objectStore('generator_configs').put(g);
    await tx.objectStore('sync_metadata').put({
      id: 'global',
      localContentVersion: 1,
      lastSyncTimeIso: null,
      status: 'synced',
      pendingCount: 0,
    });
    await tx.done;
  }
}

export async function getCatalogFromLocal(): Promise<{
  categories: Category[];
  topics: Topic[];
  questions: Question[];
  generatorConfigs: GeneratorConfig[];
}> {
  const db = await getDb();
  const [categories, topics, questions, generatorConfigs] = await Promise.all([
    db.getAll('categories'),
    db.getAll('topics'),
    db.getAll('questions'),
    db.getAll('generator_configs'),
  ]);
  return {
    categories: categories.sort((a, b) => a.order - b.order),
    topics: topics.sort((a, b) => a.order - b.order),
    questions,
    generatorConfigs,
  };
}

export async function replaceCatalogLocal(data: {
  categories?: Category[];
  topics?: Topic[];
  questions?: Question[];
  generatorConfigs?: GeneratorConfig[];
}): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['categories', 'topics', 'questions', 'generator_configs'], 'readwrite');
  if (data.categories && data.categories.length > 0) {
    await tx.objectStore('categories').clear();
    for (const c of data.categories) await tx.objectStore('categories').put(c);
  }
  if (data.topics && data.topics.length > 0) {
    await tx.objectStore('topics').clear();
    for (const t of data.topics) await tx.objectStore('topics').put(t);
  }
  if (data.questions && data.questions.length > 0) {
    await tx.objectStore('questions').clear();
    for (const q of data.questions) await tx.objectStore('questions').put(q);
  }
  if (data.generatorConfigs && data.generatorConfigs.length > 0) {
    await tx.objectStore('generator_configs').clear();
    for (const g of data.generatorConfigs) await tx.objectStore('generator_configs').put(g);
  }
  await tx.done;
}

export async function getDefaultUserSettings(userId: string): Promise<UserSettings> {
  return {
    userId,
    language: 'en',
    theme: 'light',
    soundEnabled: true,
    vibrationEnabled: true,
    defaultDifficulty: 'medium',
    defaultQuestionCount: 15,
    defaultTimerSec: 300,
    dailyTarget: 30,
    notificationsEnabled: true,
  };
}

export async function getUserSettingsLocal(userId: string): Promise<UserSettings> {
  const db = await getDb();
  const found = await db.get('user_settings', userId);
  if (found) return found;
  const def = await getDefaultUserSettings(userId);
  await db.put('user_settings', def);
  return def;
}

export async function enqueuePendingSync(record: Omit<PendingSyncRecord, 'id' | 'createdAtIso' | 'retryCount'>): Promise<void> {
  const db = await getDb();
  const id = `${record.collection}_${record.docId}`;
  await db.put('pending_sync_records', {
    ...record,
    id,
    createdAtIso: new Date().toISOString(),
    retryCount: 0,
  });
  const pendingCount = await db.count('pending_sync_records');
  const meta = (await db.get('sync_metadata', 'global')) ?? {
    id: 'global',
    localContentVersion: 1,
    lastSyncTimeIso: null,
    status: 'pending' as const,
    pendingCount: 0,
  };
  await db.put('sync_metadata', {
    ...meta,
    pendingCount,
    status: pendingCount > 0 ? 'pending' : meta.status,
  });
}

export async function saveUserSettingsLocal(settings: UserSettings, shouldSync: boolean): Promise<void> {
  const db = await getDb();
  await db.put('user_settings', settings);
  if (shouldSync && settings.userId !== 'guest_local') {
    await enqueuePendingSync({
      collection: 'user_settings',
      docId: settings.userId,
      action: 'upsert',
      payload: { ...settings },
    });
  }
}

export async function savePracticeSessionLocal(session: PracticeSession, shouldSync: boolean): Promise<void> {
  const db = await getDb();
  await db.put('practice_sessions', session);
  if (shouldSync && session.userId !== 'guest_local') {
    const {
      questionsSnapshot: _qSnap,
      answersSnapshot: _aSnap,
      currentIndex: _cIdx,
      instantFeedback: _ifb,
      timed: _tm,
      timeLimitSec: _tls,
      unlimited: _unl,
      ...cloudPayload
    } = session;
    await enqueuePendingSync({
      collection: 'practice_sessions',
      docId: session.id,
      action: 'upsert',
      payload: cloudPayload,
    });
  }
}

export async function deletePracticeSessionLocal(sessionId: string): Promise<void> {
  const db = await getDb();
  await db.delete('practice_sessions', sessionId);
}

export async function saveUserAnswerLocal(answer: UserAnswer, shouldSync: boolean): Promise<void> {
  const db = await getDb();
  await db.put('user_answers', answer);
  if (shouldSync && answer.userId !== 'guest_local') {
    await enqueuePendingSync({
      collection: 'user_answers',
      docId: answer.id,
      action: 'upsert',
      payload: { ...answer },
    });
  }
}

export async function getUserSessionsLocal(userId: string): Promise<PracticeSession[]> {
  const db = await getDb();
  const all = await db.getAll('practice_sessions');
  return all
    .filter((s) => s.userId === userId)
    .sort((a, b) => b.startedAtIso.localeCompare(a.startedAtIso));
}

export async function getUserAnswersLocal(userId: string): Promise<UserAnswer[]> {
  const db = await getDb();
  const all = await db.getAll('user_answers');
  return all.filter((a) => a.userId === userId);
}

export async function getUserStatisticsLocal(userId: string): Promise<UserStatistics> {
  const db = await getDb();
  const found = await db.get('user_statistics', userId);
  if (found) return found;
  return {
    userId,
    totalAttempted: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    totalSkipped: 0,
    totalTimeSec: 0,
    currentStreak: 0,
    longestStreak: 0,
    fastestResponseSec: 0,
    lastPracticeDate: '',
  };
}

export async function getDailyActivitiesLocal(userId: string): Promise<DailyActivity[]> {
  const db = await getDb();
  const all = await db.getAll('daily_activity');
  return all
    .filter((d) => d.userId === userId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function updateStatsAndDailyActivityLocal(
  userId: string,
  session: PracticeSession,
  answers: UserAnswer[],
  shouldSync: boolean
): Promise<{ stats: UserStatistics; daily: DailyActivity }> {
  const db = await getDb();
  const today = getLocalDateStr();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateStr(yesterdayDate);

  const prevStats = await getUserStatisticsLocal(userId);
  let nextStreak = prevStats.currentStreak;
  if (prevStats.lastPracticeDate === today) {
    nextStreak = Math.max(1, prevStats.currentStreak);
  } else if (prevStats.lastPracticeDate === yesterday) {
    nextStreak = prevStats.currentStreak + 1;
  } else {
    nextStreak = 1;
  }

  const validTimes = answers.filter((a) => !a.isSkipped && a.responseTimeSec > 0).map((a) => a.responseTimeSec);
  const minAnswerTime = validTimes.length > 0 ? Math.min(...validTimes) : 0;
  const fastest =
    prevStats.fastestResponseSec === 0
      ? minAnswerTime
      : minAnswerTime > 0
        ? Math.min(prevStats.fastestResponseSec, minAnswerTime)
        : prevStats.fastestResponseSec;

  const updatedStats: UserStatistics = {
    userId,
    totalAttempted: prevStats.totalAttempted + session.attemptedQuestions,
    totalCorrect: prevStats.totalCorrect + session.correctAnswers,
    totalIncorrect: prevStats.totalIncorrect + session.incorrectAnswers,
    totalSkipped: prevStats.totalSkipped + session.skippedQuestions,
    totalTimeSec: prevStats.totalTimeSec + session.totalTimeSec,
    currentStreak: nextStreak,
    longestStreak: Math.max(prevStats.longestStreak, nextStreak),
    fastestResponseSec: Number(fastest.toFixed(2)),
    lastPracticeDate: today,
  };
  await db.put('user_statistics', updatedStats);

  const dailyId = `${userId}_${today}`;
  const prevDaily = await db.get('daily_activity', dailyId);
  const updatedDaily: DailyActivity = {
    id: dailyId,
    userId,
    date: today,
    questionsAttempted: (prevDaily?.questionsAttempted ?? 0) + session.attemptedQuestions,
    correctAnswers: (prevDaily?.correctAnswers ?? 0) + session.correctAnswers,
    practiceTimeSec: (prevDaily?.practiceTimeSec ?? 0) + session.totalTimeSec,
    sessionsCount: (prevDaily?.sessionsCount ?? 0) + 1,
  };
  await db.put('daily_activity', updatedDaily);

  if (shouldSync && userId !== 'guest_local') {
    await enqueuePendingSync({
      collection: 'user_statistics',
      docId: userId,
      action: 'upsert',
      payload: { ...updatedStats },
    });
    await enqueuePendingSync({
      collection: 'daily_activity',
      docId: dailyId,
      action: 'upsert',
      payload: { ...updatedDaily },
    });
  }

  return { stats: updatedStats, daily: updatedDaily };
}

export async function saveReportLocal(report: ReportedQuestion, shouldSync: boolean): Promise<void> {
  const db = await getDb();
  await db.put('reported_questions', report);
  if (shouldSync && report.userId !== 'guest_local') {
    await enqueuePendingSync({
      collection: 'reported_questions',
      docId: report.id,
      action: 'upsert',
      payload: { ...report },
    });
  }
}

export async function getSyncMetadataLocal(): Promise<SyncMetadata> {
  const db = await getDb();
  const meta = await db.get('sync_metadata', 'global');
  const pendingCount = await db.count('pending_sync_records');
  if (meta) return { ...meta, pendingCount };
  return {
    id: 'global',
    localContentVersion: 1,
    lastSyncTimeIso: null,
    status: pendingCount > 0 ? 'pending' : 'synced',
    pendingCount,
  };
}

export async function updateSyncMetadataLocal(meta: SyncMetadata): Promise<void> {
  const db = await getDb();
  await db.put('sync_metadata', meta);
}

export async function getGuestProgressCount(): Promise<number> {
  const sessions = await getUserSessionsLocal('guest_local');
  return sessions.length;
}

export async function migrateGuestProgressToUser(targetUserId: string): Promise<number> {
  const db = await getDb();
  const guestSessions = await getUserSessionsLocal('guest_local');
  if (guestSessions.length === 0) return 0;

  const guestAnswers = await getUserAnswersLocal('guest_local');
  const guestDaily = await getDailyActivitiesLocal('guest_local');
  const guestStats = await getUserStatisticsLocal('guest_local');
  const targetStats = await getUserStatisticsLocal(targetUserId);

  for (const s of guestSessions) {
    const migrated: PracticeSession = { ...s, userId: targetUserId };
    await savePracticeSessionLocal(migrated, true);
    await db.delete('practice_sessions', s.id);
  }

  for (const a of guestAnswers) {
    const migratedA: UserAnswer = { ...a, userId: targetUserId };
    await saveUserAnswerLocal(migratedA, true);
    await db.delete('user_answers', a.id);
  }

  for (const d of guestDaily) {
    const targetDailyId = `${targetUserId}_${d.date}`;
    const existingTarget = await db.get('daily_activity', targetDailyId);
    const mergedDaily: DailyActivity = {
      id: targetDailyId,
      userId: targetUserId,
      date: d.date,
      questionsAttempted: (existingTarget?.questionsAttempted ?? 0) + d.questionsAttempted,
      correctAnswers: (existingTarget?.correctAnswers ?? 0) + d.correctAnswers,
      practiceTimeSec: (existingTarget?.practiceTimeSec ?? 0) + d.practiceTimeSec,
      sessionsCount: (existingTarget?.sessionsCount ?? 0) + d.sessionsCount,
    };
    await db.put('daily_activity', mergedDaily);
    await enqueuePendingSync({
      collection: 'daily_activity',
      docId: targetDailyId,
      action: 'upsert',
      payload: { ...mergedDaily },
    });
    await db.delete('daily_activity', d.id);
  }

  const mergedStats: UserStatistics = {
    userId: targetUserId,
    totalAttempted: targetStats.totalAttempted + guestStats.totalAttempted,
    totalCorrect: targetStats.totalCorrect + guestStats.totalCorrect,
    totalIncorrect: targetStats.totalIncorrect + guestStats.totalIncorrect,
    totalSkipped: targetStats.totalSkipped + guestStats.totalSkipped,
    totalTimeSec: targetStats.totalTimeSec + guestStats.totalTimeSec,
    currentStreak: Math.max(targetStats.currentStreak, guestStats.currentStreak),
    longestStreak: Math.max(targetStats.longestStreak, guestStats.longestStreak),
    fastestResponseSec:
      targetStats.fastestResponseSec === 0
        ? guestStats.fastestResponseSec
        : guestStats.fastestResponseSec === 0
          ? targetStats.fastestResponseSec
          : Math.min(targetStats.fastestResponseSec, guestStats.fastestResponseSec),
    lastPracticeDate:
      targetStats.lastPracticeDate > guestStats.lastPracticeDate
        ? targetStats.lastPracticeDate
        : guestStats.lastPracticeDate,
  };
  await db.put('user_statistics', mergedStats);
  await enqueuePendingSync({
    collection: 'user_statistics',
    docId: targetUserId,
    action: 'upsert',
    payload: { ...mergedStats },
  });
  await db.delete('user_statistics', 'guest_local');

  return guestSessions.length;
}

export async function clearAllUserLocalData(userId: string): Promise<void> {
  const db = await getDb();
  const [sessions, answers, daily, pending] = await Promise.all([
    db.getAll('practice_sessions'),
    db.getAll('user_answers'),
    db.getAll('daily_activity'),
    db.getAll('pending_sync_records'),
  ]);
  for (const s of sessions) if (s.userId === userId) await db.delete('practice_sessions', s.id);
  for (const a of answers) if (a.userId === userId) await db.delete('user_answers', a.id);
  for (const d of daily) if (d.userId === userId) await db.delete('daily_activity', d.id);
  for (const p of pending) {
    if (p.payload && (p.payload as { userId?: string }).userId === userId) {
      await db.delete('pending_sync_records', p.id);
    }
  }
  await db.delete('user_statistics', userId);
  await db.delete('user_settings', userId);
}
