import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Compass,
  Grid3x3,
  Home,
  Keyboard,
  Layers,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { Language } from '../types/math';
import type { MockTestCategory } from './MockTestsView';

export type TourTabId = 'home' | 'practice' | 'mock_tests' | 'revision' | 'performance';

interface OnboardingTourProps {
  open: boolean;
  lang: Language;
  onNavigateTab: (tab: TourTabId) => void;
  onDemoPractice: (mode: 'grid' | 'setup') => void;
  onDemoMockTests: (category: MockTestCategory, openAdvanced?: boolean) => void;
  onClose: (action?: 'home' | 'practice') => void;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface WorkflowStepItem {
  idx: 0 | 1 | 2;
  label: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  highlights: Array<{
    text: string;
    Icon: React.ComponentType<{ className?: string }>;
  }>;
  onSelect: () => void;
}

const TOUR_STEPS: Array<{
  id: TourTabId | 'done';
  navLabelEn: string;
  navLabelHi: string;
  titleEn: string;
  titleHi: string;
  subtitleEn: string;
  subtitleHi: string;
  bulletsEn: string[];
  bulletsHi: string[];
  Icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
}> = [
  {
    id: 'home',
    navLabelEn: 'Home',
    navLabelHi: 'होम',
    titleEn: 'Your Daily Command Center',
    titleHi: 'आपका दैनिक अभ्यास केंद्र',
    subtitleEn: 'Start every study session from Home with clear daily targets and 1-tap shortcuts.',
    subtitleHi: 'दैनिक लक्ष्य और त्वरित शॉर्टकट के साथ हर अध्ययन सत्र की शुरुआत यहीं से करें।',
    bulletsEn: [
      'Track your Daily Practice Target progress ring and active streak.',
      'Resume any interrupted drill right where you left off.',
      'Jump straight into Quick Access math topics in one tap.',
    ],
    bulletsHi: [
      'दैनिक अभ्यास लक्ष्य रिंग और स्ट्रीक को ट्रैक करें।',
      'अधूरे छोड़े गए किसी भी सत्र को वहीं से फिर शुरू करें।',
      'एक टैप में त्वरित गणित विषयों का अभ्यास शुरू करें।',
    ],
    Icon: Home,
    accentBg: 'bg-indigo-600 text-white',
  },
  {
    id: 'practice',
    navLabelEn: 'Practice',
    navLabelHi: 'अभ्यास',
    titleEn: 'Practice Topics & Custom Drills',
    titleHi: 'अभ्यास विषय और कस्टम ड्रिल',
    subtitleEn: 'Click any step below to preview how Practice works live on screen:',
    subtitleHi: 'अभ्यास कैसे काम करता है यह लाइव देखने के लिए नीचे किसी भी चरण पर क्लिक करें:',
    bulletsEn: [],
    bulletsHi: [],
    Icon: Calculator,
    accentBg: 'bg-blue-600 text-white',
  },
  {
    id: 'mock_tests',
    navLabelEn: 'Tests',
    navLabelHi: 'टेस्ट',
    titleEn: 'Anytime Mocks & Live Test Lobby',
    titleHi: 'एनीटाइम मॉक व लाइव टेस्ट लॉबी',
    subtitleEn: 'Click any step below to explore how mock exams and scheduled contests run:',
    subtitleHi: 'मॉक टेस्ट और निर्धारित प्रतियोगिताओं का कार्यप्रवाह देखने के लिए नीचे चरण चुनें:',
    bulletsEn: [],
    bulletsHi: [],
    Icon: ClipboardCheck,
    accentBg: 'bg-teal-600 text-white',
  },
  {
    id: 'revision',
    navLabelEn: 'Revision',
    navLabelHi: 'पुनरावृत्ति',
    titleEn: 'Formulas, Tables & Shortcut Guides',
    titleHi: 'सूत्र, पहाड़े और शॉर्टकट गाइड',
    subtitleEn: 'Memorize core math patterns before testing your speed under the clock.',
    subtitleHi: 'परीक्षा से पहले पहाड़े, वर्ग, घन और शॉर्टकट नियम दोहराएं।',
    bulletsEn: [
      'Study multiplication tables (1–50), roots, trig tables, and solved examples.',
      'Bookmark high-yield formulas for rapid last-minute review.',
      'Launch a targeted drill directly from any revision guide.',
    ],
    bulletsHi: [
      '1–50 पहाड़े, वर्गमूल, त्रिकोणमिति मान और हल किए गए उदाहरण पढ़ें।',
      'महत्वपूर्ण सूत्रों को त्वरित रिवीजन के लिए बुकमार्क करें।',
      'किसी भी गाइड से सीधे अभ्यास सत्र शुरू करें।',
    ],
    Icon: BookOpen,
    accentBg: 'bg-orange-500 text-white',
  },
  {
    id: 'performance',
    navLabelEn: 'Stats',
    navLabelHi: 'प्रदर्शन',
    titleEn: 'Performance Analytics & Focus Areas',
    titleHi: 'प्रदर्शन विश्लेषण और सुधार क्षेत्र',
    subtitleEn: 'Turn every completed drill and mock test into actionable insights.',
    subtitleHi: 'हर अभ्यास और मॉक टेस्ट से अपनी सटीकता व गति का विश्लेषण करें।',
    bulletsEn: [
      'Monitor accuracy percentage, average response time, and daily/weekly volume.',
      'Spot Weak Topics automatically and launch focused remediation practice.',
      'Sync your progress offline-first and across devices when signed in.',
    ],
    bulletsHi: [
      'सटीकता प्रतिशत, औसत समय और दैनिक/साप्ताहिक प्रगति देखें।',
      'कमज़ोर विषयों की पहचान करें और तुरंत सुधार अभ्यास शुरू करें।',
      'साइन इन होने पर ऑफ़लाइन व क्लाउड दोनों में प्रगति सुरक्षित रखें।',
    ],
    Icon: BarChart3,
    accentBg: 'bg-purple-600 text-white',
  },
  {
    id: 'done',
    navLabelEn: 'All Done',
    navLabelHi: 'पूर्ण',
    titleEn: 'All Done!',
    titleHi: 'सब तैयार है!',
    subtitleEn: 'You are ready to build speed, accuracy, and exam confidence on SankhyaPrep.',
    subtitleHi: 'अब आप SankhyaPrep पर गति, सटीकता और परीक्षा आत्मविश्वास बढ़ाने के लिए तैयार हैं।',
    bulletsEn: [],
    bulletsHi: [],
    Icon: CheckCircle2,
    accentBg: 'bg-emerald-600 text-white',
  },
];

export const OnboardingTour: React.FC<OnboardingTourProps> = ({
  open,
  lang,
  onNavigateTab,
  onDemoPractice,
  onDemoMockTests,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [practiceDemoStep, setPracticeDemoStep] = useState<0 | 1 | 2>(0);
  const [testDemoStep, setTestDemoStep] = useState<0 | 1 | 2>(0);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  const currentStep = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];
  const isDoneScreen = currentStep.id === 'done';
  const totalNavSteps = TOUR_STEPS.length - 1; // 5 core tabs

  // Reset step state each time the tour opens
  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
    setPracticeDemoStep(0);
    setTestDemoStep(0);
    onNavigateTab('home');
  }, [open, onNavigateTab]);

  const measureTarget = useCallback(() => {
    if (!open || isDoneScreen) {
      setSpotlight(null);
      return;
    }
    const mobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    setIsMobileViewport(mobile);

    const nodes = document.querySelectorAll<HTMLElement>(`[data-tour-tab="${currentStep.id}"]`);
    let found: DOMRect | null = null;
    nodes.forEach((node) => {
      const rect = node.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        found = rect;
      }
    });

    if (found) {
      const r = found as DOMRect;
      const padX = mobile ? 4 : 8;
      const padY = mobile ? 2 : 5;
      setSpotlight({
        top: Math.max(4, r.top - padY),
        left: Math.max(4, r.left - padX),
        width: r.width + padX * 2,
        height: r.height + padY * 2,
      });
    } else {
      setSpotlight(null);
    }
  }, [currentStep.id, isDoneScreen, open]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(measureTarget);
    const timer = window.setTimeout(measureTarget, 180);
    window.addEventListener('resize', measureTarget);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener('resize', measureTarget);
    };
  }, [measureTarget, open, stepIndex]);

  const goToStep = useCallback(
    (nextIdx: number) => {
      const clamped = Math.max(0, Math.min(TOUR_STEPS.length - 1, nextIdx));
      setStepIndex(clamped);
      const target = TOUR_STEPS[clamped];
      if (target && target.id !== 'done') {
        if (target.id === 'practice') {
          setPracticeDemoStep(0);
          onDemoPractice('grid');
        } else if (target.id === 'mock_tests') {
          setTestDemoStep(0);
          onDemoMockTests('anytime', false);
        } else {
          onNavigateTab(target.id);
        }
      }
    },
    [onDemoMockTests, onDemoPractice, onNavigateTab]
  );

  const handleNext = useCallback(() => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      goToStep(stepIndex + 1);
    } else {
      onClose('home');
    }
  }, [goToStep, onClose, stepIndex]);

  const handleBack = useCallback(() => {
    if (stepIndex > 0) {
      goToStep(stepIndex - 1);
    }
  }, [goToStep, stepIndex]);

  // Keyboard support (Escape to skip, Arrow keys to navigate)
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft' && stepIndex > 0) {
        handleBack();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack, handleNext, onClose, open, stepIndex]);

  if (!open) return null;

  const practiceWorkflowItems: WorkflowStepItem[] = [
    {
      idx: 0,
      label: lang === 'hi' ? '1. गणित विषय चुनें' : '1. Pick Math Topic',
      desc:
        lang === 'hi'
          ? 'x², x³, √x, ∛x, n× और अंकगणित सहित 14 विषयों में से कोई भी चुनें।'
          : 'Browse 14 focused topics tagged with clear math symbols (x², x³, √x, ∛x, n×, sinθ, %).',
      Icon: Grid3x3,
      highlights: [
        { text: 'x² Squares · √x Roots · n× Tables', Icon: Calculator },
      ],
      onSelect: () => {
        setPracticeDemoStep(0);
        onDemoPractice('grid');
      },
    },
    {
      idx: 1,
      label: lang === 'hi' ? '2. रेंज और कठिनाई सेट करें' : '2. Set Range & Difficulty',
      desc:
        lang === 'hi'
          ? 'पीछे लाइव स्क्रीन देखें: संख्या सीमा (1–30), क्रम और कठिनाई स्तर चुनें।'
          : 'Live preview behind: choose your number range (e.g., 1–30), sequence order, and difficulty.',
      Icon: SlidersHorizontal,
      highlights: [
        { text: lang === 'hi' ? 'कस्टम सीमा व क्रम' : 'Custom Range & Order', Icon: SlidersHorizontal },
      ],
      onSelect: () => {
        setPracticeDemoStep(1);
        onDemoPractice('setup');
      },
    },
    {
      idx: 2,
      label: lang === 'hi' ? '3. तेज़ अभ्यास व तुरंत हल' : '3. Timed Drill & Feedback',
      desc:
        lang === 'hi'
          ? 'संख्यात्मक उत्तरों के लिए स्मार्ट नंबर कीपैड और प्रत्येक प्रश्न पर तुरंत व्याख्या पाएं।'
          : 'Answer rapidly with the built-in numeric keypad and inspect instant step-by-step solutions.',
      Icon: Zap,
      highlights: [
        { text: lang === 'hi' ? 'स्मार्ट कीपैड व व्याख्या' : 'Numeric Keypad & Step Solutions', Icon: Keyboard },
      ],
      onSelect: () => {
        setPracticeDemoStep(2);
        onDemoPractice('setup');
      },
    },
  ];

  const testWorkflowItems: WorkflowStepItem[] = [
    {
      idx: 0,
      label: lang === 'hi' ? '1. प्रारूप चुनें' : '1. Choose Format',
      desc:
        lang === 'hi'
          ? 'Topic-Wise, Blended Topics, Full-Length या Difficulty Tier में से चुनें।'
          : 'Pick Topic-Wise, Blended Topics (multi-symbol grid), Full-Length exam templates, or Difficulty Tier.',
      Icon: Layers,
      highlights: [
        { text: lang === 'hi' ? 'टॉपिक-वाइज़ · ब्लेंडेड · फुल-लेंथ' : 'Topic-Wise · Blended · Full-Length', Icon: Layers },
      ],
      onSelect: () => {
        setTestDemoStep(0);
        onDemoMockTests('anytime', false);
      },
    },
    {
      idx: 1,
      label: lang === 'hi' ? '2. उन्नत सेटिंग्स' : '2. Advanced Settings',
      desc:
        lang === 'hi'
          ? 'पीछे लाइव पैनल देखें: प्रश्न संख्या, समय, निगेटिव मार्किंग (+2/-0.5) और Test Summary जांचें।'
          : 'Live preview behind: fine-tune Questions, Duration, Marking Rules (+2 / -0.5), & Difficulty in one clean panel.',
      Icon: SlidersHorizontal,
      highlights: [
        { text: lang === 'hi' ? 'प्रश्न · समय · +2 / -0.5 नियम' : 'Questions · Duration · +2 / -0.5 Rules', Icon: Clock },
      ],
      onSelect: () => {
        setTestDemoStep(1);
        onDemoMockTests('anytime', true);
      },
    },
    {
      idx: 2,
      label: lang === 'hi' ? '3. लाइव टेस्ट लॉबी' : '3. Live Test Lobby',
      desc:
        lang === 'hi'
          ? 'पीछे लाइव लॉबी देखें: निर्धारित प्रतियोगिताओं में पंजीकरण करें, काउंटडाउन, रैंक व पुरस्कार पाएं।'
          : 'Live preview behind: browse Scheduled Test Events, register for upcoming contests, view countdowns & leaderboards.',
      Icon: Trophy,
      highlights: [
        { text: lang === 'hi' ? 'काउंटडाउन · लीडरबोर्ड · पुरस्कार' : 'Countdowns · Leaderboards · Prizes', Icon: Trophy },
      ],
      onSelect: () => {
        setTestDemoStep(2);
        onDemoMockTests('events', false);
      },
    },
  ];

  const renderWorkflowList = (
    items: WorkflowStepItem[],
    activeIdx: 0 | 1 | 2,
    tone: 'blue' | 'teal'
  ) => (
    <div className="space-y-2" role="tablist">
      {items.map((item) => {
        const active = activeIdx === item.idx;
        const StepBadgeIcon = item.Icon;
        const activeCardClasses =
          tone === 'teal'
            ? 'bg-teal-50/85 dark:bg-teal-950/40 border-teal-300 dark:border-teal-700/80 shadow-xs'
            : 'bg-indigo-50/85 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700/80 shadow-xs';
        const activeIconClasses =
          tone === 'teal'
            ? 'bg-teal-600 text-white'
            : 'bg-indigo-600 text-white';
        const activeChipClasses =
          tone === 'teal'
            ? 'bg-white/90 dark:bg-slate-900/80 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800/70'
            : 'bg-white/90 dark:bg-slate-900/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/70';

        return (
          <button
            key={item.idx}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={item.onSelect}
            className={`w-full text-left p-3 rounded-xl border transition-colors ${
              active
                ? activeCardClasses
                : 'bg-slate-50/90 dark:bg-slate-900/50 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                  active
                    ? activeIconClasses
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <StepBadgeIcon className="w-4 h-4" />
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`text-xs sm:text-[13px] font-bold leading-snug ${
                      active
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </span>
                  {active && (
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap ${
                        tone === 'teal'
                          ? 'bg-teal-100 dark:bg-teal-900/70 text-teal-800 dark:text-teal-200'
                          : 'bg-indigo-100 dark:bg-indigo-900/70 text-indigo-800 dark:text-indigo-200'
                      }`}
                    >
                      {lang === 'hi' ? 'सक्रिय' : 'Active'}
                    </span>
                  )}
                </div>

                {active && (
                  <div className="space-y-2 pt-0.5">
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {item.desc}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {item.highlights.map((chip, cIdx) => {
                        const ChipIcon = chip.Icon;
                        return (
                          <span
                            key={cIdx}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${activeChipClasses}`}
                          >
                            <ChipIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>{chip.text}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  const StepIcon = currentStep.Icon;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto"
      role="dialog"
      aria-modal="true"
      aria-label={lang === 'hi' ? 'SankhyaPrep परिचय टूर' : 'SankhyaPrep Guided Tour'}
    >
      {/* Dimmed backdrop when no cutout spotlight is active */}
      {!spotlight && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-[2px] transition-opacity" />
      )}

      {/* Spotlight Cutout around the active nav tab */}
      {spotlight && (
        <div
          aria-hidden="true"
          className="fixed rounded-xl ring-2 ring-indigo-400 dark:ring-cyan-400 bg-transparent transition-all duration-200 pointer-events-none"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.58)',
          }}
        />
      )}

      {/* Interactive Guide Card */}
      <div
        className={`fixed inset-x-0 flex justify-center px-4 pointer-events-none ${
          isDoneScreen
            ? 'inset-y-0 items-center'
            : isMobileViewport
              ? 'bottom-[74px] items-end'
              : 'top-20 items-start'
        }`}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={{ opacity: 0, y: isMobileViewport ? 10 : -8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMobileViewport ? 6 : -6, scale: 0.985 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-auto w-full max-w-xl max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200/90 dark:border-slate-700/80 shadow-2xl shadow-slate-950/30 text-slate-900 dark:text-slate-100"
          >
            {isDoneScreen ? (
              /* Final 'All Done' Completion Screen */
              <div className="p-6 sm:p-7 space-y-5 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {lang === 'hi' ? 'टूर पूर्ण हुआ' : 'Tour Complete'}
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {lang === 'hi' ? currentStep.titleHi : currentStep.titleEn}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                    {lang === 'hi' ? currentStep.subtitleHi : currentStep.subtitleEn}
                  </p>
                </div>

                {/* 5-Tab Recap Strip — no truncation on any screen width */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  {TOUR_STEPS.slice(0, 5).map((st) => {
                    const TabIcon = st.Icon;
                    return (
                      <div
                        key={st.id}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800 flex flex-col items-center gap-1.5"
                      >
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${st.accentBg}`}>
                          <TabIcon className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center leading-tight">
                          {lang === 'hi' ? st.navLabelHi : st.navLabelEn}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => onClose('practice')}
                    className="w-full sm:w-auto flex-1 h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors shadow-sm whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>{lang === 'hi' ? 'अभ्यास शुरू करें' : 'Start Practicing'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onClose('home')}
                    className="w-full sm:w-auto h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-colors whitespace-nowrap"
                  >
                    {lang === 'hi' ? 'होम पर जाएं' : 'Go to Home'}
                  </button>
                </div>
              </div>
            ) : (
              /* Core Navigation Tab Guided Steps */
              <div className="p-5 sm:p-6 space-y-4">
                {/* Step Progress Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${currentStep.accentBg}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1">
                          <Compass className="w-3.5 h-3.5" />
                          {lang === 'hi' ? currentStep.navLabelHi : currentStep.navLabelEn}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {lang === 'hi'
                            ? `चरण ${stepIndex + 1} / ${totalNavSteps}`
                            : `Step ${stepIndex + 1} of ${totalNavSteps}`}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug mt-0.5">
                        {lang === 'hi' ? currentStep.titleHi : currentStep.titleEn}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onClose()}
                    aria-label={lang === 'hi' ? 'टूर छोड़ें' : 'Skip tour'}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lang === 'hi' ? currentStep.subtitleHi : currentStep.subtitleEn}
                </p>

                {/* Interactive Workflow Steps for Practice */}
                {currentStep.id === 'practice' &&
                  renderWorkflowList(practiceWorkflowItems, practiceDemoStep, 'blue')}

                {/* Interactive Workflow Steps for Tests */}
                {currentStep.id === 'mock_tests' &&
                  renderWorkflowList(testWorkflowItems, testDemoStep, 'teal')}

                {/* Standard Bullet Highlights for Home, Revision, Stats */}
                {currentStep.id !== 'practice' && currentStep.id !== 'mock_tests' && (
                  <ul className="space-y-2 text-xs sm:text-[13px] text-slate-700 dark:text-slate-200">
                    {(lang === 'hi' ? currentStep.bulletsHi : currentStep.bulletsEn).map((line, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Sequential Step Indicators */}
                <div className="flex items-center gap-1.5 pt-1">
                  {TOUR_STEPS.slice(0, totalNavSteps).map((st, idx) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => goToStep(idx)}
                      aria-label={`Go to ${st.navLabelEn}`}
                      className={`h-1.5 rounded-full transition-all ${
                        idx === stepIndex
                          ? 'w-7 bg-indigo-600 dark:bg-indigo-400'
                          : idx < stepIndex
                            ? 'w-3 bg-indigo-300 dark:bg-indigo-700'
                            : 'w-3 bg-slate-200 dark:bg-slate-700'
                      }`}
                    />
                  ))}
                </div>

                {/* Visible 'Skip' and 'Next' Controls */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onClose()}
                    className="px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors whitespace-nowrap"
                  >
                    {lang === 'hi' ? 'छोड़ें (Skip)' : 'Skip'}
                  </button>

                  <div className="flex items-center gap-2">
                    {stepIndex > 0 && (
                      <button
                        type="button"
                        onClick={handleBack}
                        aria-label={lang === 'hi' ? 'पिछला' : 'Previous step'}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>{lang === 'hi' ? 'पीछे' : 'Back'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleNext}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
                    >
                      <span>
                        {stepIndex === totalNavSteps - 1
                          ? lang === 'hi'
                            ? 'पूर्ण करें'
                            : 'Finish'
                          : lang === 'hi'
                            ? 'अगला (Next)'
                            : 'Next'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
