import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Home,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Language } from '../types/math';

export type OnboardingSectionId = 'home' | 'practice' | 'mock_tests' | 'revision' | 'performance';

export const ONBOARDING_STORAGE_KEY = 'sankhyaprep_onboarding_completed_v1';

export function hasCompletedOnboarding(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(): void {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
  } catch {
    // Ignore storage restriction errors in private browsing environments
  }
}

interface OnboardingStep {
  id: OnboardingSectionId;
  navLabel: string;
  navLabelHi: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  highlights: string[];
  highlightsHi: string[];
  accentGradient: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'home',
    navLabel: 'Home',
    navLabelHi: 'होम',
    title: 'Your Daily Command Hub',
    titleHi: 'आपका दैनिक अभ्यास केंद्र',
    subtitle:
      'Track today’s question goal, resume interrupted drills right where you left off, and jump straight into any topic.',
    subtitleHi:
      'आज का प्रश्न लक्ष्य देखें, अधूरा सत्र वहीं से जारी रखें और किसी भी विषय में तुरंत प्रवेश करें।',
    highlights: [
      'Daily practice target tracker and active streak overview',
      'One-tap resume for any in-progress practice or test session',
      'Quick access shortcuts to core calculation topics',
    ],
    highlightsHi: [
      'दैनिक अभ्यास लक्ष्य और स्ट्रीक की स्पष्ट झलक',
      'अधूरे अभ्यास या टेस्ट सत्र को एक क्लिक में फिर शुरू करें',
      'मुख्य गणना विषयों तक त्वरित पहुँच',
    ],
    accentGradient: 'from-indigo-700 via-blue-700 to-indigo-800',
    Icon: Home,
  },
  {
    id: 'practice',
    navLabel: 'Practice',
    navLabelHi: 'अभ्यास',
    title: 'Focused Calculation Drills',
    titleHi: 'लक्षित गणना अभ्यास',
    subtitle:
      'Master 14 essential math topics—from squares, cubes, and roots to trigonometry, fractions, and BODMAS—at your own pace.',
    subtitleHi:
      'वर्ग, घन, वर्गमूल, त्रिकोणमिति, भिन्न और BODMAS सहित 14 प्रमुख गणित विषयों का अपनी गति से अभ्यास करें।',
    highlights: [
      'Custom number ranges, table selections, and digit lengths',
      'Choose Easy, Medium, or Hard tiers in random or sequential order',
      'Optional instant explanations and timed drills under Advanced Settings',
    ],
    highlightsHi: [
      'कस्टम संख्या सीमा, पहाड़े और अंकों की लंबाई चुनने की सुविधा',
      'यादृच्छिक या क्रमबद्ध मोड में सरल, मध्यम या कठिन स्तर चुनें',
      'उन्नत सेटिंग्स में तुरंत हल व्याख्या और समयबद्ध अभ्यास विकल्प',
    ],
    accentGradient: 'from-blue-700 via-indigo-700 to-violet-700',
    Icon: Calculator,
  },
  {
    id: 'mock_tests',
    navLabel: 'Tests',
    navLabelHi: 'टेस्ट',
    title: 'Anytime Mocks & Live Events',
    titleHi: 'एनीटाइम मॉक और लाइव इवेंट्स',
    subtitle:
      'Simulate real exam pressure on demand or register for scheduled competitive tests with live leaderboards.',
    subtitleHi:
      'जब चाहें समयबद्ध मॉक टेस्ट बनाएं या लाइव प्रतियोगी टेस्ट इवेंट्स में पंजीकरण कर रैंकिंग देखें।',
    highlights: [
      'Topic-Wise, Blended Topics, Full-Length, and Difficulty Tier mocks',
      'Configure Questions, Duration, Marking Rules, and Difficulty cleanly',
      'Join scheduled test events with countdowns and verified winner boards',
    ],
    highlightsHi: [
      'विषय-वार, मिश्रित विषय, पूर्ण-लंबाई और कठिनाई स्तर मॉक टेस्ट',
      'प्रश्न, समय, अंकन नियम और कठिनाई को व्यवस्थित रूप से सेट करें',
      'काउंटडाउन और लीडरबोर्ड के साथ निर्धारित टेस्ट इवेंट्स में भाग लें',
    ],
    accentGradient: 'from-teal-700 via-cyan-700 to-blue-700',
    Icon: ClipboardCheck,
  },
  {
    id: 'revision',
    navLabel: 'Revision',
    navLabelHi: 'पुनरावृत्ति',
    title: 'Formulas, Tables & Shortcuts',
    titleHi: 'सूत्र, पहाड़े और शॉर्टकट',
    subtitle:
      'Review multiplication tables up to 50, high-speed mental math tricks, and bookmarked formulas before any test.',
    subtitleHi:
      'परीक्षा से पहले 1–50 तक पहाड़े, तेज़ मानसिक गणना ट्रिक्स और बुकमार्क किए गए सूत्र दोहराएं।',
    highlights: [
      'Interactive 1–50 tables explorer and standard math identities',
      'Bookmark key formulas for fast last-minute review',
      'Launch a quick concept quiz straight from any revision card',
    ],
    highlightsHi: [
      '1–50 तक इंटरैक्टिव पहाड़े और मानक गणितीय सर्वसमिकाएँ',
      'त्वरित दोहराव के लिए महत्वपूर्ण सूत्रों को बुकमार्क करें',
      'किसी भी पुनरावृत्ति कार्ड से सीधे त्वरित क्विज़ शुरू करें',
    ],
    accentGradient: 'from-orange-600 via-amber-600 to-orange-700',
    Icon: BookOpen,
  },
  {
    id: 'performance',
    navLabel: 'Stats',
    navLabelHi: 'प्रदर्शन',
    title: 'Speed & Accuracy Diagnostics',
    titleHi: 'गति और सटीकता विश्लेषण',
    subtitle:
      'Pinpoint weak topics, measure average response time per question, and review your completed sessions in one place.',
    subtitleHi:
      'कमज़ोर विषयों की पहचान करें, प्रति प्रश्न औसत समय मापें और अपने पूर्ण सत्रों की समीक्षा करें।',
    highlights: [
      'Topic-by-topic accuracy breakdown and response speed metrics',
      'Smart focus recommendations for topics needing extra practice',
      'Full session history with question-by-question answer review',
    ],
    highlightsHi: [
      'विषय-वार सटीकता और उत्तर देने की गति का विस्तृत विश्लेषण',
      'अधिक अभ्यास वाले कमज़ोर विषयों के लिए सीधे अभ्यास सुझाव',
      'प्रश्नवार उत्तर समीक्षा के साथ संपूर्ण सत्र इतिहास',
    ],
    accentGradient: 'from-emerald-700 via-teal-700 to-cyan-700',
    Icon: BarChart3,
  },
];

