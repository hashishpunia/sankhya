import React, { useEffect, useState } from 'react';
import {
  Award,
  Check,
  Copy,
  Crown,
  Download,
  ExternalLink,
  Flame,
  Share2,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import type { Language } from '../types/math';
import type { LearningMilestone } from '../utils/milestones';

interface ShareAchievementModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  targetExam: string;
  photoUrl?: string;
  streakDays: number;
  totalQuestions: number;
  accuracyPct: number;
  badge: LearningMilestone | null;
  lang: Language;
}

function renderBadgeIcon(iconType: LearningMilestone['iconType'] | undefined, className = 'w-6 h-6') {
  switch (iconType) {
    case 'crown':
      return <Crown className={className} />;
    case 'trophy':
      return <Trophy className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'target':
      return <Target className={className} />;
    case 'award':
      return <Award className={className} />;
    case 'flame':
    default:
      return <Flame className={className} />;
  }
}

async function generateBadgePngBlob(params: {
  userName: string;
  targetExam: string;
  badgeTitle: string;
  badgeRequirement: string;
  streakDays: number;
  totalQuestions: number;
  accuracyPct: number;
  downloadUrl: string;
}): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Deep slate-indigo gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, 1200, 680);
  grad.addColorStop(0, '#1e1b4b');
  grad.addColorStop(0.55, '#312e81');
  grad.addColorStop(1, '#1e3a8a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1200, 680);

  // Subtle geometric circle grid accents
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(1050, 140, 220, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(1050, 140, 150, 0, Math.PI * 2);
  ctx.stroke();

  // Brand lockup
  ctx.fillStyle = '#c7d2fe';
  ctx.font = 'bold 28px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('SankhyaPrep', 72, 86);
  ctx.fillStyle = '#93c5fd';
  ctx.font = '600 18px "DM Sans", system-ui, sans-serif';
  ctx.fillText('Powered by Exam Lens · Competitive Mathematics', 72, 118);

  // User avatar circle
  const initial = (params.userName || 'S').trim()[0].toUpperCase();
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(118, 228, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initial, 118, 230);

  // User name & target exam
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 42px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(params.userName.slice(0, 28), 186, 222);
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '500 22px "DM Sans", system-ui, sans-serif';
  ctx.fillText(params.targetExam.slice(0, 44), 186, 258);

  // Featured achievement highlight band
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  ctx.fillRect(72, 308, 1056, 134);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
  ctx.lineWidth = 2;
  ctx.strokeRect(72, 308, 1056, 134);

  ctx.fillStyle = '#fcd34d';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText('EARNED MILESTONE BADGE', 104, 348);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(params.badgeTitle, 104, 396);

  ctx.fillStyle = '#e0e7ff';
  ctx.font = '500 22px "DM Sans", system-ui, sans-serif';
  ctx.fillText(params.badgeRequirement, 104, 428);

  // Stats Trio
  const metrics = [
    { label: 'ACTIVE STREAK', val: `${params.streakDays} Days` },
    { label: 'QUESTIONS SOLVED', val: `${params.totalQuestions}` },
    { label: 'ACCURACY', val: `${params.accuracyPct}%` },
  ];
  metrics.forEach((m, i) => {
    const x = 72 + i * 356;
    ctx.fillStyle = '#93c5fd';
    ctx.font = '600 17px "JetBrains Mono", monospace';
    ctx.fillText(m.label, x, 502);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px "JetBrains Mono", monospace';
    ctx.fillText(m.val, x, 548);
  });

  // Footer Download Link
  ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
  ctx.fillRect(0, 588, 1200, 92);
  ctx.fillStyle = '#a5b4fc';
  ctx.font = '600 18px "DM Sans", system-ui, sans-serif';
  ctx.fillText('Practice free & challenge friends — Download SankhyaPrep:', 72, 624);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 20px "JetBrains Mono", monospace';
  ctx.fillText(params.downloadUrl.slice(0, 76), 72, 654);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

export const ShareAchievementModal: React.FC<ShareAchievementModalProps> = ({
  open,
  onClose,
  userName,
  targetExam,
  photoUrl,
  streakDays,
  totalQuestions,
  accuracyPct,
  badge,
  lang,
}) => {
  const { officialDownloadUrl, refreshAppConfig } = usePlatform();
  const [liveDownloadUrl, setLiveDownloadUrl] = useState(officialDownloadUrl);
  const [copied, setCopied] = useState(false);
  const [busyDownload, setBusyDownload] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setLiveDownloadUrl(officialDownloadUrl);
    void refreshAppConfig().then((url) => {
      if (url) setLiveDownloadUrl(url);
    });
  }, [open, officialDownloadUrl, refreshAppConfig]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const badgeTitle = badge
    ? lang === 'hi'
      ? badge.titleHi
      : badge.title
    : lang === 'hi'
      ? 'SankhyaPrep शिक्षार्थी'
      : 'SankhyaPrep Challenger';

  const badgeRequirement = badge
    ? lang === 'hi'
      ? badge.requirementTextHi
      : badge.requirementText
    : lang === 'hi'
      ? 'प्रतिदिन तेज़ गणित और मॉक टेस्ट अभ्यास'
      : 'Daily Speed Math & Mock Test Training';

  const shareMessage = `${userName} unlocked "${badgeTitle}" (${badgeRequirement}) on SankhyaPrep! Streak: ${streakDays}d · ${totalQuestions} Qs solved · ${accuracyPct}% accuracy. Download SankhyaPrep: ${liveDownloadUrl}`;

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored
    }
  };

  const handleDownloadCard = async () => {
    setBusyDownload(true);
    try {
      const blob = await generateBadgePngBlob({
        userName,
        targetExam,
        badgeTitle: badge ? badge.title : 'SankhyaPrep Challenger',
        badgeRequirement: badge ? badge.requirementText : 'Daily Speed Math Training',
        streakDays,
        totalQuestions,
        accuracyPct,
        downloadUrl: liveDownloadUrl,
      });
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sankhyaprep-${(badge?.id || 'achievement').toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setBusyDownload(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const blob = await generateBadgePngBlob({
          userName,
          targetExam,
          badgeTitle: badge ? badge.title : 'SankhyaPrep Challenger',
          badgeRequirement: badge ? badge.requirementText : 'Daily Speed Math Training',
          streakDays,
          totalQuestions,
          accuracyPct,
          downloadUrl: liveDownloadUrl,
        });
        if (blob && typeof File !== 'undefined' && typeof navigator.canShare === 'function') {
          const file = new File([blob], 'sankhyaprep-achievement.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: `${userName} — ${badgeTitle}`,
              text: shareMessage,
              url: liveDownloadUrl,
              files: [file],
            });
            return;
          }
        }
        await navigator.share({
          title: `${userName} — ${badgeTitle}`,
          text: shareMessage,
          url: liveDownloadUrl,
        });
        return;
      } catch {
        // User cancelled or file share unsupported; fallback to copy
      }
    }
    await handleCopyShare();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'hi' ? 'उपलब्धि साझा करें' : 'Share Achievement Card'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.985 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-700 shadow-2xl p-5 sm:p-6 space-y-5"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {lang === 'hi' ? 'उपलब्धि कार्ड साझा करें' : 'Share Achievement Card'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'hi'
                  ? 'आधिकारिक ऐप डाउनलोड लिंक के साथ सोशल मीडिया के लिए तैयार कार्ड'
                  : 'Social-ready card with your stats and official app download link'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close share dialog"
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Social-Ready Visual Achievement Poster */}
          <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-900 text-white p-6 space-y-5 border border-indigo-500/30 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-extrabold tracking-tight text-white">SankhyaPrep</div>
                <div className="text-[11px] font-medium text-indigo-200">
                  Powered by Exam Lens
                </div>
              </div>
              <div className="text-[11px] font-mono text-amber-300 font-semibold">
                {badge ? (lang === 'hi' ? 'अर्जित बैज' : 'Verified Milestone') : 'Aspirant Card'}
              </div>
            </div>

            <div className="flex items-center gap-3.5">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={userName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-full object-cover border-2 border-amber-300/60 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white font-bold text-xl flex items-center justify-center shrink-0">
                  {(userName || 'S').trim()[0].toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="text-lg font-bold text-white truncate">{userName}</div>
                <div className="text-xs text-indigo-200 truncate">{targetExam}</div>
              </div>
            </div>

            {/* Highlighted Badge Callout */}
            <div className="rounded-xl p-4 bg-white/10 border border-amber-300/30 flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-xl bg-gradient-to-br ${
                  badge?.accentGradient || 'from-amber-500 to-orange-500'
                } text-white flex items-center justify-center shrink-0 shadow-md`}
              >
                {renderBadgeIcon(badge?.iconType, 'w-6 h-6')}
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-white leading-tight">{badgeTitle}</div>
                <div className="text-xs text-indigo-100 mt-0.5">{badgeRequirement}</div>
              </div>
            </div>

            {/* Verified Stats Strip */}
            <div className="grid grid-cols-3 gap-3 pt-1 font-mono tabular-nums">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-indigo-200 uppercase">Streak</div>
                <div className="text-lg font-bold text-white mt-0.5">{streakDays}d</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-indigo-200 uppercase">Solved</div>
                <div className="text-lg font-bold text-white mt-0.5">{totalQuestions} Qs</div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] text-indigo-200 uppercase">Accuracy</div>
                <div className="text-lg font-bold text-emerald-300 mt-0.5">{accuracyPct}%</div>
              </div>
            </div>

            {/* Dynamic Official App Download Link */}
            <div className="pt-3 border-t border-white/15 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-indigo-200">
                  {lang === 'hi' ? 'ऐप डाउनलोड करें' : 'Official App Link'}
                </div>
                <a
                  href={liveDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-amber-200 hover:underline inline-flex items-center gap-1 max-w-full truncate"
                >
                  <span className="truncate">{liveDownloadUrl}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
              </div>
            </div>
          </div>

          {/* Share & Export Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => void handleNativeShare()}
              className="h-10 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>{lang === 'hi' ? 'साझा करें' : 'Share Card'}</span>
            </button>

            <button
              type="button"
              disabled={busyDownload}
              onClick={() => void handleDownloadCard()}
              className="h-10 px-4 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-opacity whitespace-nowrap disabled:opacity-50"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>{busyDownload ? 'Rendering...' : 'Download PNG'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleCopyShare()}
              className="h-10 px-4 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500 shrink-0" /> : <Copy className="w-4 h-4 shrink-0" />}
              <span>{copied ? (lang === 'hi' ? 'कॉपी हुआ!' : 'Copied!') : lang === 'hi' ? 'लिंक कॉपी करें' : 'Copy Link'}</span>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
