import type { Difficulty } from '../types/math';

export interface TopicVisualStyle {
  iconName:
    | 'Square'
    | 'Box'
    | 'Radical'
    | 'Sigma'
    | 'Grid3x3'
    | 'Triangle'
    | 'Percent'
    | 'Divide'
    | 'Columns3'
    | 'Plus'
    | 'Minus'
    | 'X'
    | 'Calculator';
  mathSymbol: string;
  shortLabel: string;
  shortLabelHi: string;
  gradient: string;
  softBg: string;
  iconBg: string;
  accentText: string;
  ringColor: string;
  difficulty: Difficulty;
}

export const TOPIC_THEMES: Record<string, TopicVisualStyle> = {
  squares: {
    iconName: 'Square',
    mathSymbol: 'x²',
    shortLabel: 'Squares',
    shortLabelHi: 'वर्ग',
    gradient: 'from-indigo-600 to-blue-600',
    softBg: 'bg-indigo-50/80 dark:bg-indigo-950/30',
    iconBg: 'bg-indigo-600 text-white',
    accentText: 'text-indigo-700 dark:text-indigo-300',
    ringColor: '#4f46e5',
    difficulty: 'medium',
  },
  cubes: {
    iconName: 'Box',
    mathSymbol: 'x³',
    shortLabel: 'Cubes',
    shortLabelHi: 'घन',
    gradient: 'from-purple-600 to-indigo-600',
    softBg: 'bg-purple-50/80 dark:bg-purple-950/30',
    iconBg: 'bg-purple-600 text-white',
    accentText: 'text-purple-700 dark:text-purple-300',
    ringColor: '#7c3aed',
    difficulty: 'medium',
  },
  square_roots: {
    iconName: 'Radical',
    mathSymbol: '√x',
    shortLabel: 'Sq. Roots',
    shortLabelHi: 'वर्गमूल',
    gradient: 'from-cyan-600 to-blue-600',
    softBg: 'bg-cyan-50/80 dark:bg-cyan-950/30',
    iconBg: 'bg-cyan-600 text-white',
    accentText: 'text-cyan-700 dark:text-cyan-300',
    ringColor: '#0891b2',
    difficulty: 'medium',
  },
  cube_roots: {
    iconName: 'Sigma',
    mathSymbol: '∛x',
    shortLabel: 'Cube Roots',
    shortLabelHi: 'घनमूल',
    gradient: 'from-violet-600 to-purple-600',
    softBg: 'bg-violet-50/80 dark:bg-violet-950/30',
    iconBg: 'bg-violet-600 text-white',
    accentText: 'text-violet-700 dark:text-violet-300',
    ringColor: '#7c3aed',
    difficulty: 'hard',
  },
  tables: {
    iconName: 'Grid3x3',
    mathSymbol: 'n×',
    shortLabel: 'Tables',
    shortLabelHi: 'पहाड़े',
    gradient: 'from-blue-600 to-teal-600',
    softBg: 'bg-blue-50/80 dark:bg-blue-950/30',
    iconBg: 'bg-blue-600 text-white',
    accentText: 'text-blue-700 dark:text-blue-300',
    ringColor: '#2563eb',
    difficulty: 'easy',
  },
  trigonometry: {
    iconName: 'Triangle',
    mathSymbol: 'sinθ',
    shortLabel: 'Trig',
    shortLabelHi: 'त्रिकोणमिति',
    gradient: 'from-teal-600 to-emerald-600',
    softBg: 'bg-teal-50/80 dark:bg-teal-950/30',
    iconBg: 'bg-teal-600 text-white',
    accentText: 'text-teal-700 dark:text-teal-300',
    ringColor: '#0d9488',
    difficulty: 'medium',
  },
  percentages: {
    iconName: 'Percent',
    mathSymbol: '%',
    shortLabel: 'Percent',
    shortLabelHi: 'प्रतिशत',
    gradient: 'from-orange-500 to-amber-500',
    softBg: 'bg-orange-50/80 dark:bg-orange-950/30',
    iconBg: 'bg-orange-500 text-white',
    accentText: 'text-orange-700 dark:text-orange-300',
    ringColor: '#ea580c',
    difficulty: 'medium',
  },
  fractions: {
    iconName: 'Divide',
    mathSymbol: 'a/b',
    shortLabel: 'Fractions',
    shortLabelHi: 'भिन्न',
    gradient: 'from-rose-500 to-pink-600',
    softBg: 'bg-rose-50/80 dark:bg-rose-950/30',
    iconBg: 'bg-rose-600 text-white',
    accentText: 'text-rose-700 dark:text-rose-300',
    ringColor: '#e11d48',
    difficulty: 'medium',
  },
  di_addition: {
    iconName: 'Columns3',
    mathSymbol: 'Σ+',
    shortLabel: 'DI Sum',
    shortLabelHi: 'डीआई जोड़',
    gradient: 'from-emerald-600 to-teal-600',
    softBg: 'bg-emerald-50/80 dark:bg-emerald-950/30',
    iconBg: 'bg-emerald-600 text-white',
    accentText: 'text-emerald-700 dark:text-emerald-300',
    ringColor: '#059669',
    difficulty: 'medium',
  },
  addition: {
    iconName: 'Plus',
    mathSymbol: '+',
    shortLabel: 'Addition',
    shortLabelHi: 'जोड़',
    gradient: 'from-blue-600 to-indigo-600',
    softBg: 'bg-blue-50/80 dark:bg-blue-950/30',
    iconBg: 'bg-blue-600 text-white',
    accentText: 'text-blue-700 dark:text-blue-300',
    ringColor: '#2563eb',
    difficulty: 'easy',
  },
  subtraction: {
    iconName: 'Minus',
    mathSymbol: '−',
    shortLabel: 'Subtract',
    shortLabelHi: 'घटाव',
    gradient: 'from-amber-500 to-orange-600',
    softBg: 'bg-amber-50/80 dark:bg-amber-950/30',
    iconBg: 'bg-amber-600 text-white',
    accentText: 'text-amber-700 dark:text-amber-300',
    ringColor: '#d97706',
    difficulty: 'easy',
  },
  multiplication: {
    iconName: 'X',
    mathSymbol: '×',
    shortLabel: 'Multiply',
    shortLabelHi: 'गुणा',
    gradient: 'from-purple-600 to-fuchsia-600',
    softBg: 'bg-purple-50/80 dark:bg-purple-950/30',
    iconBg: 'bg-purple-600 text-white',
    accentText: 'text-purple-700 dark:text-purple-300',
    ringColor: '#9333ea',
    difficulty: 'medium',
  },
  division: {
    iconName: 'Divide',
    mathSymbol: '÷',
    shortLabel: 'Division',
    shortLabelHi: 'भाग',
    gradient: 'from-teal-600 to-cyan-600',
    softBg: 'bg-teal-50/80 dark:bg-teal-950/30',
    iconBg: 'bg-teal-600 text-white',
    accentText: 'text-teal-700 dark:text-teal-300',
    ringColor: '#0d9488',
    difficulty: 'medium',
  },
  mixed_arithmetic: {
    iconName: 'Calculator',
    mathSymbol: '(±)',
    shortLabel: 'BODMAS',
    shortLabelHi: 'BODMAS',
    gradient: 'from-indigo-600 to-violet-600',
    softBg: 'bg-indigo-50/80 dark:bg-indigo-950/30',
    iconBg: 'bg-indigo-600 text-white',
    accentText: 'text-indigo-700 dark:text-indigo-300',
    ringColor: '#4f46e5',
    difficulty: 'hard',
  },
};

export function getTopicStyle(topicId: string): TopicVisualStyle {
  return (
    TOPIC_THEMES[topicId] ?? {
      iconName: 'Calculator',
      mathSymbol: 'fx',
      shortLabel: 'Math',
      shortLabelHi: 'गणित',
      gradient: 'from-indigo-600 to-blue-600',
      softBg: 'bg-indigo-50/80 dark:bg-indigo-950/30',
      iconBg: 'bg-indigo-600 text-white',
      accentText: 'text-indigo-700 dark:text-indigo-300',
      ringColor: '#4f46e5',
      difficulty: 'medium',
    }
  );
}
