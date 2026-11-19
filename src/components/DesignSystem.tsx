import React, { useState } from 'react';
import {
  Bookmark,
  Box,
  Calculator,
  Check,
  Columns3,
  Copy,
  Divide,
  Grid3x3,
  Minus,
  Percent,
  Plus,
  Radical,
  Sigma,
  Square,
  Triangle,
  X,
} from 'lucide-react';
import { getTopicStyle, type TopicVisualStyle } from '../utils/topicTheme';

export const TopicIconGlyph: React.FC<{
  name: TopicVisualStyle['iconName'];
  className?: string;
}> = ({ name, className = 'w-5 h-5' }) => {
  switch (name) {
    case 'Square':
      return <Square className={className} />;
    case 'Box':
      return <Box className={className} />;
    case 'Radical':
      return <Radical className={className} />;
    case 'Sigma':
      return <Sigma className={className} />;
    case 'Grid3x3':
      return <Grid3x3 className={className} />;
    case 'Triangle':
      return <Triangle className={className} />;
    case 'Percent':
      return <Percent className={className} />;
    case 'Divide':
      return <Divide className={className} />;
    case 'Columns3':
      return <Columns3 className={className} />;
    case 'Plus':
      return <Plus className={className} />;
    case 'Minus':
      return <Minus className={className} />;
    case 'X':
      return <X className={className} />;
    case 'Calculator':
    default:
      return <Calculator className={className} />;
  }
};

export const TopicMathSymbol: React.FC<{
  topicId: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ topicId, size = 'md', className = '' }) => {
  const { mathSymbol } = getTopicStyle(topicId);
  const len = mathSymbol.length;

  const sizeClass =
    size === 'xs'
      ? len >= 4
        ? 'text-[9px]'
        : len === 3
          ? 'text-[10px]'
          : 'text-xs'
      : size === 'sm'
        ? len >= 4
          ? 'text-[10px]'
          : len === 3
            ? 'text-[11px]'
            : len === 2
              ? 'text-xs'
              : 'text-sm'
        : size === 'lg'
          ? len >= 4
            ? 'text-xs'
            : len === 3
              ? 'text-sm'
              : len === 2
                ? 'text-base'
                : 'text-xl'
          : len >= 4
            ? 'text-[11px]'
            : len === 3
              ? 'text-xs'
              : len === 2
                ? 'text-sm'
                : 'text-base';

  return (
    <span
      aria-hidden="true"
      className={`font-mono font-extrabold tracking-tight leading-none select-none inline-flex items-center justify-center ${sizeClass} ${className}`}
    >
      {mathSymbol}
    </span>
  );
};

export const ProgressRing: React.FC<{
  percentage: number;
  size?: number;
  strokeWidth?: number;
  trackColorClass?: string;
  strokeColor?: string;
  label?: string;
  sublabel?: string;
  textColorClass?: string;
}> = ({
  percentage,
  size = 112,
  strokeWidth = 10,
  trackColorClass = 'text-slate-200 dark:text-slate-800',
  strokeColor = '#3b82f6',
  label,
  sublabel,
  textColorClass = 'text-slate-900 dark:text-white',
}) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={trackColorClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 500ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`font-mono font-bold tabular-nums leading-none ${size >= 110 ? 'text-2xl' : 'text-lg'} ${textColorClass}`}>
          {label ?? `${clamped}%`}
        </span>
        {sublabel && (
          <span className="text-[11px] opacity-80 mt-1 leading-none">{sublabel}</span>
        )}
      </div>
    </div>
  );
};

export interface FormulaCardProps {
  id: string;
  title: string;
  formula: string;
  explanation: string;
  example?: string;
  accentClass?: string;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
}

export const FormulaCard: React.FC<FormulaCardProps> = ({
  id,
  title,
  formula,
  explanation,
  example,
  accentClass = 'from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 border-indigo-200/80 dark:border-indigo-900/70',
  isBookmarked,
  onToggleBookmark,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(`${title}: ${formula}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored if restricted
    }
  };

  return (
    <div
      className={`rounded-2xl border p-5 bg-gradient-to-br ${accentClass} shadow-sm shadow-slate-200/50 dark:shadow-none flex flex-col justify-between gap-4 transition-transform duration-150 hover:-translate-y-0.5`}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{title}</h4>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void handleCopy()}
              title="Copy formula"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/80 transition-colors"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark(id)}
              title={isBookmarked ? 'Remove bookmark' : 'Bookmark formula'}
              className={`p-2 rounded-lg transition-colors hover:bg-white/80 dark:hover:bg-slate-800/80 ${
                isBookmarked ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400 hover:text-amber-500'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>
          </div>
        </div>

        <div className="px-4 py-3.5 rounded-xl bg-white/95 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 font-mono text-lg sm:text-xl font-bold text-indigo-700 dark:text-indigo-300 tracking-tight overflow-x-auto">
          {formula}
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{explanation}</p>
      </div>

      {example && (
        <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 text-xs text-slate-600 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-slate-100">Example: </span>
          <span className="font-mono">{example}</span>
        </div>
      )}
    </div>
  );
};
