import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  getDb,
  getSyncMetadataLocal,
  replaceCatalogLocal,
  updateSyncMetadataLocal,
} from '../db/offlineDb';
import { db as firestoreDb, handleFirestoreError, OperationType } from '../firebase';
import {
  cacheAppPromoSettings,
  cacheSocialLinks,
  normalizeAppPromoSettings,
  normalizeSocialLinks,
} from './adminService';
import type {
  Category,
  DailyActivity,
  GeneratorConfig,
  PendingSyncRecord,
  PracticeSession,
  Question,
  SyncMetadata,
  Topic,
  UserAnswer,
  UserSettings,
  UserStatistics,
} from '../types/math';

const SYNC_ORDER: Record<PendingSyncRecord['collection'], number> = {
  user_settings: 1,
  practice_sessions: 2,
  user_answers: 3,
  daily_activity: 4,
  user_statistics: 5,
  reported_questions: 6,
};

export async function pullCatalogFromCloud(): Promise<{ updated: boolean; version: number }> {
  const localMeta = await getSyncMetadataLocal();
  let cloudVersion = 1;

  try {
    const cfgSnap = await getDoc(doc(firestoreDb, 'app_config', 'global'));
    if (cfgSnap.exists()) {
      const data = cfgSnap.data();
      cloudVersion = typeof data.contentVersion === 'number' ? data.contentVersion : 1;
      cacheAppPromoSettings(normalizeAppPromoSettings(data));
      cacheSocialLinks(normalizeSocialLinks(data));
    }
  } catch {
    // app_config/global may not be seeded yet if admin hasn't initialized cloud catalog
    return { updated: false, version: localMeta.localContentVersion };
  }

  try {
    const [catSnap, topSnap, qSnap, genSnap] = await Promise.all([
      getDocs(query(collection(firestoreDb, 'categories'), where('active', '==', true))),
      getDocs(query(collection(firestoreDb, 'topics'), where('active', '==', true))),
      getDocs(query(collection(firestoreDb, 'questions'), where('active', '==', true))),
      getDocs(query(collection(firestoreDb, 'generator_configs'), where('enabled', '==', true))),
    ]);

    if (catSnap.empty && topSnap.empty && qSnap.empty) {
      return { updated: false, version: localMeta.localContentVersion };
    }

    const categories: Category[] = catSnap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        name: v.name,
        nameHi: v.nameHi,
        description: v.description ?? '',
        descriptionHi: v.descriptionHi ?? '',
        icon: v.icon ?? 'BookOpen',
        order: v.order ?? 1,
        active: Boolean(v.active),
      };
    });

    const topics: Topic[] = topSnap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        categoryId: v.categoryId,
        name: v.name,
        nameHi: v.nameHi,
        description: v.description ?? '',
        descriptionHi: v.descriptionHi ?? '',
        defaultDifficulty: v.defaultDifficulty ?? 'medium',
        defaultQuestionCount: v.defaultQuestionCount ?? 15,
        defaultTimeLimitSec: v.defaultTimeLimitSec ?? 300,
        supportsGenerator: Boolean(v.supportsGenerator),
        order: v.order ?? 1,
        active: Boolean(v.active),
      };
    });

    const questions: Question[] = qSnap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        categoryId: v.categoryId,
        topicId: v.topicId,
        questionText: v.questionText,
        questionTextHi: v.questionTextHi ?? '',
        questionType: v.questionType,
        difficulty: v.difficulty,
        correctAnswer: v.correctAnswer,
        options: Array.isArray(v.options) ? v.options : [],
        explanation: v.explanation ?? '',
        explanationHi: v.explanationHi ?? '',
        marks: v.marks ?? 1,
        timeRecommendationSec: v.timeRecommendationSec ?? 20,
        active: Boolean(v.active),
        contentVersion: v.contentVersion ?? cloudVersion,
        createdBy: v.createdBy ?? 'admin',
        source: 'bank',
      };
    });

    const generatorConfigs: GeneratorConfig[] = genSnap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        topicKey: v.topicKey,
        minNumber: v.minNumber,
        maxNumber: v.maxNumber,
        digitLength: v.digitLength,
        termCount: v.termCount,
        numeratorMin: v.numeratorMin,
        numeratorMax: v.numeratorMax,
        denominatorMin: v.denominatorMin,
        denominatorMax: v.denominatorMax,
        defaultDifficulty: v.defaultDifficulty,
        enabled: Boolean(v.enabled),
        updatedBy: v.updatedBy ?? 'admin',
      };
    });

    await replaceCatalogLocal({
      categories: categories.length > 0 ? categories : undefined,
      topics: topics.length > 0 ? topics : undefined,
      questions: questions.length > 0 ? questions : undefined,
      generatorConfigs: generatorConfigs.length > 0 ? generatorConfigs : undefined,
    });

    return { updated: true, version: cloudVersion };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'catalog_sync');
  }
}

