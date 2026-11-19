import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Download,
  Edit3,
  FileSpreadsheet,
  FolderPlus,
  Link2,
  Plus,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Sliders,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { getLocalDateStr } from '../db/offlineDb';
import {
  bulkImportQuestionsCloud,
  deleteCategoryCloud,
  deleteQuestionCloud,
  deleteTopicCloud,
  fetchAdminOverviewData,
  getDefaultAppPromoSettings,
  getDefaultSocialLinks,
  normalizeAppPromoSettings,
  normalizeSocialLinks,
  publishSeedCatalogToCloud,
  resolveReportCloud,
  saveCategoryCloud,
  saveGeneratorConfigCloud,
  saveQuestionCloud,
  saveTopicCloud,
  updateAppDistributionConfigCloud,
  updateSocialLinksCloud,
} from '../services/adminService';
import type {
  AppConfig,
  AppPromoSettings,
  Category,
  Difficulty,
  GeneratorConfig,
  PracticeSession,
  Question,
  QuestionType,
  ReportedQuestion,
  SocialLinksConfig,
  Topic,
  UserProfile,
} from '../types/math';
import { AdminEventsManager } from './AdminEventsManager';
import { AppPromotionBanner } from './AppPromotionBanner';
import { SocialFooter } from './SocialFooter';

type AdminTab = 'overview' | 'events' | 'categories' | 'topics' | 'questions' | 'import' | 'generators' | 'reports';

interface ParsedImportRow {
  rowNum: number;
  question: Question | null;
  errors: string[];
  rawId: string;
  rawText: string;
}

