import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Compass,
  Home,
  Languages,
  UserCheck,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { usePlatform } from '../context/PlatformContext';
import type { Language } from '../types/math';

export const INTRO_STORAGE_KEY = 'sankhyaprep_intro_seen_v1';

export type IntroTabId = 'home' | 'practice' | 'mock_tests' | 'revision' | 'performance' | 'profile';

interface TourOptionItem {
  name: string;
  nameHi: string;
  desc: string;
  descHi: string;
  badge?: string;
}

interface TourStep {
  id: string;
  tab: IntroTabId;
  sectionLabel: string;
  sectionLabelHi: string;
  title: string;
  titleHi: string;
  summary: string;
  summaryHi: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentBg: string;
  options: TourOptionItem[];
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'overview',
    tab: 'home',
    sectionLabel: '01 · App Overview',
    sectionLabelHi: '01 · ऐप परिचय',
    title: 'Welcome to SankhyaPrep',
    titleHi: 'SankhyaPrep में आपका स्वागत है',
    summary:
      'A complete mathematics speed & competitive exam workspace that works offline and syncs when signed in. First, look at the always-available controls in the top bar:',
    summaryHi:
      'प्रतियोगी गणित अभ्यास और मॉक परीक्षा के लिए एक संपूर्ण प्लेटफ़ॉर्म, जो ऑफ़लाइन भी चलता है और साइन-इन करने पर सिंक होता है। ऊपर दिए गए मुख्य नियंत्रण ऐसे काम करते हैं:',
    Icon: Compass,
    accentBg: 'bg-indigo-600 text-white',
    options: [
      {
        name: 'Navigation Bar (Home · Practice · Mock Tests · Revision · Performance)',
        nameHi: 'नेविगेशन बार (होम · अभ्यास · मॉक टेस्ट · पुनरावृत्ति · प्रदर्शन)',
        desc: 'Switches directly between your daily dashboard, topic drills, timed exams, formula tables, and analytics.',
        descHi: 'डैशबोर्ड, विषय अभ्यास, समयबद्ध मॉक टेस्ट, सूत्र सारणी और प्रदर्शन विश्लेषण के बीच तुरंत स्विच करता है।',
      },
      {
        name: 'Language Switcher (EN / हिन्दी)',
        nameHi: 'भाषा चयन (EN / हिन्दी)',
        desc: 'Translates menus, buttons, questions, and step-by-step solutions between English and Hindi anytime.',
        descHi: 'सभी मेनू, प्रश्न और व्याख्याओं को कभी भी अंग्रेज़ी और हिन्दी में बदलें।',
      },
      {
        name: 'Theme Menu (Light / Dark / System)',
        nameHi: 'थीम विकल्प (लाइट / डार्क / सिस्टम)',
        desc: 'Switches between daylight mode, dark night-study mode, or your device default automatically.',
        descHi: 'दिन के लिए लाइट मोड, रात के अध्ययन के लिए डार्क मोड, या सिस्टम डिफ़ॉल्ट चुनें।',
      },
      {
        name: 'Profile / Sign In Button',
        nameHi: 'प्रोफ़ाइल / साइन इन बटन',
        desc: 'Use right away in Guest Mode or sign in with Google/Email to save history and join Scheduled Events.',
        descHi: 'अतिथि मोड में तुरंत अभ्यास करें या प्रगति सहेजने व लाइव टेस्ट में भाग लेने के लिए साइन इन करें।',
      },
    ],
  },
  {
    id: 'home',
    tab: 'home',
    sectionLabel: '02 · Home Section',
    sectionLabelHi: '02 · होम सेक्शन',
    title: 'Home Dashboard — Your Daily Start Point',
    titleHi: 'होम डैशबोर्ड — दैनिक शुरुआत केंद्र',
    summary:
      'The Home tab brings your daily goal, paused sessions, and quick shortcuts together in one place so you can start in one click.',
    summaryHi:
      'होम टैब आपका दैनिक लक्ष्य, रुके हुए सत्र और त्वरित शॉर्टकट एक ही स्थान पर दिखाता है।',
    Icon: Home,
    accentBg: 'bg-blue-600 text-white',
    options: [
      {
        name: 'Daily Practice Target Ring',
        nameHi: 'दैनिक अभ्यास लक्ष्य रिंग',
        desc: 'Shows how many questions you solved today out of your daily goal, your streak days, and total practice time.',
        descHi: 'आज हल किए गए प्रश्न, सटीकता, स्ट्रीक और कुल अभ्यास समय दिखाता है।',
      },
      {
        name: 'Continue Learning Card',
        nameHi: 'सीखना जारी रखें कार्ड',
        desc: 'Resumes an unfinished session from the exact question where you left off, or restarts your last practiced topic.',
        descHi: 'अधूरे सत्र को ठीक उसी प्रश्न से फिर से शुरू करता है जहाँ आपने छोड़ा था।',
      },
      {
        name: 'Learn & Practice + Quick Access Topics',
        nameHi: 'अध्ययन कार्ड और त्वरित विषय',
        desc: 'Shortcuts straight to Practice Topics, Mock Tests, Revision Guides, or individual speed math tiles (x², x³, √x, ∛x).',
        descHi: 'अभ्यास, मॉक टेस्ट, पुनरावृत्ति या वर्ग, घन, वर्गमूल जैसे विषयों को 1 क्लिक में खोलता है।',
      },
    ],
  },
  {
    id: 'practice',
    tab: 'practice',
    sectionLabel: '03 · Practice Section',
    sectionLabelHi: '03 · अभ्यास सेक्शन',
    title: 'Practice Topics — Custom Skill Drills',
    titleHi: 'अभ्यास विषय — कस्टम गणित ड्रिल',
    summary:
      'Master 14 mathematical topics (Speed & Mental Math + Arithmetic Basics) with unlimited dynamically generated questions tailored to your settings.',
    summaryHi:
      '14 गणितीय विषयों (त्वरित गणना और मूल अंकगणित) पर अपनी आवश्यकतानुसार असीमित प्रश्नों का अभ्यास करें।',
    Icon: Calculator,
    accentBg: 'bg-indigo-600 text-white',
    options: [
      {
        name: 'Category Filter & Topic Cards (x², x³, √x, %, a/b, +, −, ×, ÷)',
        nameHi: 'श्रेणी फ़िल्टर और विषय कार्ड',
        desc: 'Filter All, Speed & Memory, or Arithmetic Basics, then tap any symbol card to configure that specific topic.',
        descHi: 'सभी, त्वरित स्मृति या मूल अंकगणित फ़िल्टर करें और किसी भी विषय कार्ड को चुनकर सेटअप खोलें।',
      },
      {
        name: 'Range, Order & Difficulty Controls',
        nameHi: 'सीमा, क्रम और कठिनाई नियंत्रण',
        desc: 'Pick number bounds (like Tables 11–20 or Custom Min–Max), Random vs Sequence mode, Easy/Medium/Hard, and 10/20/30/Unlimited questions.',
        descHi: 'संख्या सीमा (जैसे पहाड़े 11–20 या कस्टम), यादृच्छिक या क्रमबद्ध मोड, कठिनाई और प्रश्नों की संख्या चुनें।',
      },
      {
        name: 'Advanced Settings (Timed, Format & Instant Feedback)',
        nameHi: 'उन्नत सेटिंग्स (समय, प्रारूप और तुरंत जांच)',
        desc: 'Turn Timed Practice on/off, filter Direct/MCQ/Missing Number questions, or toggle step-by-step solutions after every answer. Numeric answers open a dedicated number keypad.',
        descHi: 'समयबद्ध मोड, प्रश्न प्रकार और तुरंत उत्तर जांच सेट करें। संख्यात्मक प्रश्नों में केवल नंबर कीपैड खुलता है।',
      },
    ],
  },
  {
    id: 'mock_tests',
    tab: 'mock_tests',
    sectionLabel: '04 · Mock Tests Section',
    sectionLabelHi: '04 · मॉक टेस्ट सेक्शन',
    title: 'Mock Tests — Anytime Mocks & Live Events',
    titleHi: 'मॉक टेस्ट — एनीटाइम मॉक और लाइव इवेंट्स',
    summary:
      'Built like a real competitive exam studio with two dedicated modes at the top switcher: Anytime Mocks and Live Events.',
    summaryHi:
      'ऊपर दिए गए स्विचर से दो अलग परीक्षा मोड चुनें: एनीटाइम मॉक टेस्ट और लाइव टेस्ट इवेंट्स।',
    Icon: ClipboardCheck,
    accentBg: 'bg-teal-600 text-white',
    options: [
      {
        name: 'Anytime Mocks (4 Formats: Topic-Wise, Mixed, Full-Length, Difficulty)',
        nameHi: 'एनीटाइम मॉक (4 प्रारूप: विषय-वार, मिश्रित, पूर्ण लंबाई, कठिनाई स्तर)',
        desc: 'Test one topic or blend multiple topics using filter pills (All, Speed Math, Arithmetic, Selected), or launch 50/100-question full-length exams.',
        descHi: 'एक विषय, मिश्रित विषय (फ़िल्टर पिल्स के साथ), या 50/100 प्रश्नों के पूर्ण-लंबाई टेस्ट कभी भी दें।',
      },
      {
        name: 'Advanced Settings & Test Summary Pass',
        nameHi: 'उन्नत सेटिंग्स और परीक्षा सारांश कार्ड',
        desc: 'Expand Advanced Settings to adjust Questions, Duration, Marking Rules (+2/-0.5, etc.), and Difficulty while previewing your Test Summary card on the right.',
        descHi: 'उन्नत सेटिंग्स में प्रश्न, समय, अंकन नियम (+2/-0.5) और कठिनाई बदलें और दाईं ओर सारांश देखें।',
      },
      {
        name: 'Live Events (Scheduled Test Events & My Events)',
        nameHi: 'लाइव इवेंट्स (निर्धारित प्रतियोगी परीक्षाएं)',
        desc: 'Browse upcoming contests, view prize details, register for free or paid events, enter during the live exam window, and check verified winner leaderboards.',
        descHi: 'आगामी प्रतियोगी टेस्ट देखें, पंजीकरण करें, निर्धारित समय पर परीक्षा दें और रैंकिंग व विजेता देखें।',
      },
    ],
  },
  {
    id: 'revision',
    tab: 'revision',
    sectionLabel: '05 · Revision Section',
    sectionLabelHi: '05 · पुनरावृत्ति सेक्शन',
    title: 'Revision Hub — Tables, Formulas & Shortcuts',
    titleHi: 'पुनरावृत्ति केंद्र — पहाड़े, सूत्र और शॉर्टकट',
    summary:
      'Review core facts, Vedic math tricks, and solved examples before jumping into a timed drill or mock test.',
    summaryHi:
      'अभ्यास या परीक्षा शुरू करने से पहले महत्वपूर्ण पहाड़े, सूत्र, शॉर्टकट नियम और उदाहरण दोहराएं।',
    Icon: BookOpen,
    accentBg: 'bg-orange-500 text-white',
    options: [
      {
        name: 'Quick Reference Tables (1–50 Tables, Squares, Cubes, Roots, Trig)',
        nameHi: 'त्वरित संदर्भ सारणी (1–50 पहाड़े, वर्ग, घन, त्रिकोणमिति)',
        desc: 'Browse clean lookup tables to memorize values rapidly without clutter.',
        descHi: 'पहाड़े, वर्ग, घन और मानक त्रिकोणमितीय मान आसानी से याद करें।',
      },
      {
        name: 'Copy & Bookmark Important Formulas',
        nameHi: 'सूत्र कॉपी और बुकमार्क करें',
        desc: 'Save tricky shortcut formulas to your Bookmarks filter and copy them in one tap.',
        descHi: 'महत्वपूर्ण शॉर्टकट सूत्रों को बुकमार्क करें ताकि परीक्षा से पहले तुरंत मिल सकें।',
      },
      {
        name: 'Direct Practice Launch',
        nameHi: 'सीधे अभ्यास शुरू करें',
        desc: 'Finished revising a concept? Launch a matching topic drill right from the Revision view.',
        descHi: 'किसी विषय को दोहराने के बाद वहीं से उसका अभ्यास सत्र शुरू करें।',
      },
    ],
  },
  {
    id: 'performance',
    tab: 'performance',
    sectionLabel: '06 · Performance Section',
    sectionLabelHi: '06 · प्रदर्शन सेक्शन',
    title: 'Performance Analytics — Speed & Weak-Area Insights',
    titleHi: 'प्रदर्शन विश्लेषण — गति और कमजोर विषय पहचान',
    summary:
      'Every completed Practice session and Mock Test automatically feeds your analytics dashboard so you know exactly what to improve next.',
    summaryHi:
      'प्रत्येक पूर्ण अभ्यास और मॉक टेस्ट के बाद आपकी सटीकता, गति और कमजोर विषयों का विश्लेषण यहाँ दिखता है।',
    Icon: BarChart3,
    accentBg: 'bg-purple-600 text-white',
    options: [
      {
        name: 'Focus Topics (Needs Practice)',
        nameHi: 'सुधार योग्य विषय (Focus Topics)',
        desc: 'Highlights topics where your accuracy is lower or slower, with a 1-click Practice Now shortcut.',
        descHi: 'कम सटीकता वाले विषयों को पहचानकर सीधे अभ्यास शुरू करने का विकल्प देता है।',
      },
      {
        name: 'Topic-Wise Accuracy & Avg Time / Q',
        nameHi: 'विषयवार सटीकता और औसत समय',
        desc: 'Compare your speed (seconds per question) and accuracy across all 14 math topics.',
        descHi: 'सभी 14 विषयों में प्रति प्रश्न लगने वाले समय और सटीकता की तुलना करें।',
      },
      {
        name: 'Complete Attempt History',
        nameHi: 'सत्र इतिहास और समीक्षा',
        desc: 'Inspect previous practice drills and mock test scores to track steady progress over time.',
        descHi: 'पिछले अभ्यास और मॉक टेस्ट के परिणाम व स्कोर कभी भी देखें।',
      },
    ],
  },
  {
    id: 'profile',
    tab: 'profile',
    sectionLabel: '07 · Profile & Sync',
    sectionLabelHi: '07 · प्रोफ़ाइल और सिंक',
    title: 'Profile, Offline Storage & Preferences',
    titleHi: 'प्रोफ़ाइल, ऑफ़लाइन स्टोरेज और प्राथमिकताएं',
    summary:
      'Control how SankhyaPrep stores your progress, customize daily goals and audio feedback, or replay this guide anytime.',
    summaryHi:
      'अपना खाता जोड़ें, दैनिक लक्ष्य व ध्वनि सेटिंग्स बदलें, और ऑफ़लाइन/क्लाउड सिंक प्रबंधित करें।',
    Icon: UserCheck,
    accentBg: 'bg-emerald-600 text-white',
    options: [
      {
        name: 'Cloud Sync & Guest Data Migration',
        nameHi: 'क्लाउड सिंक और अतिथि डेटा ट्रांसफर',
        desc: 'Sign in with Google or Email to back up sessions and transfer any offline Guest Mode history into your account.',
        descHi: 'साइन इन करके अपना ऑफ़लाइन डेटा सुरक्षित क्लाउड खाते में ट्रांसफर करें।',
      },
      {
        name: 'Study Preferences (Daily Target, Sound, Vibration)',
        nameHi: 'अध्ययन प्राथमिकताएं (दैनिक लक्ष्य, ध्वनि, कंपन)',
        desc: 'Set your default question count, difficulty, daily goal, and tactile sound/vibration cues.',
        descHi: 'दैनिक प्रश्न लक्ष्य, डिफ़ॉल्ट कठिनाई, ध्वनि और कंपन प्रतिक्रिया सेट करें।',
      },
      {
        name: 'Replay Complete App Guide Anytime',
        nameHi: 'ऐप गाइड कभी भी फिर से देखें',
        desc: 'You can reopen this step-by-step introduction anytime from the App Guide button inside Profile.',
        descHi: 'प्रोफ़ाइल में दिए गए ऐप गाइड बटन से आप यह परिचय कभी भी दोबारा देख सकते हैं।',
      },
    ],
  },
];

