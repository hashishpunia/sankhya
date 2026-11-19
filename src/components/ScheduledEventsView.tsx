import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Gift,
  Loader2,
  Lock,
  Play,
  Radio,
  RefreshCw,
  ShieldCheck,
  Ticket,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';
import { t } from '../i18n/translations';
import {
  cancelRegistrationAtomic,
  fetchMyEventRegistrations,
  fetchMyEventSubmissions,
  fetchPublishedEvents,
  fetchPublishedLeaderboard,
  formatCountdownMs,
  getEventBannerVisual,
  getEventPhase,
  registerForEventAtomic,
} from '../services/eventService';
import type {
  EventRegistration,
  EventSubmission,
  Language,
  TestEvent,
} from '../types/math';
import { ScheduledExamRunner } from './ScheduledExamRunner';

interface ScheduledEventsViewProps {
  onRequireSignIn?: () => void;
  onEventsSummary?: (summary: { total: number; liveOrOpen: number }) => void;
}

type EventsSubTab = 'browse' | 'my_events';
type BrowseFilter = 'all' | 'live' | 'upcoming' | 'past';

export const ScheduledEventsView: React.FC<ScheduledEventsViewProps> = ({
  onRequireSignIn,
  onEventsSummary,
}) => {
  const { firebaseUser, userProfile, isGuest, topics, settings } = usePlatform();
  const lang: Language = settings.language;

  const [subTab, setSubTab] = useState<EventsSubTab>('browse');
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>('all');
  const [events, setEvents] = useState<TestEvent[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [submissions, setSubmissions] = useState<EventSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Modals / Active Exam
  const [detailEvent, setDetailEvent] = useState<TestEvent | null>(null);
  const [leaderboardEvent, setLeaderboardEvent] = useState<TestEvent | null>(null);
  const [leaderboardRows, setLeaderboardRows] = useState<EventSubmission[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [activeExamEvent, setActiveExamEvent] = useState<TestEvent | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const loadEventsData = useCallback(async () => {
    setLoading(true);
    try {
      const evList = await fetchPublishedEvents();
      setEvents(evList);
      if (firebaseUser) {
        const [regs, subs] = await Promise.all([
          fetchMyEventRegistrations(firebaseUser.uid),
          fetchMyEventSubmissions(firebaseUser.uid),
        ]);
        setRegistrations(regs);
        setSubmissions(subs);
      } else {
        setRegistrations([]);
        setSubmissions([]);
      }
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to load scheduled test events.',
      });
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    void loadEventsData();
  }, [loadEventsData]);

  useEffect(() => {
    if (!onEventsSummary || loading) return;
    const liveOrOpen = events.filter((ev) => {
      const phase = getEventPhase(ev, nowMs);
      return phase === 'live' || phase === 'reg_open';
    }).length;
    onEventsSummary({ total: events.length, liveOrOpen });
  }, [events, loading, nowMs, onEventsSummary]);

  const regMap = useMemo(() => {
    const m = new Map<string, EventRegistration>();
    for (const r of registrations) m.set(r.eventId, r);
    return m;
  }, [registrations]);

  const subMap = useMemo(() => {
    const m = new Map<string, EventSubmission>();
    for (const s of submissions) m.set(s.eventId, s);
    return m;
  }, [submissions]);

  const topicNameMap = useMemo(() => {
    const m = new Map<string, string>();
    for (const tp of topics) m.set(tp.id, lang === 'hi' ? tp.nameHi : tp.name);
    return m;
  }, [lang, topics]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const phase = getEventPhase(ev, nowMs);
      if (browseFilter === 'live') return phase === 'live';
      if (browseFilter === 'upcoming')
        return phase === 'upcoming_reg_soon' || phase === 'reg_open' || phase === 'reg_closed_waiting';
      if (browseFilter === 'past') return phase === 'ended';
      return true;
    });
  }, [browseFilter, events, nowMs]);

  const myEventsList = useMemo(() => {
    return events.filter((ev) => regMap.has(ev.id) || subMap.has(ev.id));
  }, [events, regMap, subMap]);

  const showToast = (type: 'ok' | 'err', text: string) => {
    setFeedback({ type, text });
    window.setTimeout(() => setFeedback(null), 6000);
  };

  const handleRegister = async (ev: TestEvent) => {
    if (isGuest || !firebaseUser) {
      showToast('err', 'Please sign in with your account to register for scheduled test events.');
      onRequireSignIn?.();
      return;
    }
    if (!firebaseUser.emailVerified) {
      showToast('err', 'Please verify your email address or sign in with Google to register for events.');
      return;
    }
    setActionBusyId(ev.id);
    try {
      const reg = await registerForEventAtomic(ev.id, {
        uid: firebaseUser.uid,
        fullName: userProfile?.fullName || firebaseUser.displayName || 'Student',
        email: userProfile?.email || firebaseUser.email || '',
        targetExam: userProfile?.targetExam || 'Competitive Mathematics',
      });
      setRegistrations((prev) => [...prev.filter((r) => r.eventId !== ev.id), reg]);
      setEvents((prev) =>
        prev.map((item) =>
          item.id === ev.id ? { ...item, registeredCount: item.registeredCount + 1 } : item
        )
      );
      if (detailEvent?.id === ev.id) {
        setDetailEvent((prev) => (prev ? { ...prev, registeredCount: prev.registeredCount + 1 } : null));
      }
      showToast(
        'ok',
        reg.registrationType === 'paid'
          ? `Registered for "${ev.title}". Payment verification is pending admin confirmation.`
          : `Confirmed! You are registered for "${ev.title}".`
      );
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleCancelRegistration = async (ev: TestEvent) => {
    if (!firebaseUser) return;
    setActionBusyId(ev.id);
    try {
      await cancelRegistrationAtomic(ev.id, firebaseUser.uid);
      setRegistrations((prev) => prev.filter((r) => r.eventId !== ev.id));
      setEvents((prev) =>
        prev.map((item) =>
          item.id === ev.id ? { ...item, registeredCount: Math.max(0, item.registeredCount - 1) } : item
        )
      );
      if (detailEvent?.id === ev.id) {
        setDetailEvent((prev) =>
          prev ? { ...prev, registeredCount: Math.max(0, prev.registeredCount - 1) } : null
        );
      }
      showToast('ok', `Registration cancelled for "${ev.title}".`);
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Unable to cancel registration.');
    } finally {
      setActionBusyId(null);
    }
  };

  const openLeaderboard = async (ev: TestEvent) => {
    setLeaderboardEvent(ev);
    setLeaderboardLoading(true);
    try {
      const rows = await fetchPublishedLeaderboard(ev.id);
      setLeaderboardRows(rows);
    } catch (err) {
      showToast('err', err instanceof Error ? err.message : 'Failed to load leaderboard.');
      setLeaderboardRows([]);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // If currently inside a Scheduled Test Event Exam
  if (activeExamEvent) {
    return (
      <ScheduledExamRunner
        event={activeExamEvent}
        existingSubmission={subMap.get(activeExamEvent.id) ?? null}
        onExit={() => {
          setActiveExamEvent(null);
          void loadEventsData();
        }}
        onSubmitted={(sub) => {
          setSubmissions((prev) => [...prev.filter((s) => s.eventId !== sub.eventId), sub]);
        }}
        onOpenLeaderboard={(ev) => {
          setActiveExamEvent(null);
          void openLeaderboard(ev);
        }}
      />
    );
  }

  const renderPhaseBadge = (ev: TestEvent) => {
    const phase = getEventPhase(ev, nowMs);
    if (phase === 'live') {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
          <Radio className="w-3.5 h-3.5 text-emerald-400" />
          Live Now
        </span>
      );
    }
    if (phase === 'reg_open') {
      return (
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
          ● Registration Open
        </span>
      );
    }
    if (phase === 'upcoming_reg_soon') {
      return (
        <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
          Reg Opens Soon
        </span>
      );
    }
    if (phase === 'reg_closed_waiting') {
      return (
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-200">
          Reg Closed · Starts Soon
        </span>
      );
    }
    if (ev.resultsPublished) {
      return (
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
          ★ Results Published
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
        Completed
      </span>
    );
  };

  const renderEventCard = (ev: TestEvent) => {
    const phase = getEventPhase(ev, nowMs);
    const reg = regMap.get(ev.id);
    const sub = subMap.get(ev.id);
    const visual = getEventBannerVisual(ev.bannerPreset, ev.bannerUrl);
    const seatsFull = ev.maxParticipants > 0 && ev.registeredCount >= ev.maxParticipants;
    const isPaidConfirmed =
      reg?.status === 'registered' &&
      (reg.paymentStatus === 'free' || reg.paymentStatus === 'confirmed' || reg.paymentStatus === 'waived');

    const countdownTarget =
      phase === 'upcoming_reg_soon'
        ? { label: 'Reg opens in', ms: ev.regOpenAtMs - nowMs }
        : phase === 'reg_open'
          ? { label: 'Starts in', ms: ev.startAtMs - nowMs }
          : phase === 'reg_closed_waiting'
            ? { label: 'Starts in', ms: ev.startAtMs - nowMs }
            : phase === 'live'
              ? { label: 'Ends in', ms: ev.endAtMs - nowMs }
              : null;

    return (
      <article
        key={ev.id}
        className="rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:border-indigo-400 dark:hover:border-indigo-500"
      >
        <div>
          {/* Event Banner Artwork */}
          <div className={`relative h-40 bg-gradient-to-br ${visual.gradientClass} overflow-hidden`}>
            {visual.effectiveImageUrl && (
              <img
                src={visual.effectiveImageUrl}
                alt={ev.title}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
                className="absolute inset-0 w-full h-full object-cover opacity-80"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/45 to-slate-950/20" />
            <div className="relative h-full p-4 flex flex-col justify-between text-white">
              <div className="flex items-center justify-between gap-2">
                {renderPhaseBadge(ev)}
                <span className="px-2.5 py-0.5 rounded-lg bg-slate-950/70 border border-white/15 text-[11px] font-mono font-semibold">
                  {ev.registrationType === 'free' ? 'FREE ENTRY' : `₹${ev.entryFee}`}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold leading-snug line-clamp-2">
                  {lang === 'hi' && ev.titleHi ? ev.titleHi : ev.title}
                </h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-200 font-mono mt-1">
                  <span>{ev.totalQuestions} Qs</span>
                  <span>·</span>
                  <span>{ev.durationMin} min</span>
                  <span>·</span>
                  <span>
                    +{ev.marksPerQuestion} / -{ev.negativeMarking}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
              {lang === 'hi' && ev.descriptionHi ? ev.descriptionHi : ev.description}
            </p>

            {/* Schedule & Capacity */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Test Schedule
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                  {new Date(ev.startAtMs).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  ·{' '}
                  {new Date(ev.startAtMs).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Participants
                </div>
                <div className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100 mt-0.5">
                  {ev.registeredCount} / {ev.maxParticipants > 0 ? ev.maxParticipants : 'Unlimited'}
                </div>
              </div>
            </div>

            {/* Prizes Summary */}
            {ev.prizes.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200/70 dark:border-amber-900/60 space-y-1.5">
                <div className="text-[11px] font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" /> Winner Rewards
                </div>
                <div className="text-xs text-slate-700 dark:text-slate-200 space-y-0.5">
                  {ev.prizes.slice(0, 2).map((p, idx) => (
                    <div key={`${ev.id}_pz_${idx}`} className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{p.rankLabel}:</span>
                      <span className="truncate">
                        {p.title}
                        {p.valueText ? ` (${p.valueText})` : ''}
                      </span>
                    </div>
                  ))}
                  {ev.prizes.length > 2 && (
                    <div className="text-[11px] text-amber-700 dark:text-amber-400">
                      +{ev.prizes.length - 2} more prize tier(s)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Live Countdown Bar */}
            {countdownTarget && countdownTarget.ms > 0 && (
              <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 font-mono tabular-nums">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-indigo-500" />
                  {countdownTarget.label}
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {formatCountdownMs(countdownTarget.ms)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 pb-5 pt-2 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDetailEvent(ev)}
            className="px-3.5 py-2 text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Event Details
          </button>

          <div className="flex items-center gap-2">
            {ev.resultsPublished && (
              <button
                type="button"
                onClick={() => void openLeaderboard(ev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <Trophy className="w-3.5 h-3.5" />
                Leaderboard
              </button>
            )}

            {sub ? (
              <button
                type="button"
                onClick={() => setActiveExamEvent(ev)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Score: {sub.score}
              </button>
            ) : reg && reg.status === 'registered' ? (
              !isPaidConfirmed ? (
                <span className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5" />
                  Payment Pending
                </span>
              ) : phase === 'live' ? (
                <button
                  type="button"
                  onClick={() => setActiveExamEvent(ev)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Start Exam Now
                </button>
              ) : phase === 'ended' ? (
                <span className="text-xs font-medium text-slate-500">Window Closed</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveExamEvent(ev)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
                >
                  <Ticket className="w-3.5 h-3.5" />
                  Waiting Room
                </button>
              )
            ) : phase === 'reg_open' ? (
              <button
                type="button"
                disabled={seatsFull || actionBusyId === ev.id}
                onClick={() => void handleRegister(ev)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-45"
              >
                {actionBusyId === ev.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {seatsFull ? 'Seats Full' : ev.registrationType === 'free' ? 'Register Free' : `Register (₹${ev.entryFee})`}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                <Lock className="w-3.5 h-3.5" />
                {phase === 'upcoming_reg_soon' ? 'Reg Soon' : phase === 'ended' ? 'Ended' : 'Reg Closed'}
              </span>
            )}
          </div>
        </div>
      </article>
    );
  };

  const eventFilterCounts = useMemo(() => {
    let live = 0;
    let upcoming = 0;
    let past = 0;
    for (const ev of events) {
      const p = getEventPhase(ev, nowMs);
      if (p === 'live') live += 1;
      else if (p === 'upcoming_reg_soon' || p === 'reg_open' || p === 'reg_closed_waiting') upcoming += 1;
      else if (p === 'ended') past += 1;
    }
    return { all: events.length, live, upcoming, past };
  }, [events, nowMs]);

  return (
    <div className="space-y-5">
      {/* Sub-navigation: Browse Events vs My Events */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/70">
          <button
            type="button"
            onClick={() => setSubTab('browse')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              subTab === 'browse'
                ? 'bg-white dark:bg-[#11192E] text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {lang === 'hi' ? 'सभी इवेंट्स' : 'Browse Events'}{' '}
            <span className="font-mono tabular-nums text-[11px] opacity-75">{events.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setSubTab('my_events')}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              subTab === 'my_events'
                ? 'bg-white dark:bg-[#11192E] text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t(lang, 'myEvents')}{' '}
            <span className="font-mono tabular-nums text-[11px] opacity-75">{myEventsList.length}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {subTab === 'browse' && (
            <div className="inline-flex items-center gap-1 p-1 bg-white dark:bg-[#11192E] rounded-xl border border-slate-200/80 dark:border-slate-800">
              {(
                [
                  { id: 'all', label: lang === 'hi' ? 'सभी' : 'All', count: eventFilterCounts.all },
                  { id: 'live', label: lang === 'hi' ? 'लाइव' : 'Live', count: eventFilterCounts.live },
                  { id: 'upcoming', label: lang === 'hi' ? 'आगामी' : 'Upcoming', count: eventFilterCounts.upcoming },
                  { id: 'past', label: lang === 'hi' ? 'पिछले' : 'Past', count: eventFilterCounts.past },
                ] as Array<{ id: BrowseFilter; label: string; count: number }>
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBrowseFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 ${
                    browseFilter === f.id
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{f.label}</span>
                  <span className={`font-mono tabular-nums text-[10px] ${browseFilter === f.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {f.count}
                  </span>
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={() => void loadEventsData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#11192E] hover:border-indigo-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {lang === 'hi' ? 'रिफ्रेश' : 'Refresh'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Dismiss">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {isGuest && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Sign in required to participate in Scheduled Test Events
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Browse upcoming contests below, then sign in with your account to reserve your seat and compete for official rankings and prizes.
            </p>
          </div>
          {onRequireSignIn && (
            <button
              type="button"
              onClick={onRequireSignIn}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl"
            >
              Sign In / Link Account
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          Loading scheduled competitive events...
        </div>
      ) : subTab === 'my_events' ? (
        myEventsList.length === 0 ? (
          <div className="p-10 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 text-center space-y-3">
            <Ticket className="w-10 h-10 text-indigo-500 mx-auto" />
            <div className="text-base font-bold text-slate-900 dark:text-white">No Registered Events Yet</div>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Register for any upcoming competitive mathematics test event to see your confirmation pass, countdown, and official results here.
            </p>
            <button
              type="button"
              onClick={() => setSubTab('browse')}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
            >
              Browse Upcoming Events
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {myEventsList.map(renderEventCard)}
          </div>
        )
      ) : filteredEvents.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-800 text-center space-y-2">
          <Trophy className="w-10 h-10 text-amber-500 mx-auto" />
          <div className="text-base font-bold text-slate-900 dark:text-white">
            No Scheduled Events Found
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            New competitive mathematics events published from the Web Admin Studio will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(renderEventCard)}
        </div>
      )}

      {/* EVENT DETAILS & REGISTRATION MODAL */}
      {detailEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-2xl w-full bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-auto">
            {(() => {
              const ev = detailEvent;
              const phase = getEventPhase(ev, nowMs);
              const reg = regMap.get(ev.id);
              const sub = subMap.get(ev.id);
              const visual = getEventBannerVisual(ev.bannerPreset, ev.bannerUrl);
              const seatsFull = ev.maxParticipants > 0 && ev.registeredCount >= ev.maxParticipants;

              return (
                <>
                  <div className={`relative h-44 bg-gradient-to-br ${visual.gradientClass}`}>
                    {visual.effectiveImageUrl && (
                      <img
                        src={visual.effectiveImageUrl}
                        alt={ev.title}
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                    <button
                      type="button"
                      onClick={() => setDetailEvent(null)}
                      aria-label="Close modal"
                      className="absolute top-3 right-3 p-2 rounded-xl bg-slate-950/60 text-white hover:bg-slate-950"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="relative h-full p-5 flex flex-col justify-end text-white">
                      {renderPhaseBadge(ev)}
                      <h2 className="text-xl sm:text-2xl font-bold mt-1">{ev.title}</h2>
                    </div>
                  </div>

                  <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                      {ev.description}
                    </p>

                    {reg && (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 space-y-1">
                        <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4" />
                          Registration Confirmation · ID: <span className="font-mono">{reg.id}</span>
                        </div>
                        <div className="text-xs text-emerald-700 dark:text-emerald-200">
                          Status: <strong>{reg.status.toUpperCase()}</strong> · Payment:{' '}
                          <strong>{reg.paymentStatus.toUpperCase()}</strong>
                          {reg.paymentStatus === 'pending' &&
                            ' (Awaiting admin confirmation to unlock exam hall access)'}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-slate-500">Questions</div>
                        <div className="font-mono font-bold text-sm mt-0.5">{ev.totalQuestions}</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-slate-500">Duration</div>
                        <div className="font-mono font-bold text-sm mt-0.5">{ev.durationMin} min</div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-slate-500">Marking</div>
                        <div className="font-mono font-bold text-sm mt-0.5">
                          +{ev.marksPerQuestion} / -{ev.negativeMarking}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800">
                        <div className="text-slate-500">Entry Fee</div>
                        <div className="font-mono font-bold text-sm mt-0.5">
                          {ev.registrationType === 'free' ? 'Free' : `₹${ev.entryFee}`}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">Registration Window</div>
                        <div className="text-slate-600 dark:text-slate-300 font-mono">
                          Opens: {new Date(ev.regOpenAtMs).toLocaleString()}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 font-mono">
                          Closes: {new Date(ev.regCloseAtMs).toLocaleString()}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 space-y-1">
                        <div className="font-semibold text-slate-800 dark:text-slate-100">Scheduled Exam Window</div>
                        <div className="text-slate-600 dark:text-slate-300 font-mono">
                          Start: {new Date(ev.startAtMs).toLocaleString()}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 font-mono">
                          End: {new Date(ev.endAtMs).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Syllabus Topics ({ev.difficulty} difficulty)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {ev.topicIds.map((tid) => (
                          <span
                            key={tid}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200"
                          >
                            {topicNameMap.get(tid) ?? tid}
                          </span>
                        ))}
                      </div>
                    </div>

                    {ev.prizes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          <Award className="w-4 h-4 text-amber-500" />
                          Official Prizes & Rewards
                        </div>
                        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                          {ev.prizes.map((p, i) => (
                            <div
                              key={`${ev.id}_det_pz_${i}`}
                              className="px-4 py-2.5 flex items-center justify-between gap-3 bg-white dark:bg-slate-900/50"
                            >
                              <span className="font-bold text-indigo-600 dark:text-indigo-400">{p.rankLabel}</span>
                              <span className="font-medium text-slate-800 dark:text-slate-100 flex-1">{p.title}</span>
                              <span className="font-mono text-slate-500 dark:text-slate-400">{p.valueText}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/70 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs font-mono text-slate-500">
                      Seats: {ev.registeredCount} / {ev.maxParticipants > 0 ? ev.maxParticipants : 'Unlimited'}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {reg && !sub && nowMs < ev.startAtMs && (
                        <button
                          type="button"
                          disabled={actionBusyId === ev.id}
                          onClick={() => void handleCancelRegistration(ev)}
                          className="px-3.5 py-2 text-xs font-semibold text-rose-600 border border-rose-200 dark:border-rose-900 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        >
                          Cancel Seat
                        </button>
                      )}
                      {!reg && phase === 'reg_open' && (
                        <button
                          type="button"
                          disabled={seatsFull || actionBusyId === ev.id}
                          onClick={() => void handleRegister(ev)}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl disabled:opacity-45"
                        >
                          {actionBusyId === ev.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          {seatsFull
                            ? 'Seats Full'
                            : ev.registrationType === 'free'
                              ? 'Confirm Free Registration'
                              : `Register (₹${ev.entryFee})`}
                        </button>
                      )}
                      {reg && (phase === 'live' || nowMs < ev.startAtMs) && !sub && (
                        <button
                          type="button"
                          disabled={reg.paymentStatus === 'pending'}
                          onClick={() => {
                            setDetailEvent(null);
                            setActiveExamEvent(ev);
                          }}
                          className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl disabled:opacity-45"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          {phase === 'live' ? 'Launch Exam' : 'Enter Waiting Room'}
                        </button>
                      )}
                      {ev.resultsPublished && (
                        <button
                          type="button"
                          onClick={() => {
                            setDetailEvent(null);
                            void openLeaderboard(ev);
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-xs font-semibold rounded-xl"
                        >
                          <Trophy className="w-3.5 h-3.5" />
                          Leaderboard
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* OFFICIAL LEADERBOARD & VERIFIED WINNERS MODAL */}
      {leaderboardEvent && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-3xl w-full bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xl my-auto">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-700 via-purple-700 to-blue-700 text-white flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-indigo-100 font-semibold flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  Official Event Results & Winners
                </div>
                <h2 className="text-lg font-bold mt-0.5">{leaderboardEvent.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setLeaderboardEvent(null)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25"
                aria-label="Close leaderboard"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {leaderboardLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  Loading verified rankings...
                </div>
              ) : leaderboardRows.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-500">
                  No published results available for this event yet.
                </div>
              ) : (
                <>
                  {/* Verified Winners Highlights */}
                  {leaderboardRows.some((r) => r.isWinnerVerified) && (
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Award className="w-4 h-4" />
                        Verified Prize Winners
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {leaderboardRows
                          .filter((r) => r.isWinnerVerified)
                          .slice(0, 3)
                          .map((w) => (
                            <div
                              key={w.id}
                              className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/70 space-y-1"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-amber-700 dark:text-amber-300">
                                  Rank #{w.rank} {w.prizeRankLabel ? `· ${w.prizeRankLabel}` : ''}
                                </span>
                                <span className="font-mono text-[11px] uppercase text-emerald-700 dark:text-emerald-300">
                                  {w.prizeStatus}
                                </span>
                              </div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {w.userName}
                              </div>
                              <div className="text-xs font-mono text-slate-600 dark:text-slate-300">
                                Score: {w.score}/{w.maxScore} · {w.accuracy}%
                              </div>
                              {w.prizeTitle && (
                                <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 pt-1">
                                  Prize: {w.prizeTitle}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Full Leaderboard Table */}
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 text-xs">
                        <tr>
                          <th className="py-2.5 px-4 font-semibold">Rank</th>
                          <th className="py-2.5 px-4 font-semibold">Participant</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Score</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Accuracy</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Time</th>
                          <th className="py-2.5 px-4 font-semibold">Reward</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {leaderboardRows.map((row) => {
                          const isMe = firebaseUser?.uid === row.userId;
                          return (
                            <tr
                              key={row.id}
                              className={
                                isMe
                                  ? 'bg-indigo-50/70 dark:bg-indigo-950/40 font-semibold'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                              }
                            >
                              <td className="py-2.5 px-4 font-mono tabular-nums font-bold">
                                #{row.rank || '—'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-900 dark:text-white">
                                {row.userName} {isMe ? '(You)' : ''}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-indigo-600 dark:text-indigo-400 font-bold">
                                {row.score}
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                                {row.accuracy}%
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono tabular-nums text-slate-500">
                                {Math.floor(row.timeTakenSec / 60)}m {row.timeTakenSec % 60}s
                              </td>
                              <td className="py-2.5 px-4 text-xs">
                                {row.isWinnerVerified && row.prizeTitle ? (
                                  <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                                    ✓ {row.prizeTitle} ({row.prizeStatus})
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
