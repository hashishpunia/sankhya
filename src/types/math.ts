export type Language = 'en' | 'hi';
export type ThemeMode = 'light' | 'dark' | 'system';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type SessionDifficulty = Difficulty | 'mixed';
export type PracticeMode = 'quick_recall' | 'basics' | 'practice' | 'test';

export type QuestionType =
  | 'direct'
  | 'mcq'
  | 'fill_blank'
  | 'missing_number'
  | 'reverse'
  | 'true_false'
  | 'identify_incorrect';

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed';

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  photoUrl?: string;
  targetExam: string;
  preferredLanguage: Language;
  role: 'student' | 'admin';
  createdAtIso: string;
  updatedAtIso: string;
}

export interface Category {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  icon: string;
  order: number;
  active: boolean;
  createdAtIso?: string;
  updatedAtIso?: string;
}

export interface Topic {
  id: string;
  categoryId: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  defaultDifficulty: Difficulty;
  defaultQuestionCount: number;
  defaultTimeLimitSec: number;
  supportsGenerator: boolean;
  order: number;
  active: boolean;
  createdAtIso?: string;
  updatedAtIso?: string;
}

export interface Question {
  id: string;
  categoryId: string;
  topicId: string;
  questionText: string;
  questionTextHi?: string;
  questionType: QuestionType;
  difficulty: Difficulty;
  correctAnswer: string;
  options: string[];
  explanation: string;
  explanationHi?: string;
  marks: number;
  timeRecommendationSec: number;
  active: boolean;
  contentVersion: number;
  createdBy: string;
  source?: 'bank' | 'generated';
  columnTerms?: string[];
  createdAtIso?: string;
  updatedAtIso?: string;
}

export interface GeneratorConfig {
  id: string;
  topicKey: string;
  minNumber: number;
  maxNumber: number;
  digitLength?: number;
  termCount?: number;
  numeratorMin?: number;
  numeratorMax?: number;
  denominatorMin?: number;
  denominatorMax?: number;
  defaultDifficulty?: Difficulty;
  enabled: boolean;
  updatedBy: string;
  updatedAtIso?: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  mode: PracticeMode;
  topicId: string;
  topicName: string;
  difficulty: SessionDifficulty;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  score: number;
  negativeMarking: number;
  accuracy: number;
  totalTimeSec: number;
  avgTimePerQuestionSec: number;
  status: 'in_progress' | 'completed';
  startedAtIso: string;
  completedAtIso?: string;
  instantFeedback?: boolean;
  timed?: boolean;
  timeLimitSec?: number;
  unlimited?: boolean;
  questionsSnapshot?: Question[];
  answersSnapshot?: Record<string, { selectedAnswer: string; isCorrect: boolean; isSkipped: boolean; responseTimeSec: number }>;
  currentIndex?: number;
}

export interface UserAnswer {
  id: string;
  userId: string;
  sessionId: string;
  questionId: string;
  topicId: string;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  isSkipped: boolean;
  responseTimeSec: number;
  answeredAtIso: string;
}

export interface UserStatistics {
  userId: string;
  totalAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  totalSkipped: number;
  totalTimeSec: number;
  currentStreak: number;
  longestStreak: number;
  fastestResponseSec: number;
  lastPracticeDate: string;
}

export interface DailyActivity {
  id: string;
  userId: string;
  date: string;
  questionsAttempted: number;
  correctAnswers: number;
  practiceTimeSec: number;
  sessionsCount: number;
}

export interface UserSettings {
  userId: string;
  language: Language;
  theme: ThemeMode;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  defaultDifficulty: Difficulty;
  defaultQuestionCount: number;
  defaultTimerSec: number;
  dailyTarget: number;
  notificationsEnabled: boolean;
}

export interface AppPromoSettings {
  enabled: boolean;
  title: string;
  subtitle: string;
  ctaLabel: string;
  officialDownloadUrl: string;
  appDeepLinkUrl: string;
  mobileOnly: boolean;
}

export interface SocialLinksConfig {
  instagramUrl: string;
  telegramUrl: string;
  twitterUrl: string;
  youtubeUrl: string;
  whatsappUrl: string;
  websiteUrl: string;
}

export interface AppConfig {
  id: string;
  contentVersion: number;
  maintenanceMode: boolean;
  lastPublishNote?: string;
  officialDownloadUrl?: string;
  appPromoEnabled?: boolean;
  appPromoTitle?: string;
  appPromoSubtitle?: string;
  appPromoCtaLabel?: string;
  appDeepLinkUrl?: string;
  appPromoMobileOnly?: boolean;
  socialInstagramUrl?: string;
  socialTelegramUrl?: string;
  socialTwitterUrl?: string;
  socialYoutubeUrl?: string;
  socialWhatsappUrl?: string;
  socialWebsiteUrl?: string;
  updatedBy: string;
}