export const AdminPanelView: React.FC = () => {
  const { firebaseUser, isAdmin, signInWithGoogle, signInWithEmail, syncNow, refreshAppConfig } = usePlatform();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authErr, setAuthErr] = useState('');

  // Cloud state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [generatorConfigs, setGeneratorConfigs] = useState<GeneratorConfig[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [reports, setReports] = useState<ReportedQuestion[]>([]);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [promoForm, setPromoForm] = useState<AppPromoSettings>(() => getDefaultAppPromoSettings());
  const [savingPromoConfig, setSavingPromoConfig] = useState(false);
  const [socialForm, setSocialForm] = useState<SocialLinksConfig>(() => getDefaultSocialLinks());
  const [savingSocialLinks, setSavingSocialLinks] = useState(false);

  // Question search & filters
  const [qSearch, setQSearch] = useState('');
  const [qCatFilter, setQCatFilter] = useState('all');
  const [qTopicFilter, setQTopicFilter] = useState('all');
  const [qDiffFilter, setQDiffFilter] = useState('all');
  const [qStatusFilter, setQStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [qPage, setQPage] = useState(1);
  const pageSize = 10;

  // Category Form
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catForm, setCatForm] = useState<Category>({
    id: '',
    name: '',
    nameHi: '',
    description: '',
    descriptionHi: '',
    icon: 'Zap',
    order: 1,
    active: true,
  });

  // Topic Form
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [topicForm, setTopicForm] = useState<Topic>({
    id: '',
    categoryId: 'cat_quick_recall',
    name: '',
    nameHi: '',
    description: '',
    descriptionHi: '',
    defaultDifficulty: 'medium',
    defaultQuestionCount: 15,
    defaultTimeLimitSec: 300,
    supportsGenerator: true,
    order: 1,
    active: true,
  });

  // Question Form
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [qFormOpen, setQFormOpen] = useState(false);
  const [qForm, setQForm] = useState<Question>({
    id: '',
    categoryId: 'cat_quick_recall',
    topicId: 'squares',
    questionText: '',
    questionTextHi: '',
    questionType: 'mcq',
    difficulty: 'medium',
    correctAnswer: '',
    options: ['', '', '', ''],
    explanation: '',
    explanationHi: '',
    marks: 1,
    timeRecommendationSec: 15,
    active: true,
    contentVersion: 1,
    createdBy: 'admin',
  });

  // Bulk Import State
  const [parsedRows, setParsedRows] = useState<ParsedImportRow[]>([]);
  const [importSummary, setImportSummary] = useState<{ succeeded: number; failed: number } | null>(null);

  const loadCloudAdminData = useCallback(async () => {
    if (!firebaseUser || !isAdmin) return;
    setLoading(true);
    try {
      const data = await fetchAdminOverviewData();
      setUsers(data.users);
      setCategories(data.categories);
      setTopics(data.topics);
      setQuestions(data.questions);
      setGeneratorConfigs(data.generatorConfigs);
      setSessions(data.sessions);
      setReports(data.reports);
      setAppConfig(data.appConfig);
      setPromoForm(normalizeAppPromoSettings(data.appConfig));
      setSocialForm(normalizeSocialLinks(data.appConfig));
    } catch (err) {
      setBanner({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to load Firestore admin data.',
      });
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  useEffect(() => {
    void loadCloudAdminData();
  }, [loadCloudAdminData]);

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    window.setTimeout(() => setBanner(null), 6000);
  };

  // --- Computed Dashboard Stats ---
  const todayStr = getLocalDateStr();
  const dailyActiveUsers = useMemo(() => {
    const uids = new Set(
      sessions.filter((s) => s.startedAtIso?.startsWith(todayStr)).map((s) => s.userId)
    );
    return uids.size;
  }, [sessions, todayStr]);

  const popularModules = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      counts.set(s.topicName, (counts.get(s.topicName) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [sessions]);

  const filteredQuestions = useMemo(() => {
    const term = qSearch.trim().toLowerCase();
    return questions.filter((q) => {
      if (qCatFilter !== 'all' && q.categoryId !== qCatFilter) return false;
      if (qTopicFilter !== 'all' && q.topicId !== qTopicFilter) return false;
      if (qDiffFilter !== 'all' && q.difficulty !== qDiffFilter) return false;
      if (qStatusFilter === 'active' && !q.active) return false;
      if (qStatusFilter === 'inactive' && q.active) return false;
      if (term) {
        return (
          q.id.toLowerCase().includes(term) ||
          q.questionText.toLowerCase().includes(term) ||
          (q.questionTextHi ?? '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [questions, qSearch, qCatFilter, qTopicFilter, qDiffFilter, qStatusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const pagedQuestions = filteredQuestions.slice((qPage - 1) * pageSize, qPage * pageSize);

  // --- Handlers ---
  const handleSeedCloud = async () => {
    if (!firebaseUser) return;
    setLoading(true);
    try {
      await publishSeedCatalogToCloud(firebaseUser.uid);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', 'Published full curriculum & 70+ verified questions to Cloud Firestore.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Seed publish failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const isNew = !editingCat;
    const id = isNew
      ? catForm.id.trim() || `cat_${Date.now()}`
      : editingCat.id;
    try {
      await saveCategoryCloud({ ...catForm, id }, isNew, firebaseUser.uid);
      setEditingCat(null);
      setCatForm({
        id: '',
        name: '',
        nameHi: '',
        description: '',
        descriptionHi: '',
        icon: 'Zap',
        order: categories.length + 1,
        active: true,
      });
      await loadCloudAdminData();
      await syncNow();
      notify('ok', `Category "${catForm.name}" saved and published.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to save category.');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!firebaseUser) return;
    const linkedTopics = topics.filter((tp) => tp.categoryId === catId);
    if (linkedTopics.length > 0) {
      notify('err', `Cannot delete category with ${linkedTopics.length} linked topic(s). Reassign or remove topics first.`);
      return;
    }
    try {
      await deleteCategoryCloud(catId, firebaseUser.uid);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', 'Category deleted.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to delete category.');
    }
  };

  const handleSaveTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const isNew = !editingTopic;
    const id = isNew ? topicForm.id.trim() || `topic_${Date.now()}` : editingTopic.id;
    try {
      await saveTopicCloud({ ...topicForm, id }, isNew, firebaseUser.uid);
      setEditingTopic(null);
      setTopicForm({
        id: '',
        categoryId: categories[0]?.id || 'cat_quick_recall',
        name: '',
        nameHi: '',
        description: '',
        descriptionHi: '',
        defaultDifficulty: 'medium',
        defaultQuestionCount: 15,
        defaultTimeLimitSec: 300,
        supportsGenerator: true,
        order: topics.length + 1,
        active: true,
      });
      await loadCloudAdminData();
      await syncNow();
      notify('ok', `Topic "${topicForm.name}" saved.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to save topic.');
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!firebaseUser) return;
    const linkedQs = questions.filter((q) => q.topicId === topicId);
    if (linkedQs.length > 0) {
      notify('err', `Cannot delete topic with ${linkedQs.length} existing question(s). Deactivate instead or reassign questions.`);
      return;
    }
    try {
      await deleteTopicCloud(topicId, firebaseUser.uid);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', 'Topic deleted.');
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const openNewQuestionForm = () => {
    setEditingQ(null);
    setQForm({
      id: `q_${Date.now()}`,
      categoryId: categories[0]?.id || 'cat_quick_recall',
      topicId: topics[0]?.id || 'squares',
      questionText: '',
      questionTextHi: '',
      questionType: 'mcq',
      difficulty: 'medium',
      correctAnswer: '',
      options: ['', '', '', ''],
      explanation: '',
      explanationHi: '',
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: (appConfig?.contentVersion ?? 1) + 1,
      createdBy: firebaseUser?.uid || 'admin',
    });
    setQFormOpen(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    if (!qForm.questionText.trim() || !qForm.correctAnswer.trim()) {
      notify('err', 'Question text and correct answer are required.');
      return;
    }
    const isNew = !editingQ;
    const cleanedOpts = qForm.options.map((o) => o.trim()).filter(Boolean);
    const payload: Question = {
      ...qForm,
      id: isNew ? qForm.id.trim() || `q_${Date.now()}` : editingQ.id,
      options: cleanedOpts,
      contentVersion: (appConfig?.contentVersion ?? 1) + 1,
    };
    try {
      await saveQuestionCloud(payload, isNew, firebaseUser.uid);
      setQFormOpen(false);
      setEditingQ(null);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', `Question ${payload.id} saved and published to cloud.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to save question.');
    }
  };

  const handleToggleQuestionActive = async (q: Question) => {
    if (!firebaseUser) return;
    try {
      await saveQuestionCloud({ ...q, active: !q.active }, false, firebaseUser.uid);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', `Question ${q.id} ${!q.active ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Status toggle failed.');
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!firebaseUser) return;
    try {
      await deleteQuestionCloud(qId, firebaseUser.uid);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', `Question ${qId} deleted.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  // --- Bulk Import / Export ---
  const handleDownloadSampleTemplate = (format: 'xlsx' | 'csv') => {
    const sampleRows = [
      {
        id: 'q_custom_101',
        categoryId: 'cat_quick_recall',
        topicId: 'squares',
        questionText: '27² = ?',
        questionTextHi: '27² = ?',
        questionType: 'mcq',
        difficulty: 'medium',
        correctAnswer: '729',
        option1: '719',
        option2: '729',
        option3: '739',
        option4: '784',
        explanation: '27 × 27 = 729.',
        explanationHi: '27 × 27 = 729।',
        marks: 1,
        timeRecommendationSec: 15,
        active: 'true',
      },
      {
        id: 'q_custom_102',
        categoryId: 'cat_basics',
        topicId: 'multiplication',
        questionText: '48 × 25 = ?',
        questionTextHi: '48 × 25 = ?',
        questionType: 'direct',
        difficulty: 'easy',
        correctAnswer: '1200',
        option1: '',
        option2: '',
        option3: '',
        option4: '',
        explanation: '48 ÷ 4 = 12, then × 100 = 1200.',
        explanationHi: '48 ÷ 4 × 100 = 1200।',
        marks: 1,
        timeRecommendationSec: 12,
        active: 'true',
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, `sankhyaprep_question_template.${format}`);
  };

  const handleExportQuestions = (format: 'xlsx' | 'json') => {
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(filteredQuestions, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sankhyaprep_questions_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const flat = filteredQuestions.map((q) => ({
      id: q.id,
      categoryId: q.categoryId,
      topicId: q.topicId,
      questionText: q.questionText,
      questionTextHi: q.questionTextHi ?? '',
      questionType: q.questionType,
      difficulty: q.difficulty,
      correctAnswer: q.correctAnswer,
      option1: q.options[0] ?? '',
      option2: q.options[1] ?? '',
      option3: q.options[2] ?? '',
      option4: q.options[3] ?? '',
      explanation: q.explanation,
      explanationHi: q.explanationHi ?? '',
      marks: q.marks,
      timeRecommendationSec: q.timeRecommendationSec,
      active: q.active ? 'true' : 'false',
    }));
    const ws = XLSX.utils.json_to_sheet(flat);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Questions');
    XLSX.writeFile(wb, 'sankhyaprep_questions_export.xlsx');
  };

  const handleUploadImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportSummary(null);

    try {
      let rawRecords: Array<Record<string, unknown>> = [];
      if (file.name.toLowerCase().endsWith('.json')) {
        const text = await file.text();
        const parsed = JSON.parse(text);
        rawRecords = Array.isArray(parsed) ? parsed : [];
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];
        rawRecords = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
      }

      const existingIds = new Set(questions.map((q) => q.id));
      const seenFileIds = new Set<string>();
      const validTopicIds = new Set(topics.map((tp) => tp.id));
      const validCatIds = new Set(categories.map((c) => c.id));
      const validTypes: QuestionType[] = [
        'direct',
        'mcq',
        'fill_blank',
        'missing_number',
        'reverse',
        'true_false',
        'identify_incorrect',
      ];
      const validDiffs: Difficulty[] = ['easy', 'medium', 'hard'];

      const validated: ParsedImportRow[] = rawRecords.map((row, idx) => {
        const errs: string[] = [];
        const id = String(row.id ?? '').trim();
        const categoryId = String(row.categoryId ?? '').trim();
        const topicId = String(row.topicId ?? '').trim();
        const questionText = String(row.questionText ?? '').trim();
        const questionTextHi = String(row.questionTextHi ?? '').trim();
        const questionType = String(row.questionType ?? 'direct').trim() as QuestionType;
        const difficulty = String(row.difficulty ?? 'medium').trim().toLowerCase() as Difficulty;
        const correctAnswer = String(row.correctAnswer ?? '').trim();
        const options = Array.isArray(row.options)
          ? row.options.map((v) => String(v).trim()).filter(Boolean)
          : [row.option1, row.option2, row.option3, row.option4]
              .map((v) => String(v ?? '').trim())
              .filter(Boolean);

        if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) errs.push('Invalid/missing ID (alphanumeric, _, - only)');
        if (seenFileIds.has(id)) errs.push('Duplicate ID inside file');
        if (existingIds.has(id)) errs.push('ID already exists in Firestore bank');
        seenFileIds.add(id);

        if (!categoryId || (validCatIds.size > 0 && !validCatIds.has(categoryId)))
          errs.push(`Unknown categoryId "${categoryId}"`);
        if (!topicId || (validTopicIds.size > 0 && !validTopicIds.has(topicId)))
          errs.push(`Unknown topicId "${topicId}"`);
        if (!questionText) errs.push('Missing questionText');
        if (!correctAnswer) errs.push('Missing correctAnswer');
        if (!validTypes.includes(questionType)) errs.push(`Invalid questionType "${questionType}"`);
        if (!validDiffs.includes(difficulty)) errs.push(`Invalid difficulty "${difficulty}"`);
        if (questionType === 'mcq' && options.length < 2) errs.push('MCQ requires at least 2 options');
        if (questionType === 'mcq' && options.length >= 2 && !options.includes(correctAnswer)) {
          errs.push('MCQ options must include exact correctAnswer');
        }

        const qObj: Question | null =
          errs.length === 0
            ? {
                id,
                categoryId,
                topicId,
                questionText,
                questionTextHi,
                questionType,
                difficulty,
                correctAnswer,
                options,
                explanation: String(row.explanation ?? '').trim(),
                explanationHi: String(row.explanationHi ?? '').trim(),
                marks: Number(row.marks || 1),
                timeRecommendationSec: Number(row.timeRecommendationSec || 15),
                active: String(row.active ?? 'true').toLowerCase() !== 'false',
                contentVersion: (appConfig?.contentVersion ?? 1) + 1,
                createdBy: firebaseUser?.uid || 'admin',
              }
            : null;

        return {
          rowNum: idx + 1,
          question: qObj,
          errors: errs,
          rawId: id || `(row ${idx + 1})`,
          rawText: questionText || '—',
        };
      });

      setParsedRows(validated);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to parse uploaded file.');
    }
  };

  const handleConfirmBulkImport = async () => {
    if (!firebaseUser) return;
    const validQs = parsedRows.filter((r) => r.question !== null).map((r) => r.question!);
    if (validQs.length === 0) return;
    setLoading(true);
    try {
      const res = await bulkImportQuestionsCloud(validQs, firebaseUser.uid);
      setImportSummary({ succeeded: res.succeeded, failed: res.failed.length });
      setParsedRows([]);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', `Imported ${res.succeeded} questions (${res.failed.length} failed).`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Bulk import failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGeneratorConfig = async (cfg: GeneratorConfig) => {
    if (!firebaseUser) return;
    if (cfg.minNumber > cfg.maxNumber) {
      notify('err', `Invalid bounds for ${cfg.topicKey}: Minimum cannot exceed Maximum.`);
      return;
    }
    try {
      await saveGeneratorConfigCloud(cfg, firebaseUser.uid);
      await loadCloudAdminData();
      await syncNow();
      notify('ok', `Generator configuration for "${cfg.topicKey}" published.`);
    } catch (err) {
      notify('err', err instanceof Error ? err.message : 'Failed to update generator config.');
    }
  };

  // --- ADMIN AUTH GATE ---
  if (!firebaseUser || !isAdmin) {
    return (
      <div className="max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-blue-600 dark:text-blue-400">
            <ShieldCheck className="w-4 h-4" />
            Protected Admin Studio
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Web Admin Panel Login</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sign in with an authorized administrator account verified by Firebase Security Rules to manage categories, topics, question banks, and dynamic generator limits.
          </p>
        </div>

        {firebaseUser && !isAdmin && (
          <div className="p-3.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
            Signed in as <span className="font-mono">{firebaseUser.email}</span>, which does not have admin privileges in Firestore <code className="font-mono">/admins</code>.
          </div>
        )}

        {authErr && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
            {authErr}
          </div>
        )}

        <button
          onClick={async () => {
            setAuthErr('');
            try {
              await signInWithGoogle();
            } catch (err) {
              setAuthErr(err instanceof Error ? err.message : 'Google sign-in failed.');
            }
          }}
          className="w-full py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          Sign In with Google (Admin)
        </button>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setAuthErr('');
            try {
              await signInWithEmail(loginEmail, loginPass);
            } catch (err) {
              setAuthErr(err instanceof Error ? err.message : 'Login failed.');
            }
          }}
          className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800"
        >
          <div className="text-xs font-medium text-slate-500">Or Email & Password</div>
          <input
            type="email"
            required
            placeholder="Admin email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={loginPass}
            onChange={(e) => setLoginPass(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
          <button
            type="submit"
            className="w-full py-2 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded-lg"
          >
            Admin Email Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Authorized: {firebaseUser.email} · Cloud Content v{appConfig?.contentVersion ?? 1}
          </p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
            Web Admin Studio
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {questions.length === 0 && (
            <button
              onClick={handleSeedCloud}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              <CloudUpload className="w-4 h-4" />
              Initialize Cloud Seed Bank
            </button>
          )}
          <button
            onClick={() => void loadCloudAdminData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {banner && (
        <div
          className={`p-3.5 rounded-lg border text-sm flex items-center gap-2 ${
            banner.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          }`}
        >
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg overflow-x-auto">
        {(
          [
            { id: 'overview', label: 'Dashboard' },
            { id: 'events', label: 'Test Events' },
            { id: 'categories', label: `Categories (${categories.length})` },
            { id: 'topics', label: `Topics (${topics.length})` },
            { id: 'questions', label: `Questions (${questions.length})` },
            { id: 'import', label: 'Bulk Import / Export' },
            { id: 'generators', label: 'Generator Configs' },
            { id: 'reports', label: `Reports (${reports.filter((r) => r.status === 'open').length})` },
          ] as Array<{ id: AdminTab; label: string }>
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Total Users', value: users.length },
              { label: 'Total Questions', value: questions.length },
              { label: 'Categories', value: categories.length },
              { label: 'Topics', value: topics.length },
              { label: 'Practice Sessions', value: sessions.length },
              { label: 'Daily Active Users', value: dailyActiveUsers },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
              >
                <div className="text-xs text-slate-500 dark:text-slate-400">{kpi.label}</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                  {kpi.value}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">Popular Modules</h2>
              {popularModules.length === 0 ? (
                <p className="text-sm text-slate-500">No cloud-synced practice sessions yet.</p>
              ) : (
                <div className="space-y-3">
                  {popularModules.map(([name, cnt]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-800 dark:text-slate-200">{name}</span>
                      <span className="font-mono tabular-nums font-semibold text-blue-600">{cnt} sessions</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
                Recent Questions & Content Status
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Last Publish Note: {appConfig?.lastPublishNote || 'Cloud catalog awaiting initialization'}
              </p>
              <div className="divide-y divide-slate-200 dark:divide-slate-800 text-sm">
                {questions.slice(0, 5).map((q) => (
                  <div key={q.id} className="py-2 flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-slate-800 dark:text-slate-200">{q.questionText}</span>
                    <span className="text-xs text-slate-500 shrink-0">{q.topicId}</span>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="text-sm text-slate-500 py-2">
                    Click &quot;Initialize Cloud Seed Bank&quot; above to upload the initial verified question bank to Firestore.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* App Promotion Banner ("Open in App") & Official Distribution Config */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!firebaseUser) return;
              setSavingPromoConfig(true);
              try {
                const saved = await updateAppDistributionConfigCloud(firebaseUser.uid, promoForm);
                setPromoForm(saved);
                setAppConfig((prev) => ({
                  id: prev?.id ?? 'global',
                  contentVersion: prev?.contentVersion ?? 1,
                  maintenanceMode: prev?.maintenanceMode ?? false,
                  lastPublishNote: prev?.lastPublishNote,
                  officialDownloadUrl: saved.officialDownloadUrl,
                  appPromoEnabled: saved.enabled,
                  appPromoTitle: saved.title,
                  appPromoSubtitle: saved.subtitle,
                  appPromoCtaLabel: saved.ctaLabel,
                  appDeepLinkUrl: saved.appDeepLinkUrl,
                  appPromoMobileOnly: saved.mobileOnly,
                  updatedBy: firebaseUser.uid,
                }));
                await refreshAppConfig();
                notify(
                  'ok',
                  `App Promotion banner (${saved.enabled ? 'Enabled' : 'Disabled'}) & app links saved.`
                );
              } catch (err) {
                notify('err', err instanceof Error ? err.message : 'Failed to save app promotion settings.');
              } finally {
                setSavingPromoConfig(false);
              }
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                  <Smartphone className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  App Promotion Banner &amp; Open-in-App Distribution
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Detect mobile web visitors and prompt them to open or download your official mobile app. Shareable Achievement cards also use the Official Download URL below.
                </p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                app_config/global
              </span>
            </div>

            {/* Admin Toggles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Enable &quot;Open in App&quot; Banner
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Show the app promotion prompt across SankhyaPrep web sessions
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={promoForm.enabled}
                  onChange={(e) => setPromoForm((p) => ({ ...p, enabled: e.target.checked }))}
                  className="w-4.5 h-4.5 accent-indigo-600 shrink-0"
                />
              </label>

              <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 cursor-pointer">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Mobile Web Only Detection
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Only show to Android / iOS mobile browsers (hidden inside standalone app)
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={promoForm.mobileOnly}
                  onChange={(e) => setPromoForm((p) => ({ ...p, mobileOnly: e.target.checked }))}
                  className="w-4.5 h-4.5 accent-indigo-600 shrink-0"
                />
              </label>
            </div>

            {/* URLs & Customizable Copy */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official App / Play Store Download URL *
                </label>
                <div className="relative">
                  <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    required
                    placeholder="https://play.google.com/store/apps/details?id=com.sankhyaprep"
                    value={promoForm.officialDownloadUrl}
                    onChange={(e) =>
                      setPromoForm((p) => ({ ...p, officialDownloadUrl: e.target.value }))
                    }
                    className="w-full pl-9 pr-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Open-in-App Deep Link URI (Optional)
                </label>
                <input
                  type="text"
                  placeholder="sankhyaprep://open (falls back to Download URL if not installed)"
                  value={promoForm.appDeepLinkUrl}
                  onChange={(e) => setPromoForm((p) => ({ ...p, appDeepLinkUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banner Title
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={promoForm.title}
                  onChange={(e) => setPromoForm((p) => ({ ...p, title: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CTA Button Label
                </label>
                <input
                  type="text"
                  maxLength={40}
                  placeholder="Open in App"
                  value={promoForm.ctaLabel}
                  onChange={(e) => setPromoForm((p) => ({ ...p, ctaLabel: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Banner Subtitle
                </label>
                <input
                  type="text"
                  maxLength={180}
                  value={promoForm.subtitle}
                  onChange={(e) => setPromoForm((p) => ({ ...p, subtitle: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Live Preview */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold">Live Banner Preview</span>
                <span>
                  Status:{' '}
                  <strong className={promoForm.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}>
                    {promoForm.enabled
                      ? promoForm.mobileOnly
                        ? 'Active on Mobile Web'
                        : 'Active on All Web Devices'
                      : 'Hidden (Disabled)'}
                  </strong>
                </span>
              </div>
              <div className={promoForm.enabled ? '' : 'opacity-45'}>
                <AppPromotionBanner previewConfig={promoForm} forcePreview />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingPromoConfig}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {savingPromoConfig ? 'Saving...' : 'Save App Promotion Settings'}
              </button>
            </div>
          </form>

          {/* Social Media & Community Links Config */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!firebaseUser) return;
              setSavingSocialLinks(true);
              try {
                const saved = await updateSocialLinksCloud(firebaseUser.uid, socialForm);
                setSocialForm(saved);
                setAppConfig((prev) => ({
                  id: prev?.id ?? 'global',
                  contentVersion: prev?.contentVersion ?? 1,
                  maintenanceMode: prev?.maintenanceMode ?? false,
                  lastPublishNote: prev?.lastPublishNote,
                  officialDownloadUrl: prev?.officialDownloadUrl,
                  appPromoEnabled: prev?.appPromoEnabled,
                  appPromoTitle: prev?.appPromoTitle,
                  appPromoSubtitle: prev?.appPromoSubtitle,
                  appPromoCtaLabel: prev?.appPromoCtaLabel,
                  appDeepLinkUrl: prev?.appDeepLinkUrl,
                  appPromoMobileOnly: prev?.appPromoMobileOnly,
                  socialInstagramUrl: saved.instagramUrl,
                  socialTelegramUrl: saved.telegramUrl,
                  socialTwitterUrl: saved.twitterUrl,
                  socialYoutubeUrl: saved.youtubeUrl,
                  socialWhatsappUrl: saved.whatsappUrl,
                  socialWebsiteUrl: saved.websiteUrl,
                  updatedBy: firebaseUser.uid,
                }));
                await refreshAppConfig();
                notify('ok', 'Social media links updated and synced.');
              } catch (err) {
                notify('err', err instanceof Error ? err.message : 'Failed to save social links.');
              } finally {
                setSavingSocialLinks(false);
              }
            }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
                  <Share2 className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  Social Media &amp; Community Links (Profile &amp; Settings Footer)
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                  Configure official social channels shown in the SocialFooter at the bottom of Profile and App Settings. Leave any field blank to hide that channel.
                </p>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                app_config/global
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Instagram URL
                </label>
                <input
                  type="url"
                  placeholder="https://instagram.com/sankhyaprep"
                  value={socialForm.instagramUrl}
                  onChange={(e) => setSocialForm((s) => ({ ...s, instagramUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telegram Channel URL
                </label>
                <input
                  type="url"
                  placeholder="https://t.me/sankhyaprep"
                  value={socialForm.telegramUrl}
                  onChange={(e) => setSocialForm((s) => ({ ...s, telegramUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Twitter / X URL
                </label>
                <input
                  type="url"
                  placeholder="https://x.com/sankhyaprep"
                  value={socialForm.twitterUrl}
                  onChange={(e) => setSocialForm((s) => ({ ...s, twitterUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  YouTube Channel URL
                </label>
                <input
                  type="url"
                  placeholder="https://youtube.com/@sankhyaprep"
                  value={socialForm.youtubeUrl}
                  onChange={(e) => setSocialForm((s) => ({ ...s, youtubeUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  WhatsApp Community URL
                </label>
                <input
                  type="url"
                  placeholder="https://whatsapp.com/channel/..."
                  value={socialForm.whatsappUrl}
                  onChange={(e) => setSocialForm((s) => ({ ...s, whatsappUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Website URL
                </label>
                <input
                  type="url"
                  placeholder="https://sankhyaprep.com"
                  value={socialForm.websiteUrl}
                  onChange={(e) => setSocialForm((s) => ({ ...s, websiteUrl: e.target.value }))}
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Live SocialFooter Preview
              </div>
              <SocialFooter previewLinks={socialForm} compact />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={savingSocialLinks}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                {savingSocialLinks ? 'Saving...' : 'Save Social Links'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. CATEGORY MANAGEMENT */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveCategory}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 h-fit"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FolderPlus className="w-4 h-4 text-blue-600" />
              {editingCat ? `Edit Category (${editingCat.id})` : 'Add New Category'}
            </div>
            <input
              type="text"
              disabled={Boolean(editingCat)}
              placeholder="Category ID (e.g. cat_algebra)"
              value={catForm.id}
              onChange={(e) => setCatForm({ ...catForm, id: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
            />
            <input
              type="text"
              required
              placeholder="Name (English)"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              required
              placeholder="Name (Hindi)"
              value={catForm.nameHi}
              onChange={(e) => setCatForm({ ...catForm, nameHi: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <textarea
              rows={2}
              placeholder="Description (English)"
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={0}
                placeholder="Order"
                value={catForm.order}
                onChange={(e) => setCatForm({ ...catForm, order: Number(e.target.value) })}
                className="px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <select
                value={catForm.icon}
                onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="Zap">Zap</option>
                <option value="Calculator">Calculator</option>
                <option value="BookOpen">BookOpen</option>
                <option value="Percent">Percent</option>
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={catForm.active}
                onChange={(e) => setCatForm({ ...catForm, active: e.target.checked })}
                className="rounded accent-blue-600"
              />
              Active
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                {editingCat ? 'Update Category' : 'Create Category'}
              </button>
              {editingCat && (
                <button
                  type="button"
                  onClick={() => setEditingCat(null)}
                  className="px-3 py-2 text-xs text-slate-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 divide-y divide-slate-200 dark:divide-slate-800">
            {categories.map((c) => (
              <div key={c.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {c.order}. {c.name} / {c.nameHi}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {c.id} · {c.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingCat(c);
                      setCatForm(c);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void handleDeleteCategory(c.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TOPIC MANAGEMENT */}
      {activeTab === 'topics' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={handleSaveTopic}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 h-fit"
          >
            <div className="text-sm font-semibold">
              {editingTopic ? `Edit Topic (${editingTopic.id})` : 'Add New Topic'}
            </div>
            <input
              type="text"
              disabled={Boolean(editingTopic)}
              placeholder="Topic ID (e.g. ratio_proportion)"
              value={topicForm.id}
              onChange={(e) => setTopicForm({ ...topicForm, id: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
            />
            <select
              value={topicForm.categoryId}
              onChange={(e) => setTopicForm({ ...topicForm, categoryId: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              required
              placeholder="Topic Name (English)"
              value={topicForm.name}
              onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <input
              type="text"
              required
              placeholder="Topic Name (Hindi)"
              value={topicForm.nameHi}
              onChange={(e) => setTopicForm({ ...topicForm, nameHi: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
            <div className="grid grid-cols-3 gap-2">
              <select
                value={topicForm.defaultDifficulty}
                onChange={(e) => setTopicForm({ ...topicForm, defaultDifficulty: e.target.value as Difficulty })}
                className="px-2 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <input
                type="number"
                min={1}
                placeholder="Qs"
                value={topicForm.defaultQuestionCount}
                onChange={(e) => setTopicForm({ ...topicForm, defaultQuestionCount: Number(e.target.value) })}
                className="px-2 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
              <input
                type="number"
                min={0}
                placeholder="Sec"
                value={topicForm.defaultTimeLimitSec}
                onChange={(e) => setTopicForm({ ...topicForm, defaultTimeLimitSec: Number(e.target.value) })}
                className="px-2 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={topicForm.active}
                onChange={(e) => setTopicForm({ ...topicForm, active: e.target.checked })}
                className="rounded accent-blue-600"
              />
              Active
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
              >
                {editingTopic ? 'Update Topic' : 'Create Topic'}
              </button>
              {editingTopic && (
                <button
                  type="button"
                  onClick={() => setEditingTopic(null)}
                  className="px-3 py-2 text-xs text-slate-500"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 divide-y divide-slate-200 dark:divide-slate-800">
            {topics.map((tp) => (
              <div key={tp.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {tp.name} / {tp.nameHi}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {tp.id} · {tp.categoryId} · {tp.defaultDifficulty} · {tp.defaultQuestionCount} Qs ·{' '}
                    {tp.active ? 'Active' : 'Inactive'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingTopic(tp);
                      setTopicForm(tp);
                    }}
                    className="p-1.5 text-slate-500 hover:text-blue-600"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => void handleDeleteTopic(tp.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. QUESTION BANK MANAGEMENT */}
      {activeTab === 'questions' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search question text or ID..."
                  value={qSearch}
                  onChange={(e) => {
                    setQSearch(e.target.value);
                    setQPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <select
                value={qCatFilter}
                onChange={(e) => {
                  setQCatFilter(e.target.value);
                  setQPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select
                value={qTopicFilter}
                onChange={(e) => {
                  setQTopicFilter(e.target.value);
                  setQPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Topics</option>
                {topics.map((tp) => (
                  <option key={tp.id} value={tp.id}>
                    {tp.name}
                  </option>
                ))}
              </select>
              <select
                value={qDiffFilter}
                onChange={(e) => {
                  setQDiffFilter(e.target.value);
                  setQPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Difficulty</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <select
                value={qStatusFilter}
                onChange={(e) => {
                  setQStatusFilter(e.target.value as 'all' | 'active' | 'inactive');
                  setQPage(1);
                }}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <button
              onClick={openNewQuestionForm}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Add Question
            </button>
          </div>

          {qFormOpen && (
            <form
              onSubmit={handleSaveQuestion}
              className="bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-800 rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">
                  {editingQ ? `Edit Question: ${editingQ.id}` : 'Create New Question'}
                </h3>
                <button type="button" onClick={() => setQFormOpen(false)} className="text-xs text-slate-500">
                  Close
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  disabled={Boolean(editingQ)}
                  placeholder="Question ID"
                  value={qForm.id}
                  onChange={(e) => setQForm({ ...qForm, id: e.target.value })}
                  className="px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-60"
                />
                <select
                  value={qForm.categoryId}
                  onChange={(e) => setQForm({ ...qForm, categoryId: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={qForm.topicId}
                  onChange={(e) => setQForm({ ...qForm, topicId: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  {topics.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  placeholder="Question Text (English)"
                  value={qForm.questionText}
                  onChange={(e) => setQForm({ ...qForm, questionText: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="text"
                  placeholder="Question Text (Hindi - optional)"
                  value={qForm.questionTextHi ?? ''}
                  onChange={(e) => setQForm({ ...qForm, questionTextHi: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select
                  value={qForm.questionType}
                  onChange={(e) => setQForm({ ...qForm, questionType: e.target.value as QuestionType })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="direct">Direct</option>
                  <option value="mcq">MCQ</option>
                  <option value="fill_blank">Fill Blank</option>
                  <option value="missing_number">Missing Number</option>
                  <option value="reverse">Reverse</option>
                  <option value="true_false">True / False</option>
                  <option value="identify_incorrect">Identify Incorrect</option>
                </select>
                <select
                  value={qForm.difficulty}
                  onChange={(e) => setQForm({ ...qForm, difficulty: e.target.value as Difficulty })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Correct Answer"
                  value={qForm.correctAnswer}
                  onChange={(e) => setQForm({ ...qForm, correctAnswer: e.target.value })}
                  className="px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Marks"
                  value={qForm.marks}
                  onChange={(e) => setQForm({ ...qForm, marks: Number(e.target.value) })}
                  className="px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((idx) => (
                  <input
                    key={idx}
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={qForm.options[idx] ?? ''}
                    onChange={(e) => {
                      const next = [...qForm.options];
                      next[idx] = e.target.value;
                      setQForm({ ...qForm, options: next });
                    }}
                    className="px-3 py-1.5 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <textarea
                  rows={2}
                  placeholder="Explanation (English)"
                  value={qForm.explanation}
                  onChange={(e) => setQForm({ ...qForm, explanation: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <textarea
                  rows={2}
                  placeholder="Explanation (Hindi)"
                  value={qForm.explanationHi ?? ''}
                  onChange={(e) => setQForm({ ...qForm, explanationHi: e.target.value })}
                  className="px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={qForm.active}
                    onChange={(e) => setQForm({ ...qForm, active: e.target.checked })}
                    className="rounded accent-blue-600"
                  />
                  Active in Question Bank
                </label>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
                >
                  Save & Publish Question
                </button>
              </div>
            </form>
          )}

          {/* Question Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  <tr>
                    <th className="py-2.5 px-4 font-medium">ID</th>
                    <th className="py-2.5 px-4 font-medium">Question</th>
                    <th className="py-2.5 px-3 font-medium">Topic</th>
                    <th className="py-2.5 px-3 font-medium">Difficulty</th>
                    <th className="py-2.5 px-3 font-medium">Answer</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {pagedQuestions.map((q) => (
                    <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{q.id}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-900 dark:text-white max-w-xs truncate">
                        {q.questionText}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300">{q.topicId}</td>
                      <td className="py-2.5 px-3 text-xs capitalize">{q.difficulty}</td>
                      <td className="py-2.5 px-3 font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {q.correctAnswer}
                      </td>
                      <td className="py-2.5 px-3 text-xs">
                        <button
                          onClick={() => void handleToggleQuestionActive(q)}
                          className={`font-medium ${q.active ? 'text-emerald-600' : 'text-slate-400'}`}
                        >
                          {q.active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="py-2.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setEditingQ(q);
                            setQForm({
                              ...q,
                              options: [q.options[0] ?? '', q.options[1] ?? '', q.options[2] ?? '', q.options[3] ?? ''],
                            });
                            setQFormOpen(true);
                          }}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void handleDeleteQuestion(q.id)}
                          className="text-xs text-rose-600 hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pagedQuestions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                        No questions match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span className="font-mono tabular-nums">
                Showing {pagedQuestions.length} of {filteredQuestions.length} questions (Page {qPage}/{totalPages})
              </span>
              <div className="flex gap-2">
                <button
                  disabled={qPage <= 1}
                  onClick={() => setQPage((p) => p - 1)}
                  className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  disabled={qPage >= totalPages}
                  onClick={() => setQPage((p) => p + 1)}
                  className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. BULK IMPORT / EXPORT */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                  Bulk CSV, Excel & JSON Import / Export
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Download a formatted template, upload your file to validate columns and duplicate IDs, and confirm batch publishing to Firestore.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleDownloadSampleTemplate('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  Excel Template (.xlsx)
                </button>
                <button
                  onClick={() => handleDownloadSampleTemplate('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  <Download className="w-3.5 h-3.5" />
                  CSV Template (.csv)
                </button>
                <button
                  onClick={() => handleExportQuestions('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg"
                >
                  Export Bank (.xlsx)
                </button>
                <button
                  onClick={() => handleExportQuestions('json')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg"
                >
                  Export Bank (.json)
                </button>
              </div>
            </div>

            <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl cursor-pointer hover:border-blue-500 transition-colors">
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Select CSV, Excel (.xlsx/.xls), or JSON file to validate
              </span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                onChange={handleUploadImportFile}
                className="hidden"
              />
            </label>

            {importSummary && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-sm">
                Import completed: <span className="font-mono font-semibold">{importSummary.succeeded}</span> succeeded,{' '}
                <span className="font-mono font-semibold">{importSummary.failed}</span> failed.
              </div>
            )}

            {parsedRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    Preview: <span className="font-mono text-emerald-600">{parsedRows.filter((r) => !r.errors.length).length} valid</span>{' '}
                    · <span className="font-mono text-rose-600">{parsedRows.filter((r) => r.errors.length).length} invalid</span>
                  </div>
                  <button
                    onClick={handleConfirmBulkImport}
                    disabled={parsedRows.every((r) => r.errors.length > 0) || loading}
                    className="px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40"
                  >
                    Confirm & Publish Valid Rows
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {parsedRows.map((row) => (
                    <div key={row.rowNum} className="p-3 flex items-start justify-between gap-4">
                      <div>
                        <span className="font-mono font-semibold">Row {row.rowNum} ({row.rawId}):</span>{' '}
                        <span>{row.rawText}</span>
                      </div>
                      {row.errors.length === 0 ? (
                        <span className="text-emerald-600 font-medium shrink-0">Valid</span>
                      ) : (
                        <span className="text-rose-600 shrink-0">{row.errors.join('; ')}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. GENERATOR CONFIGURATIONS */}
      {activeTab === 'generators' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {generatorConfigs.map((cfg) => (
            <GeneratorConfigCard
              key={cfg.id}
              config={cfg}
              onSave={(updated) => void handleSaveGeneratorConfig(updated)}
            />
          ))}
          {generatorConfigs.length === 0 && (
            <div className="md:col-span-2 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-sm text-slate-500">
              No generator configs in cloud yet. Click &quot;Initialize Cloud Seed Bank&quot; to publish default bounds.
            </div>
          )}
        </div>
      )}

      {/* 7. REPORTED QUESTIONS */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 divide-y divide-slate-200 dark:divide-slate-800">
          {reports.length === 0 ? (
            <p className="text-sm text-slate-500">No student question reports submitted yet.</p>
          ) : (
            reports.map((rep) => (
              <div key={rep.id} className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-mono text-slate-500">
                    Question: {rep.questionId} · Topic: {rep.topicId} · Status: {rep.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-slate-900 dark:text-white mt-0.5">{rep.reason}</div>
                </div>
                <button
                  onClick={async () => {
                    await resolveReportCloud(rep.id, rep.status === 'open' ? 'resolved' : 'open');
                    await loadCloudAdminData();
                  }}
                  className="px-3 py-1.5 text-xs font-medium border border-slate-300 dark:border-slate-700 rounded-lg"
                >
                  {rep.status === 'open' ? 'Mark Resolved' : 'Reopen'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* 8. SCHEDULED TEST EVENTS MANAGEMENT */}
      {activeTab === 'events' && firebaseUser && (
        <AdminEventsManager
          adminUid={firebaseUser.uid}
          topics={topics}
          questions={questions}
          generatorConfigs={generatorConfigs}
          onNotify={notify}
        />
      )}
    </div>
  );
};

const GeneratorConfigCard: React.FC<{
  config: GeneratorConfig;
  onSave: (cfg: GeneratorConfig) => void;
}> = ({ config, onSave }) => {
  const [form, setForm] = useState<GeneratorConfig>(config);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-semibold text-sm capitalize text-slate-900 dark:text-white">
          <Sliders className="w-4 h-4 text-blue-600" />
          {form.topicKey.replace('_', ' ')} Generator
        </div>
        <label className="inline-flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            className="rounded accent-blue-600"
          />
          Enabled
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Minimum Number</label>
          <input
            type="number"
            value={form.minNumber}
            onChange={(e) => setForm({ ...form, minNumber: Number(e.target.value) })}
            className="w-full px-3 py-1.5 text-sm font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Maximum Number</label>
          <input
            type="number"
            value={form.maxNumber}
            onChange={(e) => setForm({ ...form, maxNumber: Number(e.target.value) })}
            className="w-full px-3 py-1.5 text-sm font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
          />
        </div>
        {form.topicKey === 'di_addition' && (
          <>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Digit Length</label>
              <input
                type="number"
                min={1}
                max={9}
                value={form.digitLength ?? 4}
                onChange={(e) => setForm({ ...form, digitLength: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Number of Terms</label>
              <input
                type="number"
                min={2}
                max={10}
                value={form.termCount ?? 4}
                onChange={(e) => setForm({ ...form, termCount: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </>
        )}
        {form.topicKey === 'fractions' && (
          <>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Numerator Max</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={form.numeratorMax ?? 15}
                onChange={(e) => setForm({ ...form, numeratorMax: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Denominator Max</label>
              <input
                type="number"
                min={2}
                max={1000}
                value={form.denominatorMax ?? 16}
                onChange={(e) => setForm({ ...form, denominatorMax: Number(e.target.value) })}
                className="w-full px-3 py-1.5 text-sm font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </>
        )}
      </div>

      <button
        type="submit"
        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700"
      >
        Save & Sync to Students
      </button>
    </form>
  );
};
