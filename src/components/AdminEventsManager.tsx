import React, { useCallback, useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Edit3,
  Gift,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import {
  computeAndSaveEventRankingsAdmin,
  deleteEventAdmin,
  EVENT_BANNER_PRESETS,
  fetchAllEventsAdmin,
  fetchEventRegistrationsAdmin,
  fetchEventSubmissionsAdmin,
  getEventBannerVisual,
  publishEventResultsAdmin,
  saveEventAndPaperAdmin,
  updateRegistrationAdmin,
  verifyWinnerAdmin,
} from '../services/eventService';
import type {
  EventBannerPreset,
  EventPrize,
  EventRegistration,
  EventSubmission,
  GeneratorConfig,
  Question,
  SessionDifficulty,
  TestEvent,
  Topic,
} from '../types/math';

interface AdminEventsManagerProps {
  adminUid: string;
  topics: Topic[];
  questions: Question[];
  generatorConfigs: GeneratorConfig[];
  onNotify: (type: 'ok' | 'err', text: string) => void;
}

function toDatetimeLocalValue(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(val: string): number {
  const parsed = new Date(val).getTime();
  return Number.isNaN(parsed) ? Date.now() : parsed;
}

export const AdminEventsManager: React.FC<AdminEventsManagerProps> = ({
  adminUid,
  topics,
  questions,
  generatorConfigs,
  onNotify,
}) => {
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Create / Edit Form State
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [regeneratePaper, setRegeneratePaper] = useState(false);

  const defaultNow = Date.now();
  const [title, setTitle] = useState('');
  const [titleHi, setTitleHi] = useState('');
  const [description, setDescription] = useState('');
  const [bannerPreset, setBannerPreset] = useState<EventBannerPreset>('championship');
  const [bannerUrl, setBannerUrl] = useState('');
  const [regOpenStr, setRegOpenStr] = useState(() => toDatetimeLocalValue(defaultNow));
  const [regCloseStr, setRegCloseStr] = useState(() => toDatetimeLocalValue(defaultNow + 24 * 3600 * 1000));
  const [startStr, setStartStr] = useState(() => toDatetimeLocalValue(defaultNow + 25 * 3600 * 1000));
  const [endStr, setEndStr] = useState(() => toDatetimeLocalValue(defaultNow + 26 * 3600 * 1000));
  const [durationMin, setDurationMin] = useState(30);
  const [totalQuestions, setTotalQuestions] = useState(25);
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(() =>
    topics.slice(0, 6).map((t) => t.id)
  );
  const [difficulty, setDifficulty] = useState<SessionDifficulty>('mixed');
  const [marksPerQuestion, setMarksPerQuestion] = useState(2);
  const [negativeMarking, setNegativeMarking] = useState(0.5);
  const [maxParticipants, setMaxParticipants] = useState(0);
  const [registrationType, setRegistrationType] = useState<'free' | 'paid'>('free');
  const [entryFee, setEntryFee] = useState(0);
  const [status, setStatus] = useState<TestEvent['status']>('published');
  const [prizes, setPrizes] = useState<EventPrize[]>([
    { rankLabel: '1st Prize', title: 'Cash Prize + Merit Certificate', prizeType: 'cash', valueText: '₹5,000' },
    { rankLabel: '2nd Prize', title: 'Sports Bicycle', prizeType: 'item', valueText: 'Worth ₹4,000' },
    { rankLabel: '3rd Prize', title: 'Gift Voucher', prizeType: 'voucher', valueText: '₹1,500' },
  ]);

  // Selected event management workspace
  const [managedEvent, setManagedEvent] = useState<TestEvent | null>(null);
  const [manageTab, setManageTab] = useState<'registrations' | 'results'>('registrations');
  const [regs, setRegs] = useState<EventRegistration[]>([]);
  const [subs, setSubs] = useState<EventSubmission[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAllEventsAdmin();
      setEvents(list);
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Failed to load test events.');
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const loadWorkspace = async (ev: TestEvent) => {
    setManagedEvent(ev);
    setWorkspaceLoading(true);
    try {
      const [regList, subList] = await Promise.all([
        fetchEventRegistrationsAdmin(ev.id),
        fetchEventSubmissionsAdmin(ev.id),
      ]);
      setRegs(regList);
      setSubs(subList);
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Failed to load event participants.');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const openCreateForm = () => {
    const now = Date.now();
    setEditingId(null);
    setRegeneratePaper(true);
    setTitle('');
    setTitleHi('');
    setDescription('');
    setBannerPreset('championship');
    setBannerUrl('');
    setRegOpenStr(toDatetimeLocalValue(now));
    setRegCloseStr(toDatetimeLocalValue(now + 48 * 3600 * 1000));
    setStartStr(toDatetimeLocalValue(now + 49 * 3600 * 1000));
    setEndStr(toDatetimeLocalValue(now + 50 * 3600 * 1000));
    setDurationMin(30);
    setTotalQuestions(25);
    setSelectedTopicIds(topics.slice(0, 6).map((t) => t.id));
    setDifficulty('mixed');
    setMarksPerQuestion(2);
    setNegativeMarking(0.5);
    setMaxParticipants(0);
    setRegistrationType('free');
    setEntryFee(0);
    setStatus('published');
    setPrizes([
      { rankLabel: '1st Prize', title: 'Cash Prize + Merit Certificate', prizeType: 'cash', valueText: '₹5,000' },
      { rankLabel: '2nd Prize', title: 'Sports Bicycle', prizeType: 'item', valueText: 'Worth ₹4,000' },
      { rankLabel: '3rd Prize', title: 'Gift Voucher', prizeType: 'voucher', valueText: '₹1,500' },
    ]);
    setFormOpen(true);
  };

  const openEditForm = (ev: TestEvent) => {
    setEditingId(ev.id);
    setRegeneratePaper(false);
    setTitle(ev.title);
    setTitleHi(ev.titleHi ?? '');
    setDescription(ev.description);
    setBannerPreset(ev.bannerPreset);
    setBannerUrl(ev.bannerUrl ?? '');
    setRegOpenStr(toDatetimeLocalValue(ev.regOpenAtMs));
    setRegCloseStr(toDatetimeLocalValue(ev.regCloseAtMs));
    setStartStr(toDatetimeLocalValue(ev.startAtMs));
    setEndStr(toDatetimeLocalValue(ev.endAtMs));
    setDurationMin(ev.durationMin);
    setTotalQuestions(ev.totalQuestions);
    setSelectedTopicIds(ev.topicIds);
    setDifficulty(ev.difficulty);
    setMarksPerQuestion(ev.marksPerQuestion);
    setNegativeMarking(ev.negativeMarking);
    setMaxParticipants(ev.maxParticipants);
    setRegistrationType(ev.registrationType);
    setEntryFee(ev.entryFee);
    setStatus(ev.status);
    setPrizes(ev.prizes.length > 0 ? ev.prizes : []);
    setFormOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const regOpenAtMs = fromDatetimeLocalValue(regOpenStr);
    const regCloseAtMs = fromDatetimeLocalValue(regCloseStr);
    const startAtMs = fromDatetimeLocalValue(startStr);
    const endAtMs = fromDatetimeLocalValue(endStr);

    if (!title.trim()) {
      onNotify('err', 'Event title is required.');
      return;
    }
    if (regCloseAtMs <= regOpenAtMs) {
      onNotify('err', 'Registration closing time must be after registration opening time.');
      return;
    }
    if (endAtMs <= startAtMs) {
      onNotify('err', 'Test end time must be after test start time.');
      return;
    }
    if (selectedTopicIds.length === 0) {
      onNotify('err', 'Select at least one mathematics topic for this event.');
      return;
    }

    setSaving(true);
    const isNew = !editingId;
    const eventId = editingId || `evt_${Date.now()}`;
    const existing = events.find((item) => item.id === eventId);

    try {
      await saveEventAndPaperAdmin(
        {
          id: eventId,
          title: title.trim(),
          titleHi: titleHi.trim(),
          description: description.trim() || 'Competitive Mathematics Scheduled Test Event',
          descriptionHi: '',
          bannerPreset,
          bannerUrl: bannerUrl.trim(),
          regOpenAtMs,
          regCloseAtMs,
          startAtMs,
          endAtMs,
          durationMin,
          totalQuestions,
          topicIds: selectedTopicIds,
          difficulty,
          marksPerQuestion,
          negativeMarking,
          maxParticipants,
          registeredCount: existing?.registeredCount ?? 0,
          registrationType,
          entryFee: registrationType === 'paid' ? entryFee : 0,
          currency: 'INR',
          prizes: prizes.filter((p) => p.rankLabel.trim() && p.title.trim()),
          status,
          resultsPublished: existing?.resultsPublished ?? false,
          publishedResultCount: existing?.publishedResultCount ?? 0,
          createdBy: existing?.createdBy ?? adminUid,
        },
        isNew,
        adminUid,
        questions,
        generatorConfigs,
        regeneratePaper
      );
      setFormOpen(false);
      await loadEvents();
      onNotify('ok', `Test event "${title.trim()}" ${isNew ? 'created' : 'updated'} and official exam paper ready.`);
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Failed to save test event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (ev: TestEvent) => {
    try {
      await deleteEventAdmin(ev.id);
      if (managedEvent?.id === ev.id) setManagedEvent(null);
      await loadEvents();
      onNotify('ok', `Deleted event "${ev.title}".`);
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  const handleComputeRankings = async () => {
    if (!managedEvent) return;
    setWorkspaceLoading(true);
    try {
      const ranked = await computeAndSaveEventRankingsAdmin(managedEvent, subs);
      setSubs(ranked);
      onNotify('ok', `Computed rankings for ${ranked.length} participant(s).`);
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Failed to compute rankings.');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  const handlePublishResults = async (publishFlag: boolean) => {
    if (!managedEvent) return;
    setWorkspaceLoading(true);
    try {
      await publishEventResultsAdmin(managedEvent.id, subs, publishFlag);
      const updatedEv = { ...managedEvent, resultsPublished: publishFlag };
      setManagedEvent(updatedEv);
      setSubs((prev) => prev.map((s) => ({ ...s, resultsPublished: publishFlag })));
      await loadEvents();
      onNotify(
        'ok',
        publishFlag
          ? `Final results & winner announcements published for "${managedEvent.title}"!`
          : `Results unpublished for "${managedEvent.title}".`
      );
    } catch (err) {
      onNotify('err', err instanceof Error ? err.message : 'Failed to publish results.');
    } finally {
      setWorkspaceLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Scheduled Competitive Test Events
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create scheduled contests, configure prizes & limits, verify paid registrations, compute rankings, and publish winner announcements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadEvents()}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateForm}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Create Test Event
          </button>
        </div>
      </div>

      {/* Create / Edit Event Form */}
      {formOpen && (
        <form
          onSubmit={handleSaveEvent}
          className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900 rounded-2xl p-6 space-y-5 shadow-sm"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editingId ? `Edit Event (${editingId})` : 'Create New Scheduled Test Event'}
            </h3>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Event Name (English) *</label>
              <input
                type="text"
                required
                maxLength={120}
                placeholder="e.g., All-India Speed Math Championship"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Event Name (Hindi, optional)</label>
              <input
                type="text"
                maxLength={140}
                placeholder="e.g., अखिल भारतीय गणित प्रतियोगिता"
                value={titleHi}
                onChange={(e) => setTitleHi(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Description & Rules</label>
            <textarea
              rows={2}
              maxLength={1000}
              placeholder="Syllabus highlights, winner announcement details, and eligibility..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          {/* Banner Preset & Optional URL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Banner Theme Preset</label>
              <select
                value={bannerPreset}
                onChange={(e) => setBannerPreset(e.target.value as EventBannerPreset)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                {Object.entries(EVENT_BANNER_PRESETS).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Custom Banner Image URL (optional)
              </label>
              <input
                type="url"
                maxLength={500}
                placeholder="Leave blank to use preset artwork"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Dates & Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Registration Opens</label>
              <input
                type="datetime-local"
                required
                value={regOpenStr}
                onChange={(e) => setRegOpenStr(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Registration Closes</label>
              <input
                type="datetime-local"
                required
                value={regCloseStr}
                onChange={(e) => setRegCloseStr(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Test Start Time</label>
              <input
                type="datetime-local"
                required
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Test Window Ends</label>
              <input
                type="datetime-local"
                required
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          {/* Exam Specs & Limits */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Duration (m)</label>
              <input
                type="number"
                min={5}
                max={180}
                value={durationMin}
                onChange={(e) => setDurationMin(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Questions</label>
              <input
                type="number"
                min={5}
                max={100}
                value={totalQuestions}
                onChange={(e) => setTotalQuestions(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as SessionDifficulty)}
                className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="mixed">Mixed</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Marks / Q</label>
              <input
                type="number"
                min={1}
                max={10}
                step={0.5}
                value={marksPerQuestion}
                onChange={(e) => setMarksPerQuestion(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Neg. Mark</label>
              <input
                type="number"
                min={0}
                max={5}
                step={0.25}
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Max Seats (0=∞)</label>
              <input
                type="number"
                min={0}
                max={100000}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reg Type</label>
              <select
                value={registrationType}
                onChange={(e) => setRegistrationType(e.target.value as 'free' | 'paid')}
                className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              >
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Fee (₹)</label>
              <input
                type="number"
                min={0}
                max={10000}
                disabled={registrationType === 'free'}
                value={registrationType === 'free' ? 0 : entryFee}
                onChange={(e) => setEntryFee(Number(e.target.value))}
                className="w-full px-2.5 py-2 text-xs font-mono rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-45"
              />
            </div>
          </div>

          {/* Topics */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Syllabus Topics ({selectedTopicIds.length} selected)
              </label>
              <button
                type="button"
                onClick={() => setSelectedTopicIds(topics.map((t) => t.id))}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Select All Topics
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {topics.map((tp) => {
                const chosen = selectedTopicIds.includes(tp.id);
                return (
                  <button
                    key={tp.id}
                    type="button"
                    onClick={() =>
                      setSelectedTopicIds((prev) =>
                        prev.includes(tp.id) ? prev.filter((id) => id !== tp.id) : [...prev, tp.id]
                      )
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                      chosen
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {tp.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prizes Configuration */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-500" />
                Winner Prizes & Rewards ({prizes.length})
              </label>
              <button
                type="button"
                onClick={() =>
                  setPrizes((prev) => [
                    ...prev,
                    { rankLabel: `${prev.length + 1}th Prize`, title: 'Merit Certificate', prizeType: 'certificate', valueText: '' },
                  ])
                }
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                + Add Prize Tier
              </button>
            </div>

            <div className="space-y-2">
              {prizes.map((pz, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Rank (e.g. 1st Prize)"
                    value={pz.rankLabel}
                    onChange={(e) => {
                      const next = [...prizes];
                      next[idx] = { ...pz, rankLabel: e.target.value };
                      setPrizes(next);
                    }}
                    className="sm:col-span-3 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="Prize Title (e.g. Bicycle / Cash)"
                    value={pz.title}
                    onChange={(e) => {
                      const next = [...prizes];
                      next[idx] = { ...pz, title: e.target.value };
                      setPrizes(next);
                    }}
                    className="sm:col-span-4 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <select
                    value={pz.prizeType}
                    onChange={(e) => {
                      const next = [...prizes];
                      next[idx] = { ...pz, prizeType: e.target.value as EventPrize['prizeType'] };
                      setPrizes(next);
                    }}
                    className="sm:col-span-2 px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="cash">Cash</option>
                    <option value="item">Item (Bicycle, etc.)</option>
                    <option value="voucher">Gift Voucher</option>
                    <option value="certificate">Certificate</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Value (e.g. ₹5,000)"
                    value={pz.valueText}
                    onChange={(e) => {
                      const next = [...prizes];
                      next[idx] = { ...pz, valueText: e.target.value };
                      setPrizes(next);
                    }}
                    className="sm:col-span-2 px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setPrizes((prev) => prev.filter((_, i) => i !== idx))}
                    className="sm:col-span-1 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg justify-self-center"
                    aria-label="Remove prize"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Publish Status & Save */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600 dark:text-slate-300">Event Visibility:</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TestEvent['status'])}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="published">Published (Live to Students)</option>
                  <option value="draft">Draft (Hidden)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {editingId && (
                <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={regeneratePaper}
                    onChange={(e) => setRegeneratePaper(e.target.checked)}
                    className="rounded accent-indigo-600"
                  />
                  Regenerate Official Exam Paper
                </label>
              )}
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {editingId ? 'Update Event & Sync' : 'Publish Test Event'}
            </button>
          </div>
        </form>
      )}

      {/* Existing Events List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {events.map((ev) => {
          const visual = getEventBannerVisual(ev.bannerPreset, ev.bannerUrl);
          return (
            <div
              key={ev.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between"
            >
              <div className={`h-24 relative bg-gradient-to-r ${visual.gradientClass} p-4 flex items-end justify-between text-white`}>
                {visual.effectiveImageUrl && (
                  <img
                    src={visual.effectiveImageUrl}
                    alt={ev.title}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                    className="absolute inset-0 w-full h-full object-cover opacity-55"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 to-transparent" />
                <div className="relative">
                  <div className="text-[11px] font-mono uppercase text-amber-300">
                    {ev.status} · {ev.registrationType === 'free' ? 'FREE' : `₹${ev.entryFee}`} ·{' '}
                    {ev.resultsPublished ? 'RESULTS PUBLISHED' : 'RESULTS PENDING'}
                  </div>
                  <h3 className="text-base font-bold leading-snug">{ev.title}</h3>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                    {new Date(ev.startAtMs).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-emerald-500" />
                    {ev.registeredCount} / {ev.maxParticipants > 0 ? ev.maxParticipants : '∞'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => void loadWorkspace(ev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold rounded-lg hover:bg-indigo-100"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Manage Participants & Results
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditForm(ev)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600"
                      title="Edit event"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteEvent(ev)}
                      className="p-1.5 text-slate-500 hover:text-rose-600"
                      title="Delete event"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {!loading && events.length === 0 && (
          <div className="lg:col-span-2 p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center text-sm text-slate-500">
            No scheduled test events created yet. Click &quot;Create Test Event&quot; to organize your first competitive mathematics tournament.
          </div>
        )}
      </div>

      {/* PARTICIPANT, RANKINGS & PRIZE MANAGEMENT WORKSPACE */}
      {managedEvent && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400">
                Managing Event · {managedEvent.id}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{managedEvent.title}</h3>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs">
                <button
                  type="button"
                  onClick={() => setManageTab('registrations')}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    manageTab === 'registrations'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Registrations ({regs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setManageTab('results')}
                  className={`px-3 py-1.5 rounded-lg font-semibold ${
                    manageTab === 'results'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  Results & Winners ({subs.length})
                </button>
              </div>

              <button
                type="button"
                onClick={() => setManagedEvent(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-500 border border-slate-300 dark:border-slate-700 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>

          {workspaceLoading ? (
            <div className="py-10 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              Loading participants & scores...
            </div>
          ) : manageTab === 'registrations' ? (
            regs.length === 0 ? (
              <p className="text-sm text-slate-500">No students have registered for this event yet.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 text-xs">
                    <tr>
                      <th className="py-2.5 px-4">Student</th>
                      <th className="py-2.5 px-4">Email</th>
                      <th className="py-2.5 px-4">Fee</th>
                      <th className="py-2.5 px-4">Payment Status</th>
                      <th className="py-2.5 px-4">Registration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {regs.map((r) => (
                      <tr key={r.id}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {r.userName}
                          <div className="text-[11px] font-normal text-slate-500">{r.targetExam}</div>
                        </td>
                        <td className="py-2.5 px-4 font-mono text-xs text-slate-500">{r.userEmail}</td>
                        <td className="py-2.5 px-4 font-mono">
                          {r.registrationType === 'free' ? 'Free' : `₹${r.feeAmount}`}
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={r.paymentStatus}
                            onChange={async (e) => {
                              const nextPay = e.target.value as EventRegistration['paymentStatus'];
                              await updateRegistrationAdmin(r.id, {
                                paymentStatus: nextPay,
                                status: r.status,
                              });
                              setRegs((prev) =>
                                prev.map((item) =>
                                  item.id === r.id ? { ...item, paymentStatus: nextPay } : item
                                )
                              );
                              onNotify('ok', `Updated payment status for ${r.userName}.`);
                            }}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <option value="free">Free</option>
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="waived">Waived</option>
                          </select>
                        </td>
                        <td className="py-2.5 px-4">
                          <select
                            value={r.status}
                            onChange={async (e) => {
                              const nextSt = e.target.value as EventRegistration['status'];
                              await updateRegistrationAdmin(r.id, {
                                paymentStatus: r.paymentStatus,
                                status: nextSt,
                              });
                              setRegs((prev) =>
                                prev.map((item) => (item.id === r.id ? { ...item, status: nextSt } : item))
                              );
                            }}
                            className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                          >
                            <option value="registered">Registered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Step 1: Compute Rankings → Step 2: Verify Top Winners & Prize Status → Step 3: Publish Results
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={subs.length === 0}
                    onClick={() => void handleComputeRankings()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-45"
                  >
                    <Award className="w-3.5 h-3.5" />
                    Compute Official Rankings
                  </button>
                  <button
                    type="button"
                    disabled={subs.length === 0}
                    onClick={() => void handlePublishResults(!managedEvent.resultsPublished)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl disabled:opacity-45 ${
                      managedEvent.resultsPublished
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {managedEvent.resultsPublished
                      ? 'Unpublish Results'
                      : 'Publish Final Results & Winners'}
                  </button>
                </div>
              </div>

              {subs.length === 0 ? (
                <p className="text-sm text-slate-500">No exam submissions received for this event yet.</p>
              ) : (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500">
                      <tr>
                        <th className="py-2.5 px-3">Rank</th>
                        <th className="py-2.5 px-3">Participant</th>
                        <th className="py-2.5 px-3 text-right">Score</th>
                        <th className="py-2.5 px-3 text-right">Time</th>
                        <th className="py-2.5 px-3">Winner Verified</th>
                        <th className="py-2.5 px-3">Assigned Prize</th>
                        <th className="py-2.5 px-3">Prize Distribution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {subs.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2.5 px-3 font-mono font-bold">#{s.rank || '—'}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {s.userName}
                            <div className="text-[11px] font-mono text-slate-500">
                              {s.correctAnswers}/{s.totalQuestions} · {s.accuracy}%
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                            {s.score}/{s.maxScore}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {Math.floor(s.timeTakenSec / 60)}m {s.timeTakenSec % 60}s
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={s.isWinnerVerified}
                              onChange={async (e) => {
                                const verified = e.target.checked;
                                const nextPrizeStatus =
                                  verified && s.prizeStatus === 'none' ? 'verified' : s.prizeStatus;
                                await verifyWinnerAdmin(s.id, {
                                  isWinnerVerified: verified,
                                  prizeTitle: s.prizeTitle,
                                  prizeRankLabel: s.prizeRankLabel,
                                  prizeStatus: nextPrizeStatus,
                                  status: s.status,
                                });
                                setSubs((prev) =>
                                  prev.map((item) =>
                                    item.id === s.id
                                      ? { ...item, isWinnerVerified: verified, prizeStatus: nextPrizeStatus }
                                      : item
                                  )
                                );
                              }}
                              className="rounded accent-emerald-600"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <input
                              type="text"
                              placeholder="Prize title..."
                              value={s.prizeTitle}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubs((prev) =>
                                  prev.map((item) => (item.id === s.id ? { ...item, prizeTitle: val } : item))
                                );
                              }}
                              onBlur={async () => {
                                await verifyWinnerAdmin(s.id, {
                                  isWinnerVerified: s.isWinnerVerified,
                                  prizeTitle: s.prizeTitle,
                                  prizeRankLabel: s.prizeRankLabel,
                                  prizeStatus: s.prizeStatus,
                                  status: s.status,
                                });
                              }}
                              className="w-40 px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <select
                              value={s.prizeStatus}
                              onChange={async (e) => {
                                const nextStatus = e.target.value as EventSubmission['prizeStatus'];
                                await verifyWinnerAdmin(s.id, {
                                  isWinnerVerified: s.isWinnerVerified,
                                  prizeTitle: s.prizeTitle,
                                  prizeRankLabel: s.prizeRankLabel,
                                  prizeStatus: nextStatus,
                                  status: s.status,
                                });
                                setSubs((prev) =>
                                  prev.map((item) =>
                                    item.id === s.id ? { ...item, prizeStatus: nextStatus } : item
                                  )
                                );
                                onNotify('ok', `Updated prize status for ${s.userName}.`);
                              }}
                              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                            >
                              <option value="none">None</option>
                              <option value="pending">Pending</option>
                              <option value="verified">Verified</option>
                              <option value="disbursed">Disbursed</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