export interface ReportedQuestion {
  id: string;
  userId: string;
  questionId: string;
  topicId: string;
  reason: string;
  status: 'open' | 'resolved';
  createdAtIso: string;
}

export interface PendingSyncRecord {
  id: string;
  collection:
    | 'practice_sessions'
    | 'user_answers'
    | 'user_statistics'
    | 'daily_activity'
    | 'user_settings'
    | 'reported_questions';
  docId: string;
  action: 'upsert';
  payload: Record<string, unknown>;
  createdAtIso: string;
  retryCount: number;
  lastError?: string;
}

export interface SyncMetadata {
  id: string;
  localContentVersion: number;
  lastSyncTimeIso: string | null;
  status: SyncStatus;
  pendingCount: number;
  lastError?: string;
}

export interface SessionLaunchConfig {
  mode: PracticeMode;
  topicId: string;
  topicIds?: string[];
  topicName: string;
  difficulty: SessionDifficulty;
  questionCount: number;
  timed: boolean;
  timeLimitSec: number;
  questionTypeFilter: QuestionType | 'all';
  orderMode: 'random' | 'sequential';
  instantFeedback: boolean;
  customMin?: number;
  customMax?: number;
  selectedTables?: number[];
  termCount?: number;
  digitLength?: number;
  marksPerQuestion?: number;
  negativeMarking?: number;
  sourcePreference?: 'mixed' | 'bank_only' | 'generated_only';
  unlimited?: boolean;
  percentageType?: 'all' | 'basic' | 'reverse' | 'successive';
  fractionOperation?: 'all' | 'addition' | 'multiplication' | 'comparison' | 'to_percent';
  divisionMode?: 'mixed' | 'exact' | 'remainder';
  multiplicationFocus?: 'all' | 'shortcuts' | 'tables';
  trigFocus?: 'all' | 'values';
}

export type EventBannerPreset =
  | 'championship'
  | 'speed_sprint'
  | 'indigo_crown'
  | 'emerald_math'
  | 'amber_trophy';

export interface EventPrize {
  rankLabel: string;
  title: string;
  prizeType: 'cash' | 'item' | 'voucher' | 'certificate';
  valueText: string;
}

export interface TestEvent {
  id: string;
  title: string;
  titleHi?: string;
  description: string;
  descriptionHi?: string;
  bannerPreset: EventBannerPreset;
  bannerUrl?: string;
  regOpenAtMs: number;
  regCloseAtMs: number;
  startAtMs: number;
  endAtMs: number;
  durationMin: number;
  totalQuestions: number;
  topicIds: string[];
  difficulty: SessionDifficulty;
  marksPerQuestion: number;
  negativeMarking: number;
  maxParticipants: number; // 0 = unlimited
  registeredCount: number;
  registrationType: 'free' | 'paid';
  entryFee: number;
  currency: string;
  prizes: EventPrize[];
  status: 'draft' | 'published' | 'cancelled';
  resultsPublished: boolean;
  publishedResultCount: number;
  createdBy: string;
  createdAtIso?: string;
  updatedAtIso?: string;
}

export interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  userName: string;
  userEmail: string;
  targetExam: string;
  registrationType: 'free' | 'paid';
  feeAmount: number;
  paymentStatus: 'free' | 'pending' | 'confirmed' | 'waived';
  status: 'registered' | 'cancelled';
  registeredAtIso?: string;
  updatedAtIso?: string;
}

export interface EventQuestionAnswerRecord {
  selectedAnswer: string;
  isCorrect: boolean;
  isSkipped: boolean;
  markedForReview: boolean;
  responseTimeSec: number;
}

export interface EventSubmission {
  id: string;
  eventId: string;
  eventTitle: string;
  userId: string;
  userName: string;
  totalQuestions: number;
  attemptedQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  score: number;
  maxScore: number;
  accuracy: number;
  timeTakenSec: number;
  markedForReviewCount: number;
  answersMap: Record<string, EventQuestionAnswerRecord>;
  status: 'submitted' | 'disqualified';
  rank: number;
  isWinnerVerified: boolean;
  prizeTitle: string;
  prizeRankLabel: string;
  prizeStatus: 'none' | 'pending' | 'verified' | 'disbursed';
  resultsPublished: boolean;
  submittedAtIso?: string;
  updatedAtIso?: string;
}