export async function pullUserProgressFromCloud(userId: string): Promise<void> {
  if (!userId || userId === 'guest_local') return;
  const idb = await getDb();

  try {
    const [sessSnap, ansSnap, dailySnap, statsSnap, settingsSnap] = await Promise.all([
      getDocs(query(collection(firestoreDb, 'practice_sessions'), where('userId', '==', userId))),
      getDocs(query(collection(firestoreDb, 'user_answers'), where('userId', '==', userId))),
      getDocs(query(collection(firestoreDb, 'daily_activity'), where('userId', '==', userId))),
      getDoc(doc(firestoreDb, 'user_statistics', userId)),
      getDoc(doc(firestoreDb, 'user_settings', userId)),
    ]);

    for (const d of sessSnap.docs) {
      const remote = d.data() as PracticeSession;
      const local = await idb.get('practice_sessions', d.id);
      if (!local || (remote.status === 'completed' && local.status !== 'completed')) {
        await idb.put('practice_sessions', { ...remote, id: d.id });
      }
    }

    for (const d of ansSnap.docs) {
      const remote = d.data() as UserAnswer;
      const local = await idb.get('user_answers', d.id);
      if (!local) {
        await idb.put('user_answers', { ...remote, id: d.id });
      }
    }

    for (const d of dailySnap.docs) {
      const remote = d.data() as DailyActivity;
      const local = await idb.get('daily_activity', d.id);
      if (!local || remote.questionsAttempted > local.questionsAttempted) {
        await idb.put('daily_activity', { ...remote, id: d.id });
      }
    }

    if (statsSnap.exists()) {
      const remoteStats = statsSnap.data() as UserStatistics;
      const localStats = await idb.get('user_statistics', userId);
      if (!localStats || remoteStats.totalAttempted > localStats.totalAttempted) {
        await idb.put('user_statistics', { ...remoteStats, userId });
      }
    }

    if (settingsSnap.exists()) {
      const remoteSettings = settingsSnap.data() as UserSettings;
      const localSettings = await idb.get('user_settings', userId);
      if (!localSettings) {
        await idb.put('user_settings', { ...remoteSettings, userId });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `user_sync/${userId}`);
  }
}

export async function flushPendingSyncRecords(): Promise<{ synced: number; failed: number }> {
  const idb = await getDb();
  const pending = (await idb.getAll('pending_sync_records')).sort(
    (a, b) => (SYNC_ORDER[a.collection] ?? 99) - (SYNC_ORDER[b.collection] ?? 99)
  );

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const ref = doc(firestoreDb, item.collection, item.docId);
      const cleanPayload = { ...item.payload };
      if (item.collection === 'reported_questions') {
        await setDoc(
          ref,
          {
            ...cleanPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } else {
        await setDoc(
          ref,
          {
            ...cleanPayload,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }
      await idb.delete('pending_sync_records', item.id);
      synced++;
    } catch (err) {
      failed++;
      await idb.put('pending_sync_records', {
        ...item,
        retryCount: item.retryCount + 1,
        lastError: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { synced, failed };
}

export async function runFullCloudSync(userId: string | null): Promise<SyncMetadata> {
  const currentMeta = await getSyncMetadataLocal();
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineMeta: SyncMetadata = {
      ...currentMeta,
      status: currentMeta.pendingCount > 0 ? 'pending' : 'failed',
      lastError: 'Device is offline. Local data remains available.',
    };
    await updateSyncMetadataLocal(offlineMeta);
    return offlineMeta;
  }

  await updateSyncMetadataLocal({
    ...currentMeta,
    status: 'syncing',
    lastError: undefined,
  });

  try {
    let failedCount = 0;
    if (userId && userId !== 'guest_local') {
      const flushRes = await flushPendingSyncRecords();
      failedCount = flushRes.failed;
      await pullUserProgressFromCloud(userId);
    }

    const catalogRes = await pullCatalogFromCloud();
    const idb = await getDb();
    const remainingPending = await idb.count('pending_sync_records');

    const finalMeta: SyncMetadata = {
      id: 'global',
      localContentVersion: catalogRes.version,
      lastSyncTimeIso: new Date().toISOString(),
      status: failedCount > 0 ? 'failed' : remainingPending > 0 ? 'pending' : 'synced',
      pendingCount: remainingPending,
      lastError: failedCount > 0 ? `${failedCount} record(s) queued for retry.` : undefined,
    };
    await updateSyncMetadataLocal(finalMeta);
    return finalMeta;
  } catch (err) {
    const idb = await getDb();
    const remainingPending = await idb.count('pending_sync_records');
    const errMeta: SyncMetadata = {
      ...currentMeta,
      status: 'failed',
      pendingCount: remainingPending,
      lastError: err instanceof Error ? err.message : 'Sync failed',
    };
    await updateSyncMetadataLocal(errMeta);
    return errMeta;
  }
}
