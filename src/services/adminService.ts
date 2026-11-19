import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  SEED_CATEGORIES,
  SEED_GENERATOR_CONFIGS,
  SEED_QUESTIONS,
  SEED_TOPICS,
} from '../data/seedQuestionBank';
import { db as firestoreDb, handleFirestoreError, OperationType } from '../firebase';
import type {
  AppConfig,
  AppPromoSettings,
  Category,
  GeneratorConfig,
  PracticeSession,
  Question,
  ReportedQuestion,
  SocialLinksConfig,
  Topic,
  UserProfile,
} from '../types/math';

export async function verifyAdminAccess(
  uid: string,
  email?: string | null,
  emailVerified?: boolean
): Promise<boolean> {
  if (!emailVerified) {
    return false;
  }
  if (email && email.toLowerCase() === 'hashishpunia@gmail.com') {
    return true;
  }
  try {
    const snap = await getDoc(doc(firestoreDb, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export const OFFICIAL_URL_STORAGE_KEY = 'sankhyaprep_official_download_url';
export const APP_PROMO_STORAGE_KEY = 'sankhyaprep_app_promo_settings_v1';
export const SOCIAL_LINKS_STORAGE_KEY = 'sankhyaprep_social_links_v2';

export function getFallbackDownloadUrl(): string {
  try {
    const cached = localStorage.getItem(OFFICIAL_URL_STORAGE_KEY);
    if (cached && cached.trim()) return cached.trim();
  } catch {
    // ignore storage access issues
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://sankhyaprep.app';
}

export function getDefaultAppPromoSettings(): import('../types/math').AppPromoSettings {
  return {
    enabled: true,
    title: 'Get the SankhyaPrep App',
    subtitle: 'Faster offline speed-math drills & instant live test alerts',
    ctaLabel: 'Open in App',
    officialDownloadUrl: getFallbackDownloadUrl(),
    appDeepLinkUrl: '',
    mobileOnly: true,
  };
}

export function normalizeAppPromoSettings(
  data?: Partial<AppConfig> | null
): import('../types/math').AppPromoSettings {
  const defaults = getDefaultAppPromoSettings();
  if (!data) return defaults;
  const dlUrl =
    typeof data.officialDownloadUrl === 'string' && data.officialDownloadUrl.trim()
      ? data.officialDownloadUrl.trim().slice(0, 500)
      : defaults.officialDownloadUrl;
  return {
    enabled: typeof data.appPromoEnabled === 'boolean' ? data.appPromoEnabled : defaults.enabled,
    title:
      typeof data.appPromoTitle === 'string' && data.appPromoTitle.trim()
        ? data.appPromoTitle.trim().slice(0, 100)
        : defaults.title,
    subtitle:
      typeof data.appPromoSubtitle === 'string' && data.appPromoSubtitle.trim()
        ? data.appPromoSubtitle.trim().slice(0, 180)
        : defaults.subtitle,
    ctaLabel:
      typeof data.appPromoCtaLabel === 'string' && data.appPromoCtaLabel.trim()
        ? data.appPromoCtaLabel.trim().slice(0, 40)
        : defaults.ctaLabel,
    officialDownloadUrl: dlUrl,
    appDeepLinkUrl:
      typeof data.appDeepLinkUrl === 'string' ? data.appDeepLinkUrl.trim().slice(0, 500) : '',
    mobileOnly:
      typeof data.appPromoMobileOnly === 'boolean' ? data.appPromoMobileOnly : defaults.mobileOnly,
  };
}

export function cacheAppPromoSettings(cfg: import('../types/math').AppPromoSettings): void {
  try {
    localStorage.setItem(APP_PROMO_STORAGE_KEY, JSON.stringify(cfg));
    if (cfg.officialDownloadUrl.trim()) {
      localStorage.setItem(OFFICIAL_URL_STORAGE_KEY, cfg.officialDownloadUrl.trim());
    } else {
      localStorage.removeItem(OFFICIAL_URL_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getCachedAppPromoSettings(): import('../types/math').AppPromoSettings {
  const defaults = getDefaultAppPromoSettings();
  try {
    const raw = localStorage.getItem(APP_PROMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<import('../types/math').AppPromoSettings>;
      return {
        enabled: typeof parsed.enabled === 'boolean' ? parsed.enabled : defaults.enabled,
        title: parsed.title?.trim() || defaults.title,
        subtitle: parsed.subtitle?.trim() || defaults.subtitle,
        ctaLabel: parsed.ctaLabel?.trim() || defaults.ctaLabel,
        officialDownloadUrl: parsed.officialDownloadUrl?.trim() || defaults.officialDownloadUrl,
        appDeepLinkUrl: parsed.appDeepLinkUrl?.trim() || '',
        mobileOnly:
          typeof parsed.mobileOnly === 'boolean' ? parsed.mobileOnly : defaults.mobileOnly,
      };
    }
  } catch {
    // ignore storage errors
  }
  return defaults;
}

export async function fetchAppPromoSettings(): Promise<import('../types/math').AppPromoSettings> {
  try {
    const snap = await getDoc(doc(firestoreDb, 'app_config', 'global'));
    if (snap.exists()) {
      const normalized = normalizeAppPromoSettings(snap.data() as Partial<AppConfig>);
      cacheAppPromoSettings(normalized);
      return normalized;
    }
  } catch {
    // offline or uninitialized app_config/global
  }
  return getCachedAppPromoSettings();
}

export async function fetchOfficialDownloadUrl(): Promise<string> {
  const promo = await fetchAppPromoSettings();
  return promo.officialDownloadUrl || getFallbackDownloadUrl();
}

export async function updateAppDistributionConfigCloud(
  adminUid: string,
  next: import('../types/math').AppPromoSettings
): Promise<import('../types/math').AppPromoSettings> {
  const cleanDownloadUrl = next.officialDownloadUrl.trim().slice(0, 500);
  const cleanDeepLink = next.appDeepLinkUrl.trim().slice(0, 500);
  const cleanTitle = (next.title.trim() || 'Get the SankhyaPrep App').slice(0, 100);
  const cleanSubtitle = (
    next.subtitle.trim() || 'Faster offline speed-math drills & instant live test alerts'
  ).slice(0, 180);
  const cleanCtaLabel = (next.ctaLabel.trim() || 'Open in App').slice(0, 40);

  const payload = {
    officialDownloadUrl: cleanDownloadUrl,
    appPromoEnabled: Boolean(next.enabled),
    appPromoTitle: cleanTitle,
    appPromoSubtitle: cleanSubtitle,
    appPromoCtaLabel: cleanCtaLabel,
    appDeepLinkUrl: cleanDeepLink,
    appPromoMobileOnly: Boolean(next.mobileOnly),
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(firestoreDb, 'app_config', 'global');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: 'global',
        contentVersion: 1,
        maintenanceMode: false,
        lastPublishNote: 'Updated app promotion banner & download link',
        ...payload,
      });
    } else {
      await updateDoc(ref, payload);
    }
    const saved: import('../types/math').AppPromoSettings = {
      enabled: Boolean(next.enabled),
      title: cleanTitle,
      subtitle: cleanSubtitle,
      ctaLabel: cleanCtaLabel,
      officialDownloadUrl: cleanDownloadUrl || getFallbackDownloadUrl(),
      appDeepLinkUrl: cleanDeepLink,
      mobileOnly: Boolean(next.mobileOnly),
    };
    cacheAppPromoSettings(saved);
    return saved;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'app_config/global');
  }
}

export async function updateOfficialDownloadUrlCloud(
  adminUid: string,
  officialDownloadUrl: string
): Promise<string> {
  const current = getCachedAppPromoSettings();
  const saved = await updateAppDistributionConfigCloud(adminUid, {
    ...current,
    officialDownloadUrl,
  });
  return saved.officialDownloadUrl || getFallbackDownloadUrl();
}

export function getDefaultSocialLinks(): SocialLinksConfig {
  return {
    instagramUrl: 'https://instagram.com/sankhyaprep',
    telegramUrl: 'https://t.me/sankhyaprep',
    twitterUrl: 'https://x.com/sankhyaprep',
    youtubeUrl: 'https://youtube.com/@sankhyaprep',
    whatsappUrl: '',
    websiteUrl: 'https://sankhyaprep.app',
  };
}

export function normalizeSocialLinks(data?: Partial<AppConfig> | null): SocialLinksConfig {
  const defaults = getDefaultSocialLinks();
  if (!data) return defaults;
  return {
    instagramUrl:
      typeof data.socialInstagramUrl === 'string'
        ? data.socialInstagramUrl.trim().slice(0, 500)
        : defaults.instagramUrl,
    telegramUrl:
      typeof data.socialTelegramUrl === 'string'
        ? data.socialTelegramUrl.trim().slice(0, 500)
        : defaults.telegramUrl,
    twitterUrl:
      typeof data.socialTwitterUrl === 'string'
        ? data.socialTwitterUrl.trim().slice(0, 500)
        : defaults.twitterUrl,
    youtubeUrl:
      typeof data.socialYoutubeUrl === 'string'
        ? data.socialYoutubeUrl.trim().slice(0, 500)
        : defaults.youtubeUrl,
    whatsappUrl:
      typeof data.socialWhatsappUrl === 'string'
        ? data.socialWhatsappUrl.trim().slice(0, 500)
        : defaults.whatsappUrl,
    websiteUrl:
      typeof data.socialWebsiteUrl === 'string'
        ? data.socialWebsiteUrl.trim().slice(0, 500)
        : defaults.websiteUrl,
  };
}

export function cacheSocialLinks(links: SocialLinksConfig): void {
  try {
    localStorage.setItem(SOCIAL_LINKS_STORAGE_KEY, JSON.stringify(links));
  } catch {
    // ignore storage errors
  }
}

export function getCachedSocialLinks(): SocialLinksConfig {
  const defaults = getDefaultSocialLinks();
  try {
    const raw = localStorage.getItem(SOCIAL_LINKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SocialLinksConfig>;
      return {
        instagramUrl:
          typeof parsed.instagramUrl === 'string' ? parsed.instagramUrl.trim() : defaults.instagramUrl,
        telegramUrl:
          typeof parsed.telegramUrl === 'string' ? parsed.telegramUrl.trim() : defaults.telegramUrl,
        twitterUrl:
          typeof parsed.twitterUrl === 'string' ? parsed.twitterUrl.trim() : defaults.twitterUrl,
        youtubeUrl:
          typeof parsed.youtubeUrl === 'string' ? parsed.youtubeUrl.trim() : defaults.youtubeUrl,
        whatsappUrl:
          typeof parsed.whatsappUrl === 'string' ? parsed.whatsappUrl.trim() : defaults.whatsappUrl,
        websiteUrl:
          typeof parsed.websiteUrl === 'string' ? parsed.websiteUrl.trim() : defaults.websiteUrl,
      };
    }
  } catch {
    // ignore storage errors
  }
  return defaults;
}

export async function fetchSocialLinks(): Promise<SocialLinksConfig> {
  try {
    const snap = await getDoc(doc(firestoreDb, 'app_config', 'global'));
    if (snap.exists()) {
      const normalized = normalizeSocialLinks(snap.data() as Partial<AppConfig>);
      cacheSocialLinks(normalized);
      return normalized;
    }
  } catch {
    // offline or uninitialized
  }
  return getCachedSocialLinks();
}

export async function updateSocialLinksCloud(
  adminUid: string,
  next: SocialLinksConfig
): Promise<SocialLinksConfig> {
  const clean: SocialLinksConfig = {
    instagramUrl: next.instagramUrl.trim().slice(0, 500),
    telegramUrl: next.telegramUrl.trim().slice(0, 500),
    twitterUrl: next.twitterUrl.trim().slice(0, 500),
    youtubeUrl: next.youtubeUrl.trim().slice(0, 500),
    whatsappUrl: next.whatsappUrl.trim().slice(0, 500),
    websiteUrl: next.websiteUrl.trim().slice(0, 500),
  };

  const payload = {
    socialInstagramUrl: clean.instagramUrl,
    socialTelegramUrl: clean.telegramUrl,
    socialTwitterUrl: clean.twitterUrl,
    socialYoutubeUrl: clean.youtubeUrl,
    socialWhatsappUrl: clean.whatsappUrl,
    socialWebsiteUrl: clean.websiteUrl,
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  };

  const ref = doc(firestoreDb, 'app_config', 'global');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: 'global',
        contentVersion: 1,
        maintenanceMode: false,
        lastPublishNote: 'Updated social media links',
        ...payload,
      });
    } else {
      await updateDoc(ref, payload);
    }
    cacheSocialLinks(clean);
    return clean;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'app_config/global');
  }
}

