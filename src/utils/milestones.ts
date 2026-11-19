import type { PracticeSession, UserStatistics } from '../types/math';

export interface LearningMilestone {
  id: string;
  tier: number;
  kind: 'streak' | 'volume' | 'precision';
  nodeLabel: string;
  nodeLabelHi: string;
  title: string;
  titleHi: string;
  requirementText: string;
  requirementTextHi: string;
  progressText: string;
  progressTextHi: string;
  progressPct: number;
  unlocked: boolean;
  accentGradient: string;
  iconType: 'flame' | 'target' | 'zap' | 'crown' | 'trophy' | 'award';
}

export function computeLearningMilestones(
  stats: UserStatistics,
  sessions: PracticeSession[]
): LearningMilestone[] {
  const completedCount = sessions.filter((s) => s.status === 'completed').length;
  const bestStreak = Math.max(stats.currentStreak, stats.longestStreak);
  const overallAccuracy =
    stats.totalAttempted > 0 ? Math.round((stats.totalCorrect / stats.totalAttempted) * 100) : 0;

  const day1Unlocked = completedCount >= 1 || bestStreak >= 1;
  const qs50Unlocked = stats.totalAttempted >= 50;
  const day3Unlocked = bestStreak >= 3;
  const acc80Unlocked = stats.totalAttempted >= 20 && overallAccuracy >= 80;
  const day10Unlocked = bestStreak >= 10;
  const day15Unlocked = bestStreak >= 15;
  const qs500Unlocked = stats.totalAttempted >= 500;

  return [
    {
      id: 'day_1',
      tier: 1,
      kind: 'streak',
      nodeLabel: 'Day 1',
      nodeLabelHi: 'दिन 1',
      title: 'First Spark',
      titleHi: 'पहली चिंगारी',
      requirementText: 'Day 1: Complete 1 session',
      requirementTextHi: 'दिन 1: 1 सत्र पूरा करें',
      progressText: day1Unlocked ? 'Unlocked' : '0 / 1 session',
      progressTextHi: day1Unlocked ? 'अनलॉक' : '0 / 1 सत्र',
      progressPct: day1Unlocked ? 100 : 0,
      unlocked: day1Unlocked,
      accentGradient: 'from-amber-500 to-orange-500',
      iconType: 'flame',
    },
    {
      id: 'qs_50',
      tier: 2,
      kind: 'volume',
      nodeLabel: '50 Qs',
      nodeLabelHi: '50 प्रश्न',
      title: 'Warm-Up Champ',
      titleHi: 'वार्म-अप चैंप',
      requirementText: '50 Qs: Attempt 50 questions',
      requirementTextHi: '50 प्रश्न: 50 प्रश्न हल करें',
      progressText: qs50Unlocked ? 'Unlocked' : `${Math.min(stats.totalAttempted, 50)} / 50 Qs`,
      progressTextHi: qs50Unlocked ? 'अनलॉक' : `${Math.min(stats.totalAttempted, 50)} / 50 प्रश्न`,
      progressPct: Math.min(100, Math.round((stats.totalAttempted / 50) * 100)),
      unlocked: qs50Unlocked,
      accentGradient: 'from-blue-500 to-indigo-600',
      iconType: 'target',
    },
    {
      id: 'day_3',
      tier: 3,
      kind: 'streak',
      nodeLabel: 'Day 3',
      nodeLabelHi: 'दिन 3',
      title: 'Momentum Builder',
      titleHi: 'निरंतर शुरुआत',
      requirementText: '3-Day Streak: Momentum Builder',
      requirementTextHi: '3-दिन स्ट्रीक: निरंतर शुरुआत',
      progressText: day3Unlocked ? 'Unlocked' : `${Math.min(bestStreak, 3)} / 3 days`,
      progressTextHi: day3Unlocked ? 'अनलॉक' : `${Math.min(bestStreak, 3)} / 3 दिन`,
      progressPct: Math.min(100, Math.round((bestStreak / 3) * 100)),
      unlocked: day3Unlocked,
      accentGradient: 'from-orange-500 to-rose-500',
      iconType: 'flame',
    },
    {
      id: 'precision_80',
      tier: 4,
      kind: 'precision',
      nodeLabel: '80% Acc',
      nodeLabelHi: '80% सटीक',
      title: 'Precision Ace',
      titleHi: 'सटीकता मास्टर',
      requirementText: '80%+ Accuracy (min 20 Qs)',
      requirementTextHi: '80%+ सटीकता (न्यूनतम 20 प्रश्न)',
      progressText: acc80Unlocked
        ? 'Unlocked'
        : stats.totalAttempted < 20
          ? `${stats.totalAttempted} / 20 Qs`
          : `${overallAccuracy}% / 80%`,
      progressTextHi: acc80Unlocked
        ? 'अनलॉक'
        : stats.totalAttempted < 20
          ? `${stats.totalAttempted} / 20 प्रश्न`
          : `${overallAccuracy}% / 80%`,
      progressPct:
        stats.totalAttempted < 20
          ? Math.min(90, Math.round((stats.totalAttempted / 20) * 90))
          : Math.min(100, Math.round((overallAccuracy / 80) * 100)),
      unlocked: acc80Unlocked,
      accentGradient: 'from-emerald-500 to-teal-600',
      iconType: 'award',
    },
    {
      id: 'day_10',
      tier: 5,
      kind: 'streak',
      nodeLabel: 'Day 10',
      nodeLabelHi: 'दिन 10',
      title: 'Consistency Pro',
      titleHi: 'नियमितता प्रो',
      requirementText: '10-Day Streak: Consistency Pro',
      requirementTextHi: '10-दिन स्ट्रीक: नियमितता प्रो',
      progressText: day10Unlocked ? 'Unlocked' : `${Math.min(bestStreak, 10)} / 10 days`,
      progressTextHi: day10Unlocked ? 'अनलॉक' : `${Math.min(bestStreak, 10)} / 10 दिन`,
      progressPct: Math.min(100, Math.round((bestStreak / 10) * 100)),
      unlocked: day10Unlocked,
      accentGradient: 'from-amber-500 to-red-500',
      iconType: 'zap',
    },
    {
      id: 'day_15',
      tier: 6,
      kind: 'streak',
      nodeLabel: 'Day 15',
      nodeLabelHi: 'दिन 15',
      title: 'Math Ninja',
      titleHi: 'गणित निंजा',
      requirementText: '15-Day Streak: Math Ninja',
      requirementTextHi: '15-दिन स्ट्रीक: गणित निंजा',
      progressText: day15Unlocked ? 'Unlocked' : `${Math.min(bestStreak, 15)} / 15 days`,
      progressTextHi: day15Unlocked ? 'अनलॉक' : `${Math.min(bestStreak, 15)} / 15 दिन`,
      progressPct: Math.min(100, Math.round((bestStreak / 15) * 100)),
      unlocked: day15Unlocked,
      accentGradient: 'from-purple-600 to-indigo-600',
      iconType: 'crown',
    },
    {
      id: 'qs_500',
      tier: 7,
      kind: 'volume',
      nodeLabel: '500 Qs',
      nodeLabelHi: '500 प्रश्न',
      title: 'Calculation Titan',
      titleHi: 'गणना टाइटन',
      requirementText: '500 Qs: Solve 500 questions',
      requirementTextHi: '500 प्रश्न: 500 प्रश्न हल करें',
      progressText: qs500Unlocked ? 'Unlocked' : `${Math.min(stats.totalAttempted, 500)} / 500 Qs`,
      progressTextHi: qs500Unlocked ? 'अनलॉक' : `${Math.min(stats.totalAttempted, 500)} / 500 प्रश्न`,
      progressPct: Math.min(100, Math.round((stats.totalAttempted / 500) * 100)),
      unlocked: qs500Unlocked,
      accentGradient: 'from-indigo-600 via-purple-600 to-pink-600',
      iconType: 'trophy',
    },
  ];
}

export function getHighestUnlockedBadge(milestones: LearningMilestone[]): LearningMilestone | null {
  const unlocked = milestones.filter((m) => m.unlocked);
  if (unlocked.length === 0) return null;
  return unlocked.reduce((best, cur) => (cur.tier >= best.tier ? cur : best), unlocked[0]);
}
