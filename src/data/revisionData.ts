export interface RevisionFormula {
  id: string;
  title: string;
  titleHi: string;
  formula: string;
  explanation: string;
  explanationHi: string;
  example: string;
}

export interface RevisionCardBlock {
  id: string;
  title: string;
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  items: Array<{ label: string; value: string; note?: string }>;
}

export interface TableRangeSpec {
  id: string;
  label: string;
  labelHi: string;
  description: string;
  descriptionHi: string;
  start: number;
  end: number;
}

export interface RevisionTopicGuide {
  topicId: string;
  title: string;
  titleHi: string;
  shortDesc: string;
  shortDescHi: string;
  tagline: string;
  taglineHi: string;
  accentGradient: string;
  formulaAccent: string;
  sections: RevisionCardBlock[];
  formulas: RevisionFormula[];
  practiceExamples: Array<{ question: string; steps: string; answer: string }>;
  tableRanges?: TableRangeSpec[];
}

export const REVISION_GUIDES: RevisionTopicGuide[] = [
  {
    topicId: 'squares',
    title: 'Squares',
    titleHi: 'वर्ग',
    shortDesc: '1–30 key squares, base shortcuts, unit digits & formulas',
    shortDescHi: '1–30 वर्ग मान, शॉर्टकट ट्रिक्स व प्रमुख सूत्र',
    tagline: 'Master squares 1–30, base-50 & base-100 shortcuts, unit-digit patterns, and algebraic square identities.',
    taglineHi: '1–30 तक वर्ग, आधार 50 व 100 शॉर्टकट, इकाई अंक पैटर्न और बीजगणितीय सर्वसमिकाएँ।',
    accentGradient: 'from-indigo-600 to-blue-600',
    formulaAccent:
      'from-indigo-50/90 to-blue-50/70 dark:from-indigo-950/40 dark:to-blue-950/30 border-indigo-200/80 dark:border-indigo-900/70',
    sections: [
      {
        id: 'sq_values',
        title: '1. Important Squares (1–30)',
        titleHi: '1. महत्वपूर्ण वर्ग (1–30)',
        subtitle: 'High-frequency competitive exam values to memorize for instant recall.',
        subtitleHi: 'परीक्षाओं में बार-बार आने वाले प्रमुख वर्ग मान।',
        items: [
          { label: '1² – 10²', value: '1 · 4 · 9 · 16 · 25 · 36 · 49 · 64 · 81 · 100' },
          { label: '11² – 15²', value: '121 · 144 · 169 · 196 · 225' },
          { label: '16² – 20²', value: '256 · 289 · 324 · 361 · 400' },
          { label: '21² – 25²', value: '441 · 484 · 529 · 576 · 625' },
          { label: '26² – 30²', value: '676 · 729 · 784 · 841 · 900' },
        ],
      },
      {
        id: 'sq_tricks',
        title: '2. Shortcut Tricks',
        titleHi: '2. वर्ग शॉर्टकट ट्रिक्स',
        subtitle: 'Compute two-digit and near-base squares mentally in under 3 seconds.',
        subtitleHi: '3 सेकंड से कम समय में मानसिक वर्ग गणना।',
        items: [
          { label: 'Ending in 5 (n5)²', value: 'n(n + 1) | 25', note: '35² → (3×4) | 25 = 1225' },
          { label: 'Near Base 50 (50 ± d)²', value: '(25 ± d) | d²', note: '47² → (25 - 3) | 09 = 2209' },
          { label: 'Near Base 100 (100 ± d)²', value: '(100 ± 2d) | d²', note: '96² → (96 - 4) | 16 = 9216' },
        ],
      },
      {
        id: 'sq_patterns',
        title: '3. Unit-Digit & Elimination Rules',
        titleHi: '3. इकाई अंक नियम',
        subtitle: 'Instant elimination tricks for MCQ options using last digits.',
        subtitleHi: 'अंतिम अंकों से विकल्प तुरंत जांचने के नियम।',
        items: [
          { label: 'Never ends in', value: '2, 3, 7, 8', note: 'A perfect square never has unit digit 2, 3, 7, or 8.' },
          { label: 'Trailing Zeros', value: 'Always Even', note: 'Perfect squares never end with an odd count of zeros.' },
          { label: 'Digital Root', value: '1, 4, 7, 9', note: 'Sum of digits of any perfect square reduces to 1, 4, 7, or 9.' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_sq_1',
        title: 'Square of a Sum',
        titleHi: 'योग का वर्ग',
        formula: '(a + b)² = a² + 2ab + b²',
        explanation: 'Split any two-digit number into tens + units to calculate its square mentally.',
        explanationHi: 'किसी दो अंकीय संख्या को दहाई + इकाई में बाँटकर वर्ग निकालें।',
        example: '43² = (40 + 3)² = 1600 + 240 + 9 = 1849',
      },
      {
        id: 'f_sq_2',
        title: 'Square of a Difference',
        titleHi: 'अंतर का वर्ग',
        formula: '(a - b)² = a² - 2ab + b²',
        explanation: 'Useful when a number is just below a clean multiple of 10 or 100.',
        explanationHi: '10 या 100 के गुणज से ठीक कम संख्याओं का वर्ग निकालने के लिए उपयोगी।',
        example: '98² = (100 - 2)² = 10000 - 400 + 4 = 9604',
      },
      {
        id: 'f_sq_3',
        title: 'Difference of Two Squares',
        titleHi: 'दो वर्गों का अंतर',
        formula: 'a² - b² = (a + b)(a - b)',
        explanation: 'Turns subtraction of large squares into one fast multiplication.',
        explanationHi: 'बड़े वर्गों के अंतर को आसान गुणा में बदलता है।',
        example: '64² - 36² = (64 + 36)(64 - 36) = 100 × 28 = 2800',
      },
    ],
    practiceExamples: [
      { question: 'Calculate 75² mentally', steps: '7 × (7 + 1) = 56, append 25', answer: '5625' },
      { question: 'Calculate 54² using Base 50', steps: '(25 + 4) | 4² = 29 | 16', answer: '2916' },
      { question: 'Calculate 93² using Base 100', steps: '(93 - 7) | 7² = 86 | 49', answer: '8649' },
    ],
  },
  {
    topicId: 'cubes',
    title: 'Cubes',
    titleHi: 'घन',
    shortDesc: '1–20 cubes, unit-digit mapping & algebraic identities',
    shortDescHi: '1–20 घन मान, इकाई अंक नियम और घन सूत्र',
    tagline: 'Rapidly recall cubes 1–20, cube unit-digit mapping, and binomial cube identities.',
    taglineHi: '1–20 तक घन, इकाई अंक पहचान नियम और घन सर्वसमिकाएँ।',
    accentGradient: 'from-purple-600 to-indigo-600',
    formulaAccent:
      'from-purple-50/90 to-indigo-50/70 dark:from-purple-950/40 dark:to-indigo-950/30 border-purple-200/80 dark:border-purple-900/70',
    sections: [
      {
        id: 'cb_values',
        title: '1. Important Cubes (1–20)',
        titleHi: '1. महत्वपूर्ण घन (1–20)',
        subtitle: 'Core cube values used across Number Series, Simplification, and CI.',
        subtitleHi: 'संख्या श्रृंखला और चक्रवृद्धि ब्याज के लिए आवश्यक घन मान।',
        items: [
          { label: '1³ – 5³', value: '1 · 8 · 27 · 64 · 125' },
          { label: '6³ – 10³', value: '216 · 343 · 512 · 729 · 1000' },
          { label: '11³ – 15³', value: '1331 · 1728 · 2197 · 2744 · 3375' },
          { label: '16³ – 20³', value: '4096 · 4913 · 5832 · 6859 · 8000' },
        ],
      },
      {
        id: 'cb_patterns',
        title: '2. Cube Unit-Digit Mapping',
        titleHi: '2. घन इकाई अंक पैटर्न',
        subtitle: 'Every digit 0–9 maps uniquely to a cube unit digit.',
        subtitleHi: '0 से 9 तक प्रत्येक अंक का अद्वितीय घन इकाई अंक होता है।',
        items: [
          { label: 'Same unit digit', value: '0, 1, 4, 5, 6, 9', note: 'Cube ends in the exact same digit.' },
          { label: 'Swapped pairs', value: '2 ↔ 8  and  3 ↔ 7', note: '2³=8, 8³=512; 3³=27, 7³=343.' },
        ],
      },
      {
        id: 'cb_tricks',
        title: '3. Cube Shortcuts & Results',
        titleHi: '3. घन शॉर्टकट',
        subtitle: 'Ratio expansion method for 2-digit numbers.',
        subtitleHi: 'दो अंकीय संख्याओं का घन निकालने की अनुपात विधि।',
        items: [
          { label: 'Sum of first n cubes', value: '[n(n + 1) / 2]²', note: '1³ + 2³ + 3³ + 4³ = 10² = 100' },
          { label: '2-digit expansion', value: 'a³ | 3a²b | 3ab² | b³', note: 'Carry right-to-left keeping 1 digit per column.' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_cb_1',
        title: 'Cube of a Sum',
        titleHi: 'योग का घन',
        formula: '(a + b)³ = a³ + 3a²b + 3ab² + b³',
        explanation: 'Expanded form also written as a³ + b³ + 3ab(a + b).',
        explanationHi: 'सरल रूप में a³ + b³ + 3ab(a + b) भी लिखा जाता है।',
        example: '12³ = (10+2)³ = 1000 + 600 + 120 + 8 = 1728',
      },
      {
        id: 'f_cb_2',
        title: 'Cube of a Difference',
        titleHi: 'अंतर का घन',
        formula: '(a - b)³ = a³ - 3a²b + 3ab² - b³',
        explanation: 'Alternating signs let you compute cubes near 20, 30, or 100.',
        explanationHi: 'वैकल्पिक चिह्नों से आधार के निकट संख्याओं का घन निकालें।',
        example: '19³ = (20 - 1)³ = 8000 - 1200 + 60 - 1 = 6859',
      },
      {
        id: 'f_cb_3',
        title: 'Sum & Difference of Cubes',
        titleHi: 'घनों का योग व अंतर',
        formula: 'a³ + b³ = (a + b)(a² - ab + b²)',
        explanation: 'Frequently tested in Algebra simplification problems.',
        explanationHi: 'बीजगणित सरलीकरण के प्रश्नों में सर्वाधिक प्रयुक्त सूत्र।',
        example: 'If a + b = 7, ab = 10 → a³ + b³ = 7(49 - 30) = 133',
      },
    ],
    practiceExamples: [
      { question: 'Evaluate 14³', steps: '10³ + 3(100)(4) + 3(10)(16) + 64 = 1000 + 1200 + 480 + 64', answer: '2744' },
      { question: 'Evaluate 1³ + 2³ + ... + 5³', steps: '[5 × 6 / 2]² = 15²', answer: '225' },
    ],
  },
  {
    topicId: 'square_roots',
    title: 'Square Roots',
    titleHi: 'वर्गमूल',
    shortDesc: 'Root values, simplification, formulas, tricks & examples',
    shortDescHi: 'वर्गमूल मान, सरलीकरण, सूत्र, शॉर्टकट व उदाहरण',
    tagline: 'Memorize key roots, simplify surds cleanly, and extract 4-digit and 5-digit perfect square roots in seconds.',
    taglineHi: 'मुख्य वर्गमूल मान, करणी सरलीकरण और 4-5 अंकीय वर्गमूल निकालने की तेज़ विधियाँ।',
    accentGradient: 'from-cyan-600 to-blue-600',
    formulaAccent:
      'from-cyan-50/90 to-blue-50/70 dark:from-cyan-950/40 dark:to-blue-950/30 border-cyan-200/80 dark:border-cyan-900/70',
    sections: [
      {
        id: 'sr_important',
        title: '1. Important Square Roots',
        titleHi: '1. महत्वपूर्ण वर्गमूल',
        subtitle: 'Non-perfect irrational roots frequently needed in Mensuration and Geometry.',
        subtitleHi: 'ज्यामिति व क्षेत्रमिति में प्रयुक्त मुख्य अपरिमेय वर्गमूल मान।',
        items: [
          { label: '√2', value: '1.414', note: 'Diagonal of unit square = √2' },
          { label: '√3', value: '1.732', note: 'Equilateral triangle height = (√3/2)a' },
          { label: '√5 · √6 · √7', value: '2.236 · 2.449 · 2.646' },
          { label: '√8 · √10', value: '2.828 · 3.162' },
        ],
      },
      {
        id: 'sr_values',
        title: '2. Square Root Values (Perfect Squares)',
        titleHi: '2. पूर्ण वर्ग संख्याओं के वर्गमूल मान',
        subtitle: 'Instant recognition chart for perfect squares up to 900.',
        subtitleHi: '900 तक की पूर्ण वर्ग संख्याओं के वर्गमूल चार्ट।',
        items: [
          { label: '√121 · √144 · √169 · √196 · √225', value: '11 · 12 · 13 · 14 · 15' },
          { label: '√256 · √289 · √324 · √361 · √400', value: '16 · 17 · 18 · 19 · 20' },
          { label: '√441 · √484 · √529 · √576 · √625', value: '21 · 22 · 23 · 24 · 25' },
          { label: '√676 · √729 · √784 · √841 · √900', value: '26 · 27 · 28 · 29 · 30' },
        ],
      },
      {
        id: 'sr_simplification',
        title: '3. Simplification',
        titleHi: '3. वर्गमूल सरलीकरण',
        subtitle: 'Factor out the largest perfect square or combine like surds.',
        subtitleHi: 'पूर्ण वर्ग गुणनखंड अलग करके सरल करें।',
        items: [
          { label: 'Product Split', value: '√(a × b) = √a × √b', note: '√72 = √(36 × 2) = 6√2' },
          { label: 'Rationalization', value: '1 / (√a - √b) = (√a + √b) / (a - b)', note: '1 / (√5 - √3) = (√5 + √3) / 2' },
          { label: 'Combined Roots', value: '√256 + √196 = 16 + 14 = 30' },
        ],
      },
      {
        id: 'sr_tricks',
        title: '5. Shortcut Tricks',
        titleHi: '5. शॉर्टकट ट्रिक्स',
        subtitle: '2-step unit-digit & range method for 4-digit and 5-digit perfect squares.',
        subtitleHi: 'बड़ी पूर्ण वर्ग संख्याओं का वर्गमूल 3 सेकंड में निकालें।',
        items: [
          { label: 'Last Digit → Unit Choice', value: '1→1/9 · 4→2/8 · 5→5 · 6→4/6 · 9→3/7' },
          { label: 'Step 1 (Ignore last 2 digits)', value: 'Nearest smaller n²', note: 'For √2304, ignore 04 → 4² = 16 ≤ 23 → tens = 4' },
          { label: 'Step 2 (Compare n×(n+1))', value: '23 > 4×5 (20) → Pick larger', note: 'Choices 42 or 48 → pick 48!' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_sr_1',
        title: 'Product & Quotient Rule',
        titleHi: 'गुणन व भाग वर्गमूल नियम',
        formula: '√(a·b) = √a · √b  |  √(a/b) = √a / √b',
        explanation: 'Valid for all non-negative real numbers (b > 0).',
        explanationHi: 'सभी धनात्मक संख्याओं (b > 0) के लिए मान्य।',
        example: '√(144 / 25) = 12 / 5 = 2.4',
      },
      {
        id: 'f_sr_2',
        title: 'Nested Radical Formula',
        titleHi: 'द्वि-पद करणी सूत्र',
        formula: '√(a + b ± 2√(ab)) = √a ± √b',
        explanation: 'Express inside radical as sum and 2√product to unwrap nested square roots instantly.',
        explanationHi: 'अंदर की संख्या को (a+b) और 2√(ab) में तोड़कर वर्गमूल निकालें।',
        example: '√(8 + 2√15) = √(5 + 3 + 2√(5×3)) = √5 + √3',
      },
      {
        id: 'f_sr_3',
        title: 'Non-Perfect Root Approximation',
        titleHi: 'अपूर्ण वर्ग सन्निकटन सूत्र',
        formula: '√(x ± y) ≈ √x ± y / (2√x)',
        explanation: 'Choose x as the closest perfect square to estimate decimal square roots rapidly.',
        explanationHi: 'निकटतम पूर्ण वर्ग x लेकर दशमलव मान जल्दी निकालें।',
        example: '√27 = √(25 + 2) ≈ 5 + 2/(2×5) = 5.20',
      },
    ],
    practiceExamples: [
      { question: 'Find √3136 mentally', steps: 'Ends in 6 → 4 or 6. Ignore 36 → 5²=25 ≤ 31. Compare 31 > 5×6 (30) → pick larger', answer: '56' },
      { question: 'Simplify √128 - √32', steps: '8√2 - 4√2 = 4√2', answer: '4√2' },
      { question: 'Evaluate √0.0625', steps: '625 → 25; 4 decimal places halve to 2 decimal places', answer: '0.25' },
    ],
  },
  {
    topicId: 'cube_roots',
    title: 'Cube Roots',
    titleHi: 'घनमूल',
    shortDesc: 'Instant 6-digit cube root lookup & unit-digit mapping',
    shortDescHi: 'बड़ी संख्याओं का घनमूल 2 सेकंड में निकालें',
    tagline: 'Master the unique 0–9 unit-digit trick to find cube roots of any perfect cube up to 1,000,000.',
    taglineHi: 'अद्वितीय इकाई अंक नियम से 6 अंकों तक की संख्याओं का घनमूल तुरंत ज्ञात करें।',
    accentGradient: 'from-violet-600 to-purple-600',
    formulaAccent:
      'from-violet-50/90 to-purple-50/70 dark:from-violet-950/40 dark:to-purple-950/30 border-violet-200/80 dark:border-violet-900/70',
    sections: [
      {
        id: 'cr_values',
        title: '1. Standard Cube Root Values',
        titleHi: '1. प्रमुख घनमूल मान',
        subtitle: 'Essential cube roots for speed arithmetic and series.',
        subtitleHi: 'प्रमुख पूर्ण घन संख्याओं के घनमूल।',
        items: [
          { label: '∛8 · ∛27 · ∛64 · ∛125', value: '2 · 3 · 4 · 5' },
          { label: '∛216 · ∛343 · ∛512 · ∛729', value: '6 · 7 · 8 · 9' },
          { label: '∛1331 · ∛1728 · ∛2197 · ∛2744', value: '11 · 12 · 13 · 14' },
          { label: '∛3375 · ∛4096 · ∛4913 · ∛5832', value: '15 · 16 · 17 · 18' },
        ],
      },
      {
        id: 'cr_tricks',
        title: '2. Two-Step Cube Root Shortcut',
        titleHi: '2. घनमूल शॉर्टकट विधि',
        subtitle: 'Simpler than square roots because every unit digit is unique!',
        subtitleHi: 'हर इकाई अंक अद्वितीय होने से घनमूल निकालना बेहद सरल है।',
        items: [
          { label: 'Same Digit Group', value: '0, 1, 4, 5, 6, 9 → Same', note: 'Ends in 4 → cube root ends in 4' },
          { label: 'Complement Pair Group', value: '2 ↔ 8  and  3 ↔ 7', note: 'Ends in 2 → root ends in 8; ends in 7 → root ends in 3' },
          { label: 'Drop last 3 digits', value: 'Nearest smaller n³', note: '∛175616: ends in 6 → 6; 5³=125 ≤ 175 < 216 → 56' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_cr_1',
        title: 'Cube Root Product & Decimal Rule',
        titleHi: 'घनमूल दशमलव नियम',
        formula: '∛(a × b) = ∛a × ∛b  |  Decimals ÷ 3',
        explanation: 'Decimal places inside a cube root divide cleanly by 3 in the answer.',
        explanationHi: 'दशमलव स्थानों की संख्या उत्तर में एक-तिहाई हो जाती है।',
        example: '∛0.000216 (6 decimal places) = 0.06 (2 decimal places)',
      },
      {
        id: 'f_cr_2',
        title: 'Negative Cube Root Identity',
        titleHi: 'ऋणात्मक घनमूल नियम',
        formula: '∛(-x) = -∛x',
        explanation: 'Unlike even roots, odd roots of negative real numbers are real and negative.',
        explanationHi: 'ऋणात्मक संख्या का घनमूल हमेशा वास्तविक और ऋणात्मक होता है।',
        example: '∛(-343) = -7',
      },
    ],
    practiceExamples: [
      { question: 'Find ∛54872', steps: 'Ends in 2 → unit digit 8. Drop 872 → 3³=27 ≤ 54 < 64 → tens digit 3.', answer: '38' },
      { question: 'Find ∛0.027', steps: '∛27 = 3; 3 decimal places ÷ 3 = 1 decimal place.', answer: '0.3' },
    ],
  },
  {
    topicId: 'tables',
    title: 'Multiplication Tables',
    titleHi: 'पहाड़े (1–100)',
    shortDesc: 'Dedicated table charts for 1–10, 11–20, 21–30, 31–40 & more',
    shortDescHi: '1–10, 11–20, 21–30, 31–40 और उच्च पहाड़ों की तालिकाएँ',
    tagline: 'Browse structured multiplication tables by range (1–10, 11–20, 21–30, 31–40, 41–50) for instant recall.',
    taglineHi: 'श्रेणी के अनुसार पहाड़े (1–10, 11–20, 21–30, 31–40, 41–50) पढ़ें और तुरंत अभ्यास करें।',
    accentGradient: 'from-blue-600 to-indigo-600',
    formulaAccent:
      'from-blue-50/90 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/30 border-blue-200/80 dark:border-blue-900/70',
    tableRanges: [
      {
        id: 'tbl_1_10',
        label: 'Tables 1–10',
        labelHi: 'पहाड़े 1–10',
        description: 'Essential foundation tables from 1 to 10.',
        descriptionHi: '1 से 10 तक बुनियादी पहाड़े।',
        start: 1,
        end: 10,
      },
      {
        id: 'tbl_11_20',
        label: 'Tables 11–20',
        labelHi: 'पहाड़े 11–20',
        description: 'Must-know exam tables (12, 13, 14, 16, 17, 18, 19).',
        descriptionHi: 'परीक्षाओं में सर्वाधिक उपयोगी 11 से 20 तक के पहाड़े।',
        start: 11,
        end: 20,
      },
      {
        id: 'tbl_21_30',
        label: 'Tables 21–30',
        labelHi: 'पहाड़े 21–30',
        description: 'Speed-building prime & composite tables (23, 24, 27, 29).',
        descriptionHi: 'तेज़ गणना के लिए 21 से 30 तक पहाड़े।',
        start: 21,
        end: 30,
      },
      {
        id: 'tbl_31_40',
        label: 'Tables 31–40',
        labelHi: 'पहाड़े 31–40',
        description: 'Advanced DI & simplification tables (31–40).',
        descriptionHi: 'डेटा इंटरप्रिटेशन के लिए 31 से 40 तक पहाड़े।',
        start: 31,
        end: 40,
      },
      {
        id: 'tbl_41_50',
        label: 'Tables 41–50',
        labelHi: 'पहाड़े 41–50',
        description: 'Higher speed multipliers and base-50 splits (41–50).',
        descriptionHi: 'उच्च गति गुणा के लिए 41 से 50 तक पहाड़े।',
        start: 41,
        end: 50,
      },
    ],
    sections: [
      {
        id: 'tbl_tricks',
        title: 'Split & Conquer Table Tricks',
        titleHi: 'बड़े पहाड़े बनाने के शॉर्टकट',
        subtitle: 'Build any 2-digit table from 1–10 tables in one mental step.',
        subtitleHi: 'किसी भी 2-अंकीय संख्या का पहाड़ा मानसिक रूप से बनाएं।',
        items: [
          { label: 'Split Tens + Units', value: '27 × 6 = (20×6) + (7×6) = 120 + 42 = 162' },
          { label: 'Round Up & Subtract', value: '19 × 7 = (20×7) - 7 = 133' },
          { label: 'Double & Halve', value: '14 × 15 = 7 × 30 = 210' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_tb_1',
        title: 'Sum of Any Table (n × 1 to n × 10)',
        titleHi: 'किसी पहाड़े के सभी 10 गुणजों का योग',
        formula: 'Sum(n×1 ... n×10) = 55 × n',
        explanation: 'Since 1+2+...+10 = 55, summing a table is always 55 times its base number.',
        explanationHi: '1 से 10 का योग 55 होने से किसी भी पहाड़े का कुल योग 55×n होता है।',
        example: 'Sum of table of 12 = 55 × 12 = 660',
      },
      {
        id: 'f_tb_2',
        title: 'Multiply by 11 Trick',
        titleHi: '11 से गुणा शॉर्टकट',
        formula: 'ab × 11 = a | (a + b) | b',
        explanation: 'Place the sum of digits between the outer digits, carrying 1 left if a+b ≥ 10.',
        explanationHi: 'दोनों अंकों का योग बीच में रखें।',
        example: '47 × 11 = 4 | (11) | 7 → 517',
      },
    ],
    practiceExamples: [
      { question: 'Calculate 29 × 8 mentally', steps: '(30 × 8) - 8 = 240 - 8', answer: '232' },
      { question: 'Calculate 37 × 6 mentally', steps: '(30 × 6) + (7 × 6) = 180 + 42', answer: '222' },
    ],
  },
  {
    topicId: 'trigonometry',
    title: 'Trigonometry',
    titleHi: 'त्रिकोणमिति',
    shortDesc: '0°–90° standard angles, ratios & Pythagorean identities',
    shortDescHi: '0°–90° कोण मान, अनुपात व प्रमुख सर्वसमिकाएँ',
    tagline: 'Standard angle table (0°–90°), right-triangle ratios, reciprocal rules, and Pythagorean identities.',
    taglineHi: 'मानक कोण सारणी (0°–90°), अनुपात, व्युत्क्रम व पाइथागोरस सर्वसमिकाएँ।',
    accentGradient: 'from-teal-600 to-emerald-600',
    formulaAccent:
      'from-teal-50/90 to-emerald-50/70 dark:from-teal-950/40 dark:to-emerald-950/30 border-teal-200/80 dark:border-teal-900/70',
    sections: [
      {
        id: 'tr_table',
        title: '1. Standard Trigonometric Values (0°–90°)',
        titleHi: '1. मानक त्रिकोणमितीय मान',
        subtitle: 'Exact values for 0°, 30°, 45°, 60°, and 90°.',
        subtitleHi: '0°, 30°, 45°, 60°, और 90° के सटीक मान।',
        items: [
          { label: 'sin θ (0°→90°)', value: '0 · 1/2 · 1/√2 · √3/2 · 1' },
          { label: 'cos θ (0°→90°)', value: '1 · √3/2 · 1/√2 · 1/2 · 0' },
          { label: 'tan θ (0°→90°)', value: '0 · 1/√3 · 1 · √3 · Undefined' },
          { label: 'sec θ (0°→90°)', value: '1 · 2/√3 · √2 · 2 · Undefined' },
        ],
      },
      {
        id: 'tr_ratios',
        title: '2. Right-Triangle Ratios & Reciprocals',
        titleHi: '2. समकोण त्रिभुज अनुपात व व्युत्क्रम',
        subtitle: 'Perpendicular (P), Base (B), Hypotenuse (H) relationships.',
        subtitleHi: 'लंब (P), आधार (B) और कर्ण (H) के संबंध।',
        items: [
          { label: 'sin θ · cos θ · tan θ', value: 'P/H · B/H · P/B' },
          { label: 'Reciprocals', value: 'cosec θ = 1/sin θ · sec θ = 1/cos θ · cot θ = 1/tan θ' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_tr_1',
        title: 'Fundamental Pythagorean Identity',
        titleHi: 'प्रमुख पाइथागोरस सर्वसमिका',
        formula: 'sin²θ + cos²θ = 1',
        explanation: 'Holds true for every angle θ; yields sin²θ = 1 - cos²θ.',
        explanationHi: 'प्रत्येक कोण θ के लिए सत्य; इससे sin²θ = 1 - cos²θ प्राप्त होता है।',
        example: 'sin²30° + cos²30° = (1/2)² + (√3/2)² = 1/4 + 3/4 = 1',
      },
      {
        id: 'f_tr_2',
        title: 'Secant-Tangent Identity',
        titleHi: 'सेकेंट-टैन सर्वसमिका',
        formula: 'sec²θ - tan²θ = 1',
        explanation: 'Factors into (sec θ + tan θ)(sec θ - tan θ) = 1 for rapid algebra solving.',
        explanationHi: '(sec θ + tan θ) और (sec θ - tan θ) एक-दूसरे के व्युत्क्रम होते हैं।',
        example: 'If sec θ + tan θ = 4, then sec θ - tan θ = 1/4',
      },
      {
        id: 'f_tr_3',
        title: 'Cosecant-Cotangent Identity',
        titleHi: 'कोसेक-कॉट सर्वसमिका',
        formula: 'cosec²θ - cot²θ = 1',
        explanation: 'Dividing sin²θ + cos²θ = 1 by sin²θ yields 1 + cot²θ = cosec²θ.',
        explanationHi: 'sin²θ से भाग देने पर 1 + cot²θ = cosec²θ प्राप्त होता है।',
        example: 'cosec²45° - cot²45° = (√2)² - 1² = 2 - 1 = 1',
      },
    ],
    practiceExamples: [
      { question: 'Evaluate tan 60° × cot 30°', steps: '√3 × √3 = 3', answer: '3' },
      { question: 'If sec θ + tan θ = 5, find sec θ - tan θ', steps: 'Reciprocal of 5 using sec²θ - tan²θ = 1', answer: '1/5' },
    ],
  },
  {
    topicId: 'percentages',
    title: 'Percentages',
    titleHi: 'प्रतिशत',
    shortDesc: 'Fraction equivalents, % change & successive change formulas',
    shortDescHi: 'भिन्न समतुल्य तालिका व क्रमिक प्रतिशत सूत्र',
    tagline: 'Fraction equivalents, percentage change, successive discounts, and reverse base calculations.',
    taglineHi: 'भिन्न समतुल्य तालिका, प्रतिशत वृद्धि/कमी और क्रमिक परिवर्तन सूत्र।',
    accentGradient: 'from-orange-500 to-amber-500',
    formulaAccent:
      'from-orange-50/90 to-amber-50/70 dark:from-orange-950/40 dark:to-amber-950/30 border-orange-200/80 dark:border-orange-900/70',
    sections: [
      {
        id: 'pc_table',
        title: '1. Fraction-to-Percentage Table',
        titleHi: '1. भिन्न से प्रतिशत तालिका',
        subtitle: 'Convert decimals and percentages instantly using standard fractions.',
        subtitleHi: 'मानक भिन्नों से प्रतिशत गणना तेज़ करें।',
        items: [
          { label: '1/2 · 1/3 · 1/4 · 1/5', value: '50% · 33.33% · 25% · 20%' },
          { label: '1/6 · 1/7 · 1/8 · 1/9', value: '16.67% · 14.28% · 12.5% · 11.11%' },
          { label: '1/11 · 1/12 · 3/8 · 5/8', value: '9.09% · 8.33% · 37.5% · 62.5%' },
        ],
      },
      {
        id: 'pc_tricks',
        title: '2. Shortcut Tricks',
        titleHi: '2. प्रतिशत शॉर्टकट नियम',
        subtitle: 'Symmetry and split rules for fast DI calculations.',
        subtitleHi: 'डीआई गणनाओं के लिए प्रतिशत विभाजन नियम।',
        items: [
          { label: 'Commutative Rule', value: 'x% of y = y% of x', note: '36% of 25 = 25% of 36 = 9' },
          { label: 'A exceeds B by x%', value: 'B less by [x / (100+x)]×100%', note: 'If +25%, reverse is -20%.' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_pc_1',
        title: 'Basic Percentage Formula',
        titleHi: 'मूल प्रतिशत सूत्र',
        formula: 'Percentage = (Value / Total Value) × 100',
        explanation: 'Expresses any part-to-whole ratio on a scale of 100.',
        explanationHi: 'किसी भाग को कुल मान के 100 के सापेक्ष दर्शाता है।',
        example: '180 out of 450 = (180 / 450) × 100 = 40%',
      },
      {
        id: 'f_pc_2',
        title: 'Percentage Increase & Decrease',
        titleHi: 'प्रतिशत वृद्धि व कमी',
        formula: '% Change = [(New - Old) / Old] × 100',
        explanation: 'Always divide by the original (initial) base value, never the new value.',
        explanationHi: 'हमेशा प्रारंभिक (मूल) मान से भाग दें।',
        example: '400 → 460: (60 / 400) × 100 = +15%',
      },
      {
        id: 'f_pc_3',
        title: 'Successive Percentage Change',
        titleHi: 'क्रमिक प्रतिशत परिवर्तन',
        formula: 'Net % = a + b + (a × b) / 100',
        explanation: 'Use positive sign for increase and negative sign for discount/decrease.',
        explanationHi: 'वृद्धि के लिए + और कमी/छूट के लिए - चिह्न का उपयोग करें।',
        example: '+20% then -10% → 20 - 10 + (20×-10)/100 = +8%',
      },
    ],
    practiceExamples: [
      { question: 'Find 16% of 25', steps: 'Swap: 25% of 16 = 1/4 × 16', answer: '4' },
      { question: '37.5% of 640', steps: '37.5% = 3/8 → (640 / 8) × 3 = 80 × 3', answer: '240' },
    ],
  },
  {
    topicId: 'fractions',
    title: 'Fractions',
    titleHi: 'भिन्न',
    shortDesc: 'Simplification, LCM ops, cross-comparison & decimals',
    shortDescHi: 'सरलीकरण, जोड़/घटाव, तुलना व दशमलव रूपांतरण',
    tagline: 'Simplification, LCM addition/subtraction, cross-multiplication comparison, and decimal conversion.',
    taglineHi: 'सरलीकरण, ल.स.प. जोड़/घटाव, तिरछा गुणा तुलना और दशमलव रूपांतरण।',
    accentGradient: 'from-rose-500 to-pink-600',
    formulaAccent:
      'from-rose-50/90 to-pink-50/70 dark:from-rose-950/40 dark:to-pink-950/30 border-rose-200/80 dark:border-rose-900/70',
    sections: [
      {
        id: 'fr_rules',
        title: '1. Basic Rules & Simplification',
        titleHi: '1. मूल नियम व सरलीकरण',
        subtitle: 'Divide numerator and denominator by their Greatest Common Divisor (GCD).',
        subtitleHi: 'अंश और हर को उनके म.स.प. (HCF) से भाग दें।',
        items: [
          { label: 'Simplification', value: '24/36 ÷ 12/12 = 2/3' },
          { label: 'Cross-Comparison', value: 'a/b > c/d  iff  a·d > b·c', note: '5/7 vs 7/9 → 45 < 49 → 7/9 is larger.' },
        ],
      },
      {
        id: 'fr_ops',
        title: '2. Multiplication, Division & Conversion',
        titleHi: '2. गुणा, भाग व रूपांतरण',
        subtitle: 'Keep-Change-Flip for division and powers of 2/5 for fast decimals.',
        subtitleHi: 'भाग के लिए व्युत्क्रम गुणा और दशमलव रूपांतरण।',
        items: [
          { label: 'Division', value: '(a/b) ÷ (c/d) = (a/b) × (d/c)' },
          { label: 'To Percentage', value: '(a/b) × 100%', note: '3/4 = 75%, 7/8 = 87.5%' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_fr_1',
        title: 'Fraction Addition & Subtraction',
        titleHi: 'भिन्न का जोड़ व घटाव',
        formula: '(a / b) ± (c / d) = (a·d ± b·c) / (b·d)',
        explanation: 'Butterfly / cross-multiply rule works instantly when denominators are coprime.',
        explanationHi: 'असहभाज्य हरों के लिए तिरछा गुणा विधि सबसे तेज़ है।',
        example: '2/3 + 3/4 = (8 + 9) / 12 = 17/12',
      },
      {
        id: 'f_fr_2',
        title: 'Fraction Multiplication',
        titleHi: 'भिन्न का गुणा',
        formula: '(a / b) × (c / d) = (a × c) / (b × d)',
        explanation: 'Cancel common diagonal factors before multiplying to keep numbers small.',
        explanationHi: 'गुणा करने से पहले उभयनिष्ठ गुणनखंड काट दें।',
        example: '3/5 × 10/9 = (1/1) × (2/3) = 2/3',
      },
    ],
    practiceExamples: [
      { question: 'Compare 4/5 and 7/9', steps: '4×9 = 36 vs 7×5 = 35 → 36 > 35', answer: '4/5 is larger' },
      { question: 'Convert 5/8 to decimal', steps: '1/8 = 0.125 → 5 × 0.125', answer: '0.625' },
    ],
  },
  {
    topicId: 'di_addition',
    title: 'DI Addition',
    titleHi: 'डीआई जोड़',
    shortDesc: 'Left-to-right grouping, complement 10s & decimal sum tricks',
    shortDescHi: 'बाएं से दाएं जोड़, 10 के जोड़े और दशमलव योग नियम',
    tagline: 'Master high-speed column and horizontal addition for Data Interpretation tables and charts.',
    taglineHi: 'डेटा इंटरप्रिटेशन तालिकाओं के लिए तेज़ स्तंभ और क्षैतिज जोड़ की विधियाँ।',
    accentGradient: 'from-emerald-600 to-teal-600',
    formulaAccent:
      'from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/30 border-emerald-200/80 dark:border-emerald-900/70',
    sections: [
      {
        id: 'di_techniques',
        title: '1. Fast DI Addition Methods',
        titleHi: '1. तेज़ डीआई जोड़ विधियाँ',
        subtitle: 'Avoid slow carry errors by grouping and scanning left-to-right.',
        subtitleHi: 'बाएं से दाएं और 10 के समूह बनाकर बिना त्रुटि जोड़ें।',
        items: [
          { label: 'Left-to-Right Place Grouping', value: 'Add 1000s → 100s → 10s → 1s', note: '460+380 = (400+300) + (60+80) = 700+140 = 840' },
          { label: 'Make 10 / Make 100 Pairs', value: '(23+77) + (46+54)', note: 'Scan columns for pairs summing to 10 or 100 first.' },
          { label: 'Round & Adjust', value: '398 + 497 = 400 + 500 - 5 = 895' },
        ],
      },
      {
        id: 'di_avg',
        title: '2. Assumed Mean Shortcut (DI Averages)',
        titleHi: '2. कल्पित माध्य शॉर्टकट',
        subtitle: 'Find averages of large DI columns without summing 4-digit totals.',
        subtitleHi: 'बड़ी संख्याओं को जोड़े बिना औसत निकालें।',
        items: [
          { label: 'Deviation Method', value: 'Avg = Base + (Sum of Deviations / N)', note: 'Pick round Base (e.g. 500) and sum + / - offsets.' },
        ],
      },
    ],
    formulas: [
      {
        id: 'f_di_1',
        title: 'Assumed Mean Formula',
        titleHi: 'कल्पित माध्य सूत्र',
        formula: 'Mean = A + (Σ(xᵢ - A)) / n',
        explanation: 'Subtract a clean base A from every number, average the small remainders, then add A.',
        explanationHi: 'प्रत्येक मान से आधार A घटाकर छोटे अंतरों का औसत निकालें।',
        example: 'Avg(412, 418, 406, 404) with A=410 → 410 + (2+8-4-6)/4 = 410',
      },
      {
        id: 'f_di_2',
        title: 'Percentage Share in DI',
        titleHi: 'डीआई प्रतिशत हिस्सा',
        formula: 'Share % = (Category Sum / Grand Total) × 100',
        explanation: 'Round denominator to nearest 2–3 significant digits for fast option matching.',
        explanationHi: 'विकल्प मिलान के लिए हर को 2-3 सार्थक अंकों तक सन्निकट करें।',
        example: '248 / 992 ≈ 250 / 1000 = 25%',
      },
    ],
    practiceExamples: [
      { question: 'Add 1482 + 2318 + 1595', steps: '(1482+2318) = 3800; 3800 + 1595', answer: '5395' },
      { question: 'Add 42.6 + 18.4 + 27.5', steps: '(42.6+18.4) = 61; 61 + 27.5', answer: '88.5' },
    ],
  },
];