export async function bumpContentVersion(adminUid: string, note: string): Promise<number> {
  const ref = doc(firestoreDb, 'app_config', 'global');
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        id: 'global',
        contentVersion: 2,
        maintenanceMode: false,
        lastPublishNote: note.slice(0, 300),
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
      return 2;
    }
    const prev = snap.data().contentVersion ?? 1;
    const next = prev + 1;
    await updateDoc(ref, {
      contentVersion: increment(1),
      lastPublishNote: note.slice(0, 300),
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
    return next;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'app_config/global');
  }
}

export async function fetchAdminOverviewData(): Promise<{
  users: UserProfile[];
  categories: Category[];
  topics: Topic[];
  questions: Question[];
  generatorConfigs: GeneratorConfig[];
  sessions: PracticeSession[];
  reports: ReportedQuestion[];
  appConfig: AppConfig | null;
}> {
  try {
    const [uSnap, cSnap, tSnap, qSnap, gSnap, sSnap, rSnap, cfgSnap] = await Promise.all([
      getDocs(collection(firestoreDb, 'users')),
      getDocs(collection(firestoreDb, 'categories')),
      getDocs(collection(firestoreDb, 'topics')),
      getDocs(collection(firestoreDb, 'questions')),
      getDocs(collection(firestoreDb, 'generator_configs')),
      getDocs(collection(firestoreDb, 'practice_sessions')),
      getDocs(collection(firestoreDb, 'reported_questions')),
      getDoc(doc(firestoreDb, 'app_config', 'global')),
    ]);

    return {
      users: uSnap.docs.map((d) => d.data() as UserProfile),
      categories: cSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Category)).sort((a, b) => a.order - b.order),
      topics: tSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Topic)).sort((a, b) => a.order - b.order),
      questions: qSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Question)),
      generatorConfigs: gSnap.docs.map((d) => ({ ...d.data(), id: d.id } as GeneratorConfig)),
      sessions: sSnap.docs.map((d) => ({ ...d.data(), id: d.id } as PracticeSession)),
      reports: rSnap.docs.map((d) => ({ ...d.data(), id: d.id } as ReportedQuestion)),
      appConfig: cfgSnap.exists() ? (cfgSnap.data() as AppConfig) : null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin_overview');
  }
}