interface AppOnboardingProps {
  open: boolean;
  language: Language;
  onClose: () => void;
  onOpenSection?: (section: OnboardingSectionId) => void;
}

export const AppOnboarding: React.FC<AppOnboardingProps> = ({
  open,
  language,
  onClose,
  onOpenSection,
}) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setStepIndex((prev) => Math.min(ONBOARDING_STEPS.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setStepIndex((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const step = ONBOARDING_STEPS[stepIndex] ?? ONBOARDING_STEPS[0];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === ONBOARDING_STEPS.length - 1;
  const StepIcon = step.Icon;

  const renderPreviewVisual = (id: OnboardingSectionId) => {
    switch (id) {
      case 'home':
        return (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: language === 'hi' ? 'दैनिक लक्ष्य' : 'Daily Goal', val: '20 Qs' },
              { label: language === 'hi' ? 'स्ट्रीक' : 'Streak', val: 'Track' },
              { label: language === 'hi' ? 'त्वरित फिर से शुरू' : 'Resume', val: '1-Tap' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white/12 border border-white/15 px-3 py-2 text-left"
              >
                <div className="text-[10px] text-white/75 truncate">{item.label}</div>
                <div className="text-sm font-mono font-bold text-white mt-0.5">{item.val}</div>
              </div>
            ))}
          </div>
        );
      case 'practice':
        return (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {['x²', 'x³', '√x', '∛x', 'n×', 'sinθ', '%', 'a/b', '(±)'].map((sym) => (
              <span
                key={sym}
                className="w-8 h-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center font-mono text-xs font-extrabold text-white"
              >
                {sym}
              </span>
            ))}
          </div>
        );
      case 'mock_tests':
        return (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-xl bg-white/12 border border-white/15 px-3 py-2">
              <div className="text-[10px] text-white/75">
                {language === 'hi' ? 'मोड 1' : 'Mode 1'}
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                {language === 'hi' ? 'एनीटाइम मॉक टेस्ट' : 'Anytime Mock Studio'}
              </div>
            </div>
            <div className="rounded-xl bg-white/12 border border-white/15 px-3 py-2">
              <div className="text-[10px] text-white/75">
                {language === 'hi' ? 'मोड 2' : 'Mode 2'}
              </div>
              <div className="text-xs font-bold text-white mt-0.5">
                {language === 'hi' ? 'लाइव टेस्ट इवेंट्स' : 'Live Test Events'}
              </div>
            </div>
          </div>
        );
      case 'revision':
        return (
          <div className="rounded-xl bg-white/12 border border-white/15 px-3.5 py-2.5 flex items-center justify-between gap-3">
            <span className="font-mono text-sm font-bold text-white">a² − b² = (a + b)(a − b)</span>
            <span className="text-[11px] font-mono text-white/80 shrink-0">1–50 ×</span>
          </div>
        );
      case 'performance':
        return (
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { label: language === 'hi' ? 'सटीकता' : 'Accuracy', val: 'Topic Map' },
              { label: language === 'hi' ? 'गति' : 'Speed', val: 'sec / Q' },
              { label: language === 'hi' ? 'समीक्षा' : 'Review', val: 'Step-by-Step' },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl bg-white/12 border border-white/15 px-3 py-2 text-left"
              >
                <div className="text-[10px] text-white/75 truncate">{item.label}</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5 truncate">{item.val}</div>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-2xl overflow-hidden bg-white dark:bg-[#11192E] border border-slate-200/90 dark:border-slate-800 shadow-2xl"
      >
        {/* Top Interactive Carousel Visual Header */}
        <div className={`bg-gradient-to-br ${step.accentGradient} text-white p-5 sm:p-6 space-y-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-medium text-white/85 flex items-center gap-2">
              <span>SankhyaPrep</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">
                {language === 'hi'
                  ? `चरण ${stepIndex + 1} / ${ONBOARDING_STEPS.length}`
                  : `Step ${stepIndex + 1} of ${ONBOARDING_STEPS.length}`}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={language === 'hi' ? 'बंद करें' : 'Close tour'}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-white/18 border border-white/20 flex items-center justify-center shrink-0">
                  <StepIcon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="onboarding-title"
                    className="text-xl sm:text-2xl font-bold tracking-tight leading-tight text-white"
                  >
                    {language === 'hi' ? step.titleHi : step.title}
                  </h2>
                </div>
              </div>

              {renderPreviewVisual(step.id)}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Stepper Section Tabs + Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Clickable 5-Section Carousel Navigation */}
          <div
            role="tablist"
            aria-label={language === 'hi' ? 'ऐप अनुभाग' : 'App sections'}
            className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800"
          >
            {ONBOARDING_STEPS.map((item, idx) => {
              const Icon = item.Icon;
              const active = idx === stepIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setStepIndex(idx)}
                  className={`min-h-[40px] px-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${
                    active
                      ? 'bg-white dark:bg-[#162038] text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{language === 'hi' ? item.navLabelHi : item.navLabel}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={`body-${step.id}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="space-y-4 min-h-[152px]"
            >
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'hi' ? step.subtitleHi : step.subtitle}
              </p>

              <ul className="space-y-2.5">
                {(language === 'hi' ? step.highlightsHi : step.highlights).map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>

          {/* Footer Navigation Controls */}
          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-3 py-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors whitespace-nowrap"
              >
                {language === 'hi' ? 'छोड़ें' : 'Skip tour'}
              </button>
              {onOpenSection && !isFirst && (
                <button
                  type="button"
                  onClick={() => onOpenSection(step.id)}
                  className="hidden sm:inline-flex min-h-[40px] px-3 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                >
                  {language === 'hi' ? `${step.navLabelHi} खोलें` : `Open ${step.navLabel}`}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!isFirst && (
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                  className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>{language === 'hi' ? 'पिछला' : 'Back'}</span>
                </button>
              )}

              {isLast ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
                >
                  <span>{language === 'hi' ? 'शुरू करें' : 'Get Started'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStepIndex((i) => Math.min(ONBOARDING_STEPS.length - 1, i + 1))}
                  className="min-h-[40px] inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors whitespace-nowrap"
                >
                  <span>{language === 'hi' ? 'अगला' : 'Next'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