interface AppIntroductionModalProps {
  open: boolean;
  onClose: () => void;
  onPreviewTab: (tab: IntroTabId) => void;
}

export const AppIntroductionModal: React.FC<AppIntroductionModalProps> = ({
  open,
  onClose,
  onPreviewTab,
}) => {
  const { settings, setLanguage } = usePlatform();
  const lang = settings.language;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setStepIndex((prev) => {
          const next = Math.min(TOUR_STEPS.length - 1, prev + 1);
          onPreviewTab(TOUR_STEPS[next].tab);
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        setStepIndex((prev) => {
          const next = Math.max(0, prev - 1);
          onPreviewTab(TOUR_STEPS[next].tab);
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose, onPreviewTab]);

  if (!open) return null;

  const step = TOUR_STEPS[stepIndex] ?? TOUR_STEPS[0];
  const StepIcon = step.Icon;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const goToStep = (idx: number) => {
    const clamped = Math.max(0, Math.min(TOUR_STEPS.length - 1, idx));
    setStepIndex(clamped);
    onPreviewTab(TOUR_STEPS[clamped].tab);
  };

  const handleFinish = (destinationTab: IntroTabId = 'home') => {
    onPreviewTab(destinationTab);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-intro-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/65 backdrop-blur-xs"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 10 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-[#11192E] border border-slate-200 dark:border-slate-700/80 shadow-2xl overflow-hidden"
      >
        {/* Top Bar: Step Rail & Controls */}
        <div className="px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#0e1629]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
              {stepIndex + 1} / {TOUR_STEPS.length}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
              {lang === 'hi' ? step.sectionLabelHi : step.sectionLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Inline Language Toggle */}
            <div className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5 text-[11px] font-semibold">
              <Languages className="w-3 h-3 text-slate-400 mx-1 hidden sm:block" />
              {(['en', 'hi'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => void setLanguage(l)}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    lang === l
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {l === 'en' ? 'EN' : 'हिन्दी'}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={lang === 'hi' ? 'परिचय बंद करें' : 'Skip introduction'}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="hidden sm:inline">{lang === 'hi' ? 'छोड़ें' : 'Skip'}</span>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Interactive Section Stepper Bar */}
        <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-1.5 overflow-x-auto">
          {TOUR_STEPS.map((s, i) => {
            const active = i === stepIndex;
            const visited = i < stepIndex;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => goToStep(i)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : visited
                      ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                      : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="font-mono tabular-nums">{i + 1}.</span>
                <span>
                  {s.id === 'overview'
                    ? lang === 'hi'
                      ? 'परिचय'
                      : 'Overview'
                    : s.id === 'home'
                      ? lang === 'hi'
                        ? 'होम'
                        : 'Home'
                      : s.id === 'practice'
                        ? lang === 'hi'
                          ? 'अभ्यास'
                          : 'Practice'
                        : s.id === 'mock_tests'
                          ? lang === 'hi'
                            ? 'मॉक टेस्ट'
                            : 'Mock Tests'
                          : s.id === 'revision'
                            ? lang === 'hi'
                              ? 'पुनरावृत्ति'
                              : 'Revision'
                            : s.id === 'performance'
                              ? lang === 'hi'
                                ? 'प्रदर्शन'
                                : 'Performance'
                              : lang === 'hi'
                                ? 'प्रोफ़ाइल'
                                : 'Profile'}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Section Header */}
              <div className="flex items-start gap-3.5">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${step.accentBg}`}>
                  <StepIcon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="app-intro-title"
                    className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug"
                  >
                    {lang === 'hi' ? step.titleHi : step.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                    {lang === 'hi' ? step.summaryHi : step.summary}
                  </p>
                </div>
              </div>

              {/* Options Breakdown List ("Which Option Works How") */}
              <div className="divide-y divide-slate-200/75 dark:divide-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-xl bg-slate-50/60 dark:bg-slate-900/40">
                {step.options.map((opt) => (
                  <div key={opt.name} className="p-3.5 sm:px-4 space-y-1">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {lang === 'hi' ? opt.nameHi : opt.name}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                          {lang === 'hi' ? opt.descHi : opt.desc}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-[#0e1629] flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => goToStep(stepIndex - 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'hi' ? 'पिछला' : 'Previous'}</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {!isLast ? (
              <button
                type="button"
                onClick={() => goToStep(stepIndex + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
              >
                <span>{lang === 'hi' ? 'अगला अनुभाग' : 'Next Section'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleFinish('practice')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-200 text-xs font-semibold hover:border-indigo-400 transition-colors"
                >
                  <span>{lang === 'hi' ? 'अभ्यास खोलें' : 'Go to Practice'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleFinish('home')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold shadow-sm transition-colors"
                >
                  <span>{lang === 'hi' ? 'शुरू करें' : 'Start Using App'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