export async function publishSeedCatalogToCloud(adminUid: string): Promise<void> {
  try {
    // 1. Write categories first so exists() checks on topics/questions succeed
    const catBatch = writeBatch(firestoreDb);
    for (const c of SEED_CATEGORIES) {
      catBatch.set(doc(firestoreDb, 'categories', c.id), {
        id: c.id,
        name: c.name,
        nameHi: c.nameHi,
        description: c.description,
        descriptionHi: c.descriptionHi,
        icon: c.icon,
        order: c.order,
        active: c.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await catBatch.commit();

    // 2. Write topics next
    const topBatch = writeBatch(firestoreDb);
    for (const t of SEED_TOPICS) {
      topBatch.set(doc(firestoreDb, 'topics', t.id), {
        id: t.id,
        categoryId: t.categoryId,
        name: t.name,
        nameHi: t.nameHi,
        description: t.description,
        descriptionHi: t.descriptionHi,
        defaultDifficulty: t.defaultDifficulty,
        defaultQuestionCount: t.defaultQuestionCount,
        defaultTimeLimitSec: t.defaultTimeLimitSec,
        supportsGenerator: t.supportsGenerator,
        order: t.order,
        active: t.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await topBatch.commit();

    // 3. Write generator configs & questions
    const qBatch = writeBatch(firestoreDb);
    for (const g of SEED_GENERATOR_CONFIGS) {
      qBatch.set(doc(firestoreDb, 'generator_configs', g.id), {
        ...g,
        updatedBy: adminUid,
        updatedAt: serverTimestamp(),
      });
    }
    for (const q of SEED_QUESTIONS) {
      const { source: _src, columnTerms: _col, createdAtIso: _c, updatedAtIso: _u, ...cleanQ } = q;
      qBatch.set(doc(firestoreDb, 'questions', q.id), {
        ...cleanQ,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await qBatch.commit();

    await bumpContentVersion(adminUid, 'Initialized cloud catalog with seed curriculum');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_catalog');
  }
}

export async function saveCategoryCloud(cat: Category, isNew: boolean, adminUid: string): Promise<void> {
  try {
    const ref = doc(firestoreDb, 'categories', cat.id);
    if (isNew) {
      await setDoc(ref, {
        id: cat.id,
        name: cat.name,
        nameHi: cat.nameHi,
        description: cat.description,
        descriptionHi: cat.descriptionHi,
        icon: cat.icon,
        order: cat.order,
        active: cat.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: cat.name,
        nameHi: cat.nameHi,
        description: cat.description,
        descriptionHi: cat.descriptionHi,
        icon: cat.icon,
        order: cat.order,
        active: cat.active,
        updatedAt: serverTimestamp(),
      });
    }
    await bumpContentVersion(adminUid, `Category updated: ${cat.name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `categories/${cat.id}`);
  }
}

export async function deleteCategoryCloud(categoryId: string, adminUid: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb, 'categories', categoryId));
    await bumpContentVersion(adminUid, `Category deleted: ${categoryId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
  }
}

export async function saveTopicCloud(topic: Topic, isNew: boolean, adminUid: string): Promise<void> {
  try {
    const ref = doc(firestoreDb, 'topics', topic.id);
    if (isNew) {
      await setDoc(ref, {
        id: topic.id,
        categoryId: topic.categoryId,
        name: topic.name,
        nameHi: topic.nameHi,
        description: topic.description,
        descriptionHi: topic.descriptionHi,
        defaultDifficulty: topic.defaultDifficulty,
        defaultQuestionCount: topic.defaultQuestionCount,
        defaultTimeLimitSec: topic.defaultTimeLimitSec,
        supportsGenerator: topic.supportsGenerator,
        order: topic.order,
        active: topic.active,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        categoryId: topic.categoryId,
        name: topic.name,
        nameHi: topic.nameHi,
        description: topic.description,
        descriptionHi: topic.descriptionHi,
        defaultDifficulty: topic.defaultDifficulty,
        defaultQuestionCount: topic.defaultQuestionCount,
        defaultTimeLimitSec: topic.defaultTimeLimitSec,
        supportsGenerator: topic.supportsGenerator,
        order: topic.order,
        active: topic.active,
        updatedAt: serverTimestamp(),
      });
    }
    await bumpContentVersion(adminUid, `Topic updated: ${topic.name}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `topics/${topic.id}`);
  }
}

export async function deleteTopicCloud(topicId: string, adminUid: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb, 'topics', topicId));
    await bumpContentVersion(adminUid, `Topic deleted: ${topicId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `topics/${topicId}`);
  }
}

export async function saveQuestionCloud(question: Question, isNew: boolean, adminUid: string): Promise<void> {
  try {
    const ref = doc(firestoreDb, 'questions', question.id);
    if (isNew) {
      await setDoc(ref, {
        id: question.id,
        categoryId: question.categoryId,
        topicId: question.topicId,
        questionText: question.questionText,
        questionTextHi: question.questionTextHi ?? '',
        questionType: question.questionType,
        difficulty: question.difficulty,
        correctAnswer: question.correctAnswer,
        options: question.options,
        explanation: question.explanation,
        explanationHi: question.explanationHi ?? '',
        marks: question.marks,
        timeRecommendationSec: question.timeRecommendationSec,
        active: question.active,
        contentVersion: question.contentVersion,
        createdBy: adminUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        categoryId: question.categoryId,
        topicId: question.topicId,
        questionText: question.questionText,
        questionTextHi: question.questionTextHi ?? '',
        questionType: question.questionType,
        difficulty: question.difficulty,
        correctAnswer: question.correctAnswer,
        options: question.options,
        explanation: question.explanation,
        explanationHi: question.explanationHi ?? '',
        marks: question.marks,
        timeRecommendationSec: question.timeRecommendationSec,
        active: question.active,
        contentVersion: question.contentVersion,
        updatedAt: serverTimestamp(),
      });
    }
    await bumpContentVersion(adminUid, `Question ${isNew ? 'added' : 'updated'}: ${question.id}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `questions/${question.id}`);
  }
}

export async function deleteQuestionCloud(questionId: string, adminUid: string): Promise<void> {
  try {
    await deleteDoc(doc(firestoreDb, 'questions', questionId));
    await bumpContentVersion(adminUid, `Question deleted: ${questionId}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `questions/${questionId}`);
  }
}

export async function bulkImportQuestionsCloud(
  questions: Question[],
  adminUid: string
): Promise<{ succeeded: number; failed: Array<{ id: string; reason: string }> }> {
  const failed: Array<{ id: string; reason: string }> = [];
  let succeeded = 0;

  // Commit in chunks of 400 (Firestore batch limit is 500)
  const chunkSize = 400;
  for (let i = 0; i < questions.length; i += chunkSize) {
    const chunk = questions.slice(i, i + chunkSize);
    try {
      const batch = writeBatch(firestoreDb);
      for (const q of chunk) {
        batch.set(doc(firestoreDb, 'questions', q.id), {
          id: q.id,
          categoryId: q.categoryId,
          topicId: q.topicId,
          questionText: q.questionText,
          questionTextHi: q.questionTextHi ?? '',
          questionType: q.questionType,
          difficulty: q.difficulty,
          correctAnswer: q.correctAnswer,
          options: q.options,
          explanation: q.explanation,
          explanationHi: q.explanationHi ?? '',
          marks: q.marks,
          timeRecommendationSec: q.timeRecommendationSec,
          active: q.active,
          contentVersion: q.contentVersion,
          createdBy: adminUid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      succeeded += chunk.length;
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Batch write failed';
      for (const q of chunk) {
        failed.push({ id: q.id, reason });
      }
    }
  }

  if (succeeded > 0) {
    await bumpContentVersion(adminUid, `Bulk imported ${succeeded} questions`);
  }

  return { succeeded, failed };
}

export async function saveGeneratorConfigCloud(cfg: GeneratorConfig, adminUid: string): Promise<void> {
  try {
    await setDoc(doc(firestoreDb, 'generator_configs', cfg.id), {
      ...cfg,
      updatedBy: adminUid,
      updatedAt: serverTimestamp(),
    });
    await bumpContentVersion(adminUid, `Generator config updated: ${cfg.topicKey}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `generator_configs/${cfg.id}`);
  }
}

export async function resolveReportCloud(reportId: string, status: 'open' | 'resolved'): Promise<void> {
  try {
    await updateDoc(doc(firestoreDb, 'reported_questions', reportId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `reported_questions/${reportId}`);
  }
}
