import type {
  Difficulty,
  GeneratorConfig,
  Question,
  QuestionType,
  SessionDifficulty,
  SessionLaunchConfig,
} from '../types/math';

function randInt(min: number, max: number): number {
  const lo = Math.ceil(Math.min(min, max));
  const hi = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function lcm(a: number, b: number): number {
  return Math.abs(a * b) / gcd(a, b);
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function numericOptions(correct: number, count = 4, step = 1): string[] {
  const set = new Set<string>([String(correct)]);
  const offsets = shuffle([
    -10 * step,
    -5 * step,
    -3 * step,
    -2 * step,
    -step,
    step,
    2 * step,
    3 * step,
    5 * step,
    10 * step,
    12 * step,
  ]);
  for (const off of offsets) {
    if (set.size >= count) break;
    const val = Number((correct + off).toFixed(4));
    if (val >= 0 || correct < 0) {
      set.add(String(val));
    }
  }
  let fallback = 1;
  while (set.size < count) {
    set.add(String(correct + fallback * step));
    fallback++;
  }
  return shuffle(Array.from(set));
}

function pickDifficulty(diff: SessionDifficulty): Difficulty {
  if (diff !== 'mixed') return diff;
  const r = Math.random();
  return r < 0.34 ? 'easy' : r < 0.67 ? 'medium' : 'hard';
}

function pickQuestionType(filter: QuestionType | 'all', supported: QuestionType[]): QuestionType {
  if (filter !== 'all' && supported.includes(filter)) return filter;
  if (filter !== 'all') return filter;
  return supported[randInt(0, supported.length - 1)];
}

function makeGenId(topicId: string, index: number): string {
  return `gen_${topicId}_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`;
}

// --- Topic Generators ---

function genSquares(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  cfg?: GeneratorConfig,
  customMin?: number,
  customMax?: number,
  sequential?: boolean
): Question {
  const defaultMin = diff === 'easy' ? 2 : diff === 'medium' ? 15 : 40;
  const defaultMax = diff === 'easy' ? 25 : diff === 'medium' ? 60 : 100;
  const min = customMin ?? cfg?.minNumber ?? defaultMin;
  const max = customMax ?? cfg?.maxNumber ?? defaultMax;
  const n = sequential ? Math.min(max, min + idx) : randInt(min, max);
  const sq = n * n;

  if (qType === 'identify_incorrect') {
    const bases = shuffle([n, Math.max(min, n - 2), Math.min(max, n + 3), Math.min(max, n + 5)]);
    const wrongBase = bases[0];
    const wrongVal = wrongBase * wrongBase + (Math.random() < 0.5 ? 10 : -10);
    const wrongStr = `${wrongBase}² = ${wrongVal}`;
    const opts = shuffle([
      wrongStr,
      `${bases[1]}² = ${bases[1] * bases[1]}`,
      `${bases[2]}² = ${bases[2] * bases[2]}`,
      `${bases[3]}² = ${bases[3] * bases[3]}`,
    ]);
    return {
      id: makeGenId('squares', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'squares',
      questionText: 'Identify the incorrect square statement:',
      questionTextHi: 'गलत वर्ग कथन पहचानें:',
      questionType: 'identify_incorrect',
      difficulty: diff,
      correctAnswer: wrongStr,
      options: opts,
      explanation: `${wrongBase}² is ${wrongBase * wrongBase}, not ${wrongVal}.`,
      explanationHi: `${wrongBase}² का सही मान ${wrongBase * wrongBase} है, ${wrongVal} नहीं।`,
      marks: 1,
      timeRecommendationSec: 20,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  if (qType === 'true_false') {
    const isTrue = Math.random() < 0.5;
    const shown = isTrue ? sq : sq + (Math.random() < 0.5 ? 12 : -8);
    return {
      id: makeGenId('squares', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'squares',
      questionText: `True or False: ${n}² = ${shown}`,
      questionTextHi: `सत्य या असत्य: ${n}² = ${shown}`,
      questionType: 'true_false',
      difficulty: diff,
      correctAnswer: isTrue ? 'True' : 'False',
      options: ['True', 'False'],
      explanation: `${n} × ${n} = ${sq}.`,
      explanationHi: `${n} × ${n} = ${sq}।`,
      marks: 1,
      timeRecommendationSec: 12,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  if (qType === 'missing_number' || qType === 'reverse') {
    const prompt = qType === 'reverse' ? `√${sq} = ?` : `?² = ${sq}`;
    return {
      id: makeGenId('squares', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'squares',
      questionText: prompt,
      questionTextHi: prompt,
      questionType: qType,
      difficulty: diff,
      correctAnswer: String(n),
      options: numericOptions(n, 4, 1),
      explanation: `${n} × ${n} = ${sq}.`,
      explanationHi: `${n} × ${n} = ${sq}।`,
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  const effectiveType: QuestionType = qType === 'fill_blank' ? 'fill_blank' : qType === 'mcq' ? 'mcq' : 'direct';
  return {
    id: makeGenId('squares', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'squares',
    questionText: effectiveType === 'fill_blank' ? `${n}² = ____` : `${n}² = ?`,
    questionTextHi: effectiveType === 'fill_blank' ? `${n}² = ____` : `${n}² = ?`,
    questionType: effectiveType,
    difficulty: diff,
    correctAnswer: String(sq),
    options: numericOptions(sq, 4, n > 30 ? 10 : 2),
    explanation: `${n} × ${n} = ${sq}.`,
    explanationHi: `${n} × ${n} = ${sq}।`,
    marks: 1,
    timeRecommendationSec: 15,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genCubes(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  cfg?: GeneratorConfig,
  customMin?: number,
  customMax?: number,
  sequential?: boolean
): Question {
  const defaultMin = diff === 'easy' ? 2 : diff === 'medium' ? 8 : 15;
  const defaultMax = diff === 'easy' ? 12 : diff === 'medium' ? 22 : 30;
  const min = customMin ?? cfg?.minNumber ?? defaultMin;
  const max = customMax ?? cfg?.maxNumber ?? defaultMax;
  const n = sequential ? Math.min(max, min + idx) : randInt(min, max);
  const cb = n * n * n;

  if (qType === 'missing_number' || qType === 'reverse') {
    const prompt = qType === 'reverse' ? `∛${cb} = ?` : `?³ = ${cb}`;
    return {
      id: makeGenId('cubes', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'cubes',
      questionText: prompt,
      questionTextHi: prompt,
      questionType: qType,
      difficulty: diff,
      correctAnswer: String(n),
      options: numericOptions(n, 4, 1),
      explanation: `${n} × ${n} × ${n} = ${cb}.`,
      explanationHi: `${n} × ${n} × ${n} = ${cb}।`,
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  if (qType === 'true_false') {
    const isTrue = Math.random() < 0.5;
    const shown = isTrue ? cb : cb + (Math.random() < 0.5 ? 100 : -100);
    return {
      id: makeGenId('cubes', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'cubes',
      questionText: `True or False: ${n}³ = ${shown}`,
      questionTextHi: `सत्य या असत्य: ${n}³ = ${shown}`,
      questionType: 'true_false',
      difficulty: diff,
      correctAnswer: isTrue ? 'True' : 'False',
      options: ['True', 'False'],
      explanation: `${n}³ = ${cb}.`,
      explanationHi: `${n}³ = ${cb}।`,
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  return {
    id: makeGenId('cubes', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'cubes',
    questionText: `${n}³ = ?`,
    questionTextHi: `${n}³ = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(cb),
    options: numericOptions(cb, 4, 100),
    explanation: `${n} × ${n} = ${n * n}; ${n * n} × ${n} = ${cb}.`,
    explanationHi: `${n} × ${n} × ${n} = ${cb}।`,
    marks: 1,
    timeRecommendationSec: 18,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genSquareRoots(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  customMin?: number,
  customMax?: number,
  sequential?: boolean
): Question {
  const min = customMin ?? (diff === 'easy' ? 4 : diff === 'medium' ? 16 : 35);
  const max = customMax ?? (diff === 'easy' ? 25 : diff === 'medium' ? 50 : 95);
  const n = sequential ? Math.min(max, min + idx) : randInt(min, max);
  const sq = n * n;

  if (qType === 'reverse' || qType === 'missing_number') {
    return {
      id: makeGenId('square_roots', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'square_roots',
      questionText: `√? = ${n}`,
      questionTextHi: `√? = ${n}`,
      questionType: qType,
      difficulty: diff,
      correctAnswer: String(sq),
      options: numericOptions(sq, 4, 10),
      explanation: `Squaring both sides gives ${n}² = ${sq}.`,
      explanationHi: `दोनों पक्षों का वर्ग करने पर ${n}² = ${sq}।`,
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  if (diff !== 'easy' && Math.random() < 0.35 && qType !== 'true_false') {
    const m = randInt(min, Math.min(max, min + 25));
    const sum = n + m;
    return {
      id: makeGenId('square_roots', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'square_roots',
      questionText: `Simplify: √${sq} + √${m * m} = ?`,
      questionTextHi: `सरल करें: √${sq} + √${m * m} = ?`,
      questionType: qType === 'mcq' ? 'mcq' : 'direct',
      difficulty: diff,
      correctAnswer: String(sum),
      options: numericOptions(sum, 4, 2),
      explanation: `√${sq} = ${n} and √${m * m} = ${m}. Sum = ${n} + ${m} = ${sum}.`,
      explanationHi: `${n} + ${m} = ${sum}।`,
      marks: 1,
      timeRecommendationSec: 20,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  return {
    id: makeGenId('square_roots', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'square_roots',
    questionText: `√${sq} = ?`,
    questionTextHi: `√${sq} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(n),
    options: numericOptions(n, 4, 2),
    explanation: `${n}² = ${sq}, so √${sq} = ${n}.`,
    explanationHi: `${n}² = ${sq}, अतः √${sq} = ${n}।`,
    marks: 1,
    timeRecommendationSec: 15,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genCubeRoots(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  customMin?: number,
  customMax?: number,
  sequential?: boolean
): Question {
  const min = customMin ?? (diff === 'easy' ? 2 : diff === 'medium' ? 8 : 16);
  const max = customMax ?? (diff === 'easy' ? 12 : diff === 'medium' ? 22 : 35);
  const n = sequential ? Math.min(max, min + idx) : randInt(min, max);
  const cb = n * n * n;

  if (qType === 'reverse' || qType === 'missing_number') {
    return {
      id: makeGenId('cube_roots', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'cube_roots',
      questionText: `∛? = ${n}`,
      questionTextHi: `∛? = ${n}`,
      questionType: qType,
      difficulty: diff,
      correctAnswer: String(cb),
      options: numericOptions(cb, 4, 100),
      explanation: `${n}³ = ${cb}.`,
      explanationHi: `${n}³ = ${cb}।`,
      marks: 1,
      timeRecommendationSec: 18,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  return {
    id: makeGenId('cube_roots', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'cube_roots',
    questionText: `∛${cb} = ?`,
    questionTextHi: `∛${cb} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(n),
    options: numericOptions(n, 4, 1),
    explanation: `${n}³ = ${cb}, hence ∛${cb} = ${n}.`,
    explanationHi: `${n}³ = ${cb}, अतः ∛${cb} = ${n}।`,
    marks: 1,
    timeRecommendationSec: 18,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genTables(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  cfg?: GeneratorConfig,
  customMin?: number,
  customMax?: number,
  selectedTables?: number[],
  sequential?: boolean
): Question {
  const minT = customMin ?? cfg?.minNumber ?? (diff === 'easy' ? 2 : diff === 'medium' ? 12 : 21);
  const maxT = customMax ?? cfg?.maxNumber ?? (diff === 'easy' ? 15 : diff === 'medium' ? 35 : 99);
  const tableNum =
    selectedTables && selectedTables.length > 0
      ? selectedTables[idx % selectedTables.length]
      : randInt(minT, maxT);
  const multiplier = sequential ? (idx % 10) + 1 : randInt(2, diff === 'hard' ? 19 : 12);
  const product = tableNum * multiplier;

  if (qType === 'missing_number') {
    return {
      id: makeGenId('tables', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'tables',
      questionText: `? × ${multiplier} = ${product}`,
      questionTextHi: `? × ${multiplier} = ${product}`,
      questionType: 'missing_number',
      difficulty: diff,
      correctAnswer: String(tableNum),
      options: numericOptions(tableNum, 4, 1),
      explanation: `${product} ÷ ${multiplier} = ${tableNum}.`,
      explanationHi: `${product} ÷ ${multiplier} = ${tableNum}।`,
      marks: 1,
      timeRecommendationSec: 12,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  if (qType === 'reverse') {
    return {
      id: makeGenId('tables', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'tables',
      questionText: `${product} ÷ ${tableNum} = ?`,
      questionTextHi: `${product} ÷ ${tableNum} = ?`,
      questionType: 'reverse',
      difficulty: diff,
      correctAnswer: String(multiplier),
      options: numericOptions(multiplier, 4, 1),
      explanation: `${tableNum} × ${multiplier} = ${product}.`,
      explanationHi: `${tableNum} × ${multiplier} = ${product}।`,
      marks: 1,
      timeRecommendationSec: 10,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  return {
    id: makeGenId('tables', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'tables',
    questionText: `${tableNum} × ${multiplier} = ?`,
    questionTextHi: `${tableNum} × ${multiplier} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(product),
    options: numericOptions(product, 4, tableNum > 20 ? 10 : 2),
    explanation: `${tableNum} × ${multiplier} = ${product}.`,
    explanationHi: `${tableNum} × ${multiplier} = ${product}।`,
    marks: 1,
    timeRecommendationSec: 10,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

const TRIG_TABLE: Record<string, Record<number, string>> = {
  sin: { 0: '0', 30: '1/2', 45: '1/√2', 60: '√3/2', 90: '1' },
  cos: { 0: '1', 30: '√3/2', 45: '1/√2', 60: '1/2', 90: '0' },
  tan: { 0: '0', 30: '1/√3', 45: '1', 60: '√3', 90: 'Undefined' },
  cot: { 0: 'Undefined', 30: '√3', 45: '1', 60: '1/√3', 90: '0' },
  sec: { 0: '1', 30: '2/√3', 45: '√2', 60: '2', 90: 'Undefined' },
  cosec: { 0: 'Undefined', 30: '2', 45: '√2', 60: '2/√3', 90: '1' },
};

const TRIG_ALL_VALUES = ['0', '1', '1/2', '1/√2', '√3/2', '1/√3', '√3', '2', '2/√3', '√2', 'Undefined'];

function genTrigonometry(idx: number, diff: Difficulty, qType: QuestionType, trigFocus?: 'all' | 'values'): Question {
  const fns = diff === 'easy' ? ['sin', 'cos', 'tan'] : ['sin', 'cos', 'tan', 'cot', 'sec', 'cosec'];
  const angles = [0, 30, 45, 60, 90];

  if (trigFocus !== 'values' && diff === 'hard' && Math.random() < 0.35 && qType !== 'fill_blank') {
    const angle = [30, 45, 60][randInt(0, 2)];
    const identities = [
      {
        text: `sin² ${angle}° + cos² ${angle}° = ?`,
        ans: '1',
        exp: 'Pythagorean identity: sin²θ + cos²θ = 1 for all θ.',
        expHi: 'पाइथागोरस सर्वसमिका sin²θ + cos²θ = 1।',
      },
      {
        text: `sec² ${angle}° - tan² ${angle}° = ?`,
        ans: '1',
        exp: 'Pythagorean identity: 1 + tan²θ = sec²θ => sec²θ - tan²θ = 1.',
        expHi: 'सर्वसमिका sec²θ - tan²θ = 1।',
      },
      {
        text: `cosec² ${angle}° - cot² ${angle}° = ?`,
        ans: '1',
        exp: 'Pythagorean identity: 1 + cot²θ = cosec²θ => cosec²θ - cot²θ = 1.',
        expHi: 'सर्वसमिका cosec²θ - cot²θ = 1।',
      },
      {
        text: `sin ${angle}° × cosec ${angle}° = ?`,
        ans: '1',
        exp: 'Reciprocal identity: sin θ × cosec θ = 1.',
        expHi: 'व्युत्क्रम सर्वसमिका: sin θ × cosec θ = 1।',
      },
    ];
    const item = identities[randInt(0, identities.length - 1)];
    return {
      id: makeGenId('trigonometry', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'trigonometry',
      questionText: item.text,
      questionTextHi: item.text,
      questionType: 'mcq',
      difficulty: diff,
      correctAnswer: item.ans,
      options: ['0', '1/2', '1', '2'],
      explanation: item.exp,
      explanationHi: item.expHi,
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  const fn = fns[randInt(0, fns.length - 1)];
  const angle = angles[randInt(0, angles.length - 1)];
  const ans = TRIG_TABLE[fn][angle];
  const distractors = shuffle(TRIG_ALL_VALUES.filter((v) => v !== ans)).slice(0, 3);
  const opts = shuffle([ans, ...distractors]);

  return {
    id: makeGenId('trigonometry', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'trigonometry',
    questionText: `${fn} ${angle}° = ?`,
    questionTextHi: `${fn} ${angle}° = ?`,
    questionType: qType === 'direct' ? 'direct' : 'mcq',
    difficulty: diff,
    correctAnswer: ans,
    options: opts,
    explanation: `From standard trigonometric values, ${fn} ${angle}° = ${ans}.`,
    explanationHi: `मानक त्रिकोणमितीय सारणी से ${fn} ${angle}° = ${ans}।`,
    marks: 1,
    timeRecommendationSec: 12,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genPercentages(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  cfg?: GeneratorConfig,
  percentageType: 'all' | 'basic' | 'reverse' | 'successive' = 'all'
): Question {
  const minBase = cfg?.minNumber ?? 40;
  const maxBase = cfg?.maxNumber ?? 2000;
  const pctChoices = diff === 'easy' ? [10, 20, 25, 50, 75] : diff === 'medium' ? [12, 15, 30, 35, 40, 45, 60] : [12.5, 16, 22, 37.5, 65, 85];
  const pct = pctChoices[randInt(0, pctChoices.length - 1)];

  const isSuccessive =
    percentageType === 'successive' || (percentageType === 'all' && diff === 'hard' && Math.random() < 0.35);

  if (isSuccessive) {
    const a = [10, 15, 20, 25, 30][randInt(0, 4)];
    const b = [-10, -20, 10, 20][randInt(0, 3)];
    const net = Number((a + b + (a * b) / 100).toFixed(2));
    return {
      id: makeGenId('percentages', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'percentages',
      questionText: `Successive percentage change of +${a}% followed by ${b >= 0 ? `+${b}` : b}% gives net change (%):`,
      questionTextHi: `+${a}% और फिर ${b >= 0 ? `+${b}` : b}% के क्रमिक परिवर्तन का शुद्ध प्रतिशत बदलाव:`,
      questionType: qType === 'mcq' ? 'mcq' : 'direct',
      difficulty: diff,
      correctAnswer: `${net}%`,
      options: shuffle([`${net}%`, `${a + b}%`, `${net + 2}%`, `${net - 2}%`]),
      explanation: `Formula: a + b + (ab/100) = ${a} + (${b}) + (${a * b}/100) = ${net}%.`,
      explanationHi: `सूत्र a + b + ab/100 से शुद्ध परिवर्तन ${net}%।`,
      marks: 1,
      timeRecommendationSec: 22,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  if (percentageType === 'reverse' || (percentageType === 'all' && qType === 'reverse')) {
    const x = randInt(2, 25) * 40;
    const part = Number(((pct * x) / 100).toFixed(2));
    return {
      id: makeGenId('percentages', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'percentages',
      questionText: `If ${pct}% of x = ${part}, find x:`,
      questionTextHi: `यदि x का ${pct}% = ${part}, तो x ज्ञात करें:`,
      questionType: 'reverse',
      difficulty: diff,
      correctAnswer: String(x),
      options: numericOptions(x, 4, 20),
      explanation: `x = (${part} × 100) / ${pct} = ${x}.`,
      explanationHi: `x = (${part} × 100) / ${pct} = ${x}।`,
      marks: 1,
      timeRecommendationSec: 18,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  const base = Math.min(maxBase, Math.max(minBase, randInt(2, 40) * 20));
  const val = Number(((pct * base) / 100).toFixed(2));
  return {
    id: makeGenId('percentages', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'percentages',
    questionText: `${pct}% of ${base} = ?`,
    questionTextHi: `${base} का ${pct}% = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(val),
    options: numericOptions(val, 4, 5),
    explanation: `(${pct} / 100) × ${base} = ${val}.`,
    explanationHi: `(${pct} / 100) × ${base} = ${val}।`,
    marks: 1,
    timeRecommendationSec: 15,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genFractions(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  cfg?: GeneratorConfig,
  fractionOp: 'all' | 'addition' | 'multiplication' | 'comparison' | 'to_percent' = 'all'
): Question {
  const nMax = cfg?.numeratorMax ?? (diff === 'easy' ? 7 : 12);
  const dMin = cfg?.denominatorMin ?? 2;
  const dMax = cfg?.denominatorMax ?? (diff === 'easy' ? 8 : 14);

  const d1 = randInt(dMin, dMax);
  const d2 = randInt(dMin, dMax);
  const n1 = randInt(1, Math.min(nMax, d1 - 1));
  const n2 = randInt(1, Math.min(nMax, d2 - 1));

  const mode =
    fractionOp === 'addition'
      ? 0
      : fractionOp === 'multiplication'
        ? 1
        : fractionOp === 'comparison'
          ? 2
          : fractionOp === 'to_percent'
            ? 3
            : randInt(0, 3);
  if (mode === 0) {
    const common = lcm(d1, d2);
    const num = n1 * (common / d1) + n2 * (common / d2);
    const g = gcd(num, common);
    const ans = common / g === 1 ? `${num / g}` : `${num / g}/${common / g}`;
    return {
      id: makeGenId('fractions', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'fractions',
      questionText: `${n1}/${d1} + ${n2}/${d2} = ? (simplified)`,
      questionTextHi: `${n1}/${d1} + ${n2}/${d2} = ? (सरलतम रूप)`,
      questionType: qType === 'mcq' ? 'mcq' : 'direct',
      difficulty: diff,
      correctAnswer: ans,
      options: shuffle([ans, `${num / g + 1}/${common / g}`, `${Math.max(1, num / g - 1)}/${common / g}`, `${n1 + n2}/${d1 + d2}`]),
      explanation: `LCM(${d1}, ${d2}) = ${common}. (${n1 * (common / d1)} + ${n2 * (common / d2)})/${common} = ${num}/${common} = ${ans}.`,
      explanationHi: `ल.स.प. ${common} लेकर जोड़ने और सरल करने पर ${ans}।`,
      marks: 1,
      timeRecommendationSec: 20,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }
  if (mode === 1) {
    const num = n1 * n2;
    const den = d1 * d2;
    const g = gcd(num, den);
    const ans = `${num / g}/${den / g}`;
    return {
      id: makeGenId('fractions', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'fractions',
      questionText: `${n1}/${d1} × ${n2}/${d2} = ?`,
      questionTextHi: `${n1}/${d1} × ${n2}/${d2} = ?`,
      questionType: qType === 'mcq' ? 'mcq' : 'direct',
      difficulty: diff,
      correctAnswer: ans,
      options: shuffle([ans, `${num / g + 1}/${den / g}`, `${n1 + n2}/${d1 * d2}`, `${d1}/${n1}`]),
      explanation: `(${n1}×${n2})/(${d1}×${d2}) = ${num}/${den} = ${ans}.`,
      explanationHi: `अंश व हर का गुणा और सरलीकरण करने पर ${ans}।`,
      marks: 1,
      timeRecommendationSec: 18,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }
  if (mode === 2) {
    const f1 = `${n1}/${d1}`;
    const f2 = `${n2}/${d2}`;
    if (n1 * d2 === n2 * d1) {
      return genFractions(idx + 1, diff, qType, cfg, fractionOp);
    }
    const larger = n1 * d2 > n2 * d1 ? f1 : f2;
    return {
      id: makeGenId('fractions', idx),
      categoryId: 'cat_quick_recall',
      topicId: 'fractions',
      questionText: `Which fraction is greater: ${f1} or ${f2}?`,
      questionTextHi: `कौन सी भिन्न बड़ी है: ${f1} या ${f2}?`,
      questionType: 'mcq',
      difficulty: diff,
      correctAnswer: larger,
      options: [f1, f2, 'Both are equal'],
      explanation: `Cross-multiply: ${n1}×${d2} = ${n1 * d2} vs ${n2}×${d1} = ${n2 * d1}. So ${larger} is larger.`,
      explanationHi: `तिरछा गुणा करने पर ${larger} बड़ी भिन्न है।`,
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  // Fraction to percentage (using clean denominators)
  const cleanDenoms = [2, 4, 5, 8, 10, 20, 25];
  const d = cleanDenoms[randInt(0, cleanDenoms.length - 1)];
  const n = randInt(1, d - 1);
  const pct = Number(((n / d) * 100).toFixed(2));
  return {
    id: makeGenId('fractions', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'fractions',
    questionText: `Convert ${n}/${d} to percentage:`,
    questionTextHi: `${n}/${d} को प्रतिशत में बदलें:`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: `${pct}%`,
    options: shuffle([`${pct}%`, `${pct + 5}%`, `${Math.max(1, pct - 5)}%`, `${pct + 10}%`]),
    explanation: `(${n}/${d}) × 100 = ${pct}%.`,
    explanationHi: `(${n}/${d}) × 100 = ${pct}%।`,
    marks: 1,
    timeRecommendationSec: 15,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genDIAddition(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  cfg?: GeneratorConfig,
  customTerms?: number,
  customDigits?: number
): Question {
  const terms = customTerms ?? cfg?.termCount ?? (diff === 'easy' ? 2 : diff === 'medium' ? 3 : 4);
  const digits = customDigits ?? cfg?.digitLength ?? (diff === 'easy' ? 3 : diff === 'medium' ? 4 : 4);
  const minVal = Math.pow(10, Math.max(1, digits - 1));
  const maxVal = Math.pow(10, digits) - 1;
  const useDecimal = diff === 'hard' && Math.random() < 0.4;

  const numbers: number[] = [];
  for (let i = 0; i < terms; i++) {
    const raw = randInt(minVal, maxVal);
    numbers.push(useDecimal ? Number((raw / 10).toFixed(1)) : raw);
  }
  const total = Number(numbers.reduce((acc, v) => acc + v, 0).toFixed(2));
  const strTerms = numbers.map((v) => String(v));

  return {
    id: makeGenId('di_addition', idx),
    categoryId: 'cat_quick_recall',
    topicId: 'di_addition',
    questionText: `${strTerms.join(' + ')} = ?`,
    questionTextHi: `${strTerms.join(' + ')} = ?`,
    columnTerms: strTerms,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(total),
    options: numericOptions(total, 4, useDecimal ? 1.5 : 10),
    explanation: `Column sum of ${strTerms.join(', ')} = ${total}.`,
    explanationHi: `सभी संख्याओं का स्तंभ योग = ${total}।`,
    marks: 1,
    timeRecommendationSec: 22,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genAddition(idx: number, diff: Difficulty, qType: QuestionType, customDigits?: number): Question {
  const digits = customDigits ?? (diff === 'easy' ? 2 : diff === 'medium' ? 3 : 4);
  const lo = Math.pow(10, Math.max(1, digits - 1));
  const hi = Math.pow(10, digits) - 1;
  const a = randInt(lo, hi);
  const b = randInt(lo, hi);
  const sum = a + b;

  if (qType === 'missing_number') {
    return {
      id: makeGenId('addition', idx),
      categoryId: 'cat_basics',
      topicId: 'addition',
      questionText: `${a} + ? = ${sum}`,
      questionTextHi: `${a} + ? = ${sum}`,
      questionType: 'missing_number',
      difficulty: diff,
      correctAnswer: String(b),
      options: numericOptions(b, 4, 10),
      explanation: `${sum} - ${a} = ${b}.`,
      explanationHi: `${sum} - ${a} = ${b}।`,
      marks: 1,
      timeRecommendationSec: 12,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  return {
    id: makeGenId('addition', idx),
    categoryId: 'cat_basics',
    topicId: 'addition',
    questionText: `${a} + ${b} = ?`,
    questionTextHi: `${a} + ${b} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(sum),
    options: numericOptions(sum, 4, 10),
    explanation: `${a} + ${b} = ${sum}.`,
    explanationHi: `${a} + ${b} = ${sum}।`,
    marks: 1,
    timeRecommendationSec: 12,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genSubtraction(idx: number, diff: Difficulty, qType: QuestionType, customDigits?: number): Question {
  const digits = customDigits ?? (diff === 'easy' ? 2 : diff === 'medium' ? 3 : 4);
  const lo = Math.pow(10, Math.max(1, digits - 1));
  const hi = Math.pow(10, digits) - 1;
  const x = randInt(lo, hi);
  const y = randInt(lo, hi);
  const a = Math.max(x, y);
  const b = Math.min(x, y);
  const res = a - b;

  if (qType === 'missing_number') {
    return {
      id: makeGenId('subtraction', idx),
      categoryId: 'cat_basics',
      topicId: 'subtraction',
      questionText: `${a} - ? = ${res}`,
      questionTextHi: `${a} - ? = ${res}`,
      questionType: 'missing_number',
      difficulty: diff,
      correctAnswer: String(b),
      options: numericOptions(b, 4, 10),
      explanation: `${a} - ${res} = ${b}.`,
      explanationHi: `${a} - ${res} = ${b}।`,
      marks: 1,
      timeRecommendationSec: 14,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  return {
    id: makeGenId('subtraction', idx),
    categoryId: 'cat_basics',
    topicId: 'subtraction',
    questionText: `${a} - ${b} = ?`,
    questionTextHi: `${a} - ${b} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(res),
    options: numericOptions(res, 4, 10),
    explanation: `${a} - ${b} = ${res}.`,
    explanationHi: `${a} - ${b} = ${res}।`,
    marks: 1,
    timeRecommendationSec: 14,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genMultiplication(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  focus: 'all' | 'shortcuts' | 'tables' = 'all',
  customMin?: number,
  customMax?: number,
  selectedTables?: number[],
  sequential?: boolean
): Question {
  if (focus === 'tables') {
    return genTables(idx, diff, qType, undefined, customMin ?? 2, customMax ?? 20, selectedTables, sequential);
  }
  const shortcuts = [11, 12, 25, 50, 100];
  const useShortcut = focus === 'shortcuts' || Math.random() < 0.45;
  const a = diff === 'easy' ? randInt(12, 45) : diff === 'medium' ? randInt(24, 98) : randInt(104, 348);
  const b = useShortcut
    ? shortcuts[randInt(0, shortcuts.length - 1)]
    : diff === 'easy'
      ? randInt(3, 9)
      : diff === 'medium'
        ? randInt(11, 29)
        : randInt(15, 75);
  const prod = a * b;

  return {
    id: makeGenId('multiplication', idx),
    categoryId: 'cat_basics',
    topicId: 'multiplication',
    questionText: `${a} × ${b} = ?`,
    questionTextHi: `${a} × ${b} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(prod),
    options: numericOptions(prod, 4, 10),
    explanation:
      b === 25
        ? `Shortcut ×25: (${a} × 100) ÷ 4 = ${prod}.`
        : b === 50
          ? `Shortcut ×50: (${a} × 100) ÷ 2 = ${prod}.`
          : `${a} × ${b} = ${prod}.`,
    explanationHi: `${a} × ${b} = ${prod}।`,
    marks: 1,
    timeRecommendationSec: 15,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genDivision(
  idx: number,
  diff: Difficulty,
  qType: QuestionType,
  divisionMode: 'mixed' | 'exact' | 'remainder' = 'mixed'
): Question {
  const divisor = diff === 'easy' ? randInt(3, 12) : diff === 'medium' ? randInt(8, 24) : randInt(12, 36);
  const quotient = diff === 'easy' ? randInt(6, 25) : diff === 'medium' ? randInt(12, 48) : randInt(25, 95);
  const withRem =
    divisionMode === 'remainder'
      ? true
      : divisionMode === 'exact'
        ? false
        : diff !== 'easy' && Math.random() < 0.25 && qType !== 'missing_number';
  const rem = withRem ? randInt(1, divisor - 1) : 0;
  const dividend = divisor * quotient + rem;

  if (withRem) {
    const ans = `${quotient} R ${rem}`;
    return {
      id: makeGenId('division', idx),
      categoryId: 'cat_basics',
      topicId: 'division',
      questionText: `Find quotient and remainder: ${dividend} ÷ ${divisor} (format: Q R rem)`,
      questionTextHi: `भागफल और शेषफल ज्ञात करें: ${dividend} ÷ ${divisor} (प्रारूप: Q R rem)`,
      questionType: 'direct',
      difficulty: diff,
      correctAnswer: ans,
      options: shuffle([ans, `${quotient} R ${Math.max(1, (rem + 1) % divisor)}`, `${quotient - 1} R ${rem}`, `${quotient + 1} R ${rem}`]),
      explanation: `${divisor} × ${quotient} = ${divisor * quotient}; remainder = ${dividend} - ${divisor * quotient} = ${rem}.`,
      explanationHi: `${divisor} × ${quotient} = ${divisor * quotient}, शेषफल = ${rem}।`,
      marks: 1,
      timeRecommendationSec: 18,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  if (qType === 'missing_number') {
    return {
      id: makeGenId('division', idx),
      categoryId: 'cat_basics',
      topicId: 'division',
      questionText: `${dividend} ÷ ? = ${quotient}`,
      questionTextHi: `${dividend} ÷ ? = ${quotient}`,
      questionType: 'missing_number',
      difficulty: diff,
      correctAnswer: String(divisor),
      options: numericOptions(divisor, 4, 1),
      explanation: `${dividend} ÷ ${quotient} = ${divisor}.`,
      explanationHi: `${dividend} ÷ ${quotient} = ${divisor}।`,
      marks: 1,
      timeRecommendationSec: 15,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  return {
    id: makeGenId('division', idx),
    categoryId: 'cat_basics',
    topicId: 'division',
    questionText: `${dividend} ÷ ${divisor} = ?`,
    questionTextHi: `${dividend} ÷ ${divisor} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(quotient),
    options: numericOptions(quotient, 4, 1),
    explanation: `${divisor} × ${quotient} = ${dividend}.`,
    explanationHi: `${dividend} ÷ ${divisor} = ${quotient}।`,
    marks: 1,
    timeRecommendationSec: 15,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

function genMixedArithmetic(idx: number, diff: Difficulty, qType: QuestionType): Question {
  const b = randInt(2, diff === 'easy' ? 9 : 16);
  const c = randInt(2, diff === 'easy' ? 8 : 14);
  const dividend = b * c;
  const a = randInt(5, diff === 'hard' ? 65 : 30);
  const d = randInt(2, 9);

  if (diff === 'easy') {
    const ans = a + c * d;
    return {
      id: makeGenId('mixed_arithmetic', idx),
      categoryId: 'cat_basics',
      topicId: 'mixed_arithmetic',
      questionText: `${a} + ${dividend} ÷ ${b} × ${d} = ?`,
      questionTextHi: `${a} + ${dividend} ÷ ${b} × ${d} = ?`,
      questionType: qType === 'mcq' ? 'mcq' : 'direct',
      difficulty: diff,
      correctAnswer: String(ans),
      options: numericOptions(ans, 4, 2),
      explanation: `BODMAS: ${dividend} ÷ ${b} = ${c}; ${c} × ${d} = ${c * d}; ${a} + ${c * d} = ${ans}.`,
      explanationHi: `BODMAS से पहले भाग, फिर गुणा और अंत में जोड़ = ${ans}।`,
      marks: 1,
      timeRecommendationSec: 18,
      active: true,
      contentVersion: 1,
      createdBy: 'dynamic_engine',
      source: 'generated',
    };
  }

  const e = randInt(3, 18);
  const ans = a + c * d - e;
  return {
    id: makeGenId('mixed_arithmetic', idx),
    categoryId: 'cat_basics',
    topicId: 'mixed_arithmetic',
    questionText: `(${a} - ${e}) + ${dividend} ÷ ${b} × ${d} = ?`,
    questionTextHi: `(${a} - ${e}) + ${dividend} ÷ ${b} × ${d} = ?`,
    questionType: qType === 'mcq' ? 'mcq' : 'direct',
    difficulty: diff,
    correctAnswer: String(ans),
    options: numericOptions(ans, 4, 3),
    explanation: `Brackets: (${a}-${e}) = ${a - e}. Division: ${dividend}÷${b} = ${c}. Multiply: ${c}×${d} = ${c * d}. Total = ${ans}.`,
    explanationHi: `कोष्ठक, भाग, गुणा और जोड़ क्रम से हल करने पर ${ans}।`,
    marks: 1,
    timeRecommendationSec: 22,
    active: true,
    contentVersion: 1,
    createdBy: 'dynamic_engine',
    source: 'generated',
  };
}

export function generateQuestionForTopic(
  topicId: string,
  idx: number,
  config: SessionLaunchConfig,
  generatorConfigs: GeneratorConfig[]
): Question {
  const diff = pickDifficulty(config.difficulty);
  const cfg = generatorConfigs.find((c) => c.topicKey === topicId || c.id === `cfg_${topicId}`);
  const seq = config.orderMode === 'sequential';

  const supportedTypes: Record<string, QuestionType[]> = {
    squares: ['direct', 'mcq', 'missing_number', 'reverse', 'true_false', 'identify_incorrect', 'fill_blank'],
    cubes: ['direct', 'mcq', 'missing_number', 'reverse', 'true_false'],
    square_roots: ['direct', 'mcq', 'reverse', 'missing_number'],
    cube_roots: ['direct', 'mcq', 'reverse', 'missing_number'],
    tables: ['direct', 'mcq', 'missing_number', 'reverse'],
    trigonometry: ['mcq', 'direct'],
    percentages: ['direct', 'mcq', 'reverse'],
    fractions: ['direct', 'mcq'],
    di_addition: ['direct', 'mcq'],
    addition: ['direct', 'mcq', 'missing_number'],
    subtraction: ['direct', 'mcq', 'missing_number'],
    multiplication: ['direct', 'mcq'],
    division: ['direct', 'mcq', 'missing_number'],
    mixed_arithmetic: ['direct', 'mcq'],
  };

  const qType = pickQuestionType(config.questionTypeFilter, supportedTypes[topicId] ?? ['direct', 'mcq']);

  switch (topicId) {
    case 'squares':
      return genSquares(idx, diff, qType, cfg, config.customMin, config.customMax, seq);
    case 'cubes':
      return genCubes(idx, diff, qType, cfg, config.customMin, config.customMax, seq);
    case 'square_roots':
      return genSquareRoots(idx, diff, qType, config.customMin, config.customMax, seq);
    case 'cube_roots':
      return genCubeRoots(idx, diff, qType, config.customMin, config.customMax, seq);
    case 'tables':
      return genTables(idx, diff, qType, cfg, config.customMin, config.customMax, config.selectedTables, seq);
    case 'trigonometry':
      return genTrigonometry(idx, diff, qType, config.trigFocus);
    case 'percentages':
      return genPercentages(idx, diff, qType, cfg, config.percentageType);
    case 'fractions':
      return genFractions(idx, diff, qType, cfg, config.fractionOperation);
    case 'di_addition':
      return genDIAddition(idx, diff, qType, cfg, config.termCount, config.digitLength);
    case 'addition':
      return genAddition(idx, diff, qType, config.digitLength);
    case 'subtraction':
      return genSubtraction(idx, diff, qType, config.digitLength);
    case 'multiplication':
      return genMultiplication(
        idx,
        diff,
        qType,
        config.multiplicationFocus,
        config.customMin,
        config.customMax,
        config.selectedTables,
        seq
      );
    case 'division':
      return genDivision(idx, diff, qType, config.divisionMode);
    case 'mixed_arithmetic':
    default:
      return genMixedArithmetic(idx, diff, qType);
  }
}

export function buildSessionQuestions(
  config: SessionLaunchConfig,
  bankQuestions: Question[],
  generatorConfigs: GeneratorConfig[]
): Question[] {
  const targetCount = config.unlimited ? 15 : config.questionCount;
  const targetTopics = config.topicIds && config.topicIds.length > 0 ? config.topicIds : [config.topicId];
  const hasSpecificFilter =
    Boolean(config.customMin) ||
    Boolean(config.customMax) ||
    Boolean(config.selectedTables?.length) ||
    Boolean(config.percentageType && config.percentageType !== 'all') ||
    Boolean(config.fractionOperation && config.fractionOperation !== 'all') ||
    Boolean(config.divisionMode && config.divisionMode !== 'mixed') ||
    Boolean(config.multiplicationFocus && config.multiplicationFocus !== 'all') ||
    Boolean(config.digitLength);

  const activeBank = bankQuestions.filter((q) => {
    if (!q.active) return false;
    if (!targetTopics.includes(q.topicId)) return false;
    if (config.difficulty !== 'mixed' && q.difficulty !== config.difficulty) return false;
    if (config.questionTypeFilter !== 'all' && q.questionType !== config.questionTypeFilter) return false;
    return true;
  });

  const seenPrompts = new Set<string>();
  const result: Question[] = [];

  if (!hasSpecificFilter && config.sourcePreference !== 'generated_only' && config.orderMode === 'random') {
    for (const bq of shuffle(activeBank)) {
      if (result.length >= targetCount) break;
      if (!seenPrompts.has(bq.questionText)) {
        seenPrompts.add(bq.questionText);
        result.push({ ...bq, marks: config.marksPerQuestion ?? bq.marks });
      }
    }
  } else if (config.sourcePreference === 'bank_only') {
    for (const bq of activeBank) {
      if (result.length >= targetCount) break;
      result.push({ ...bq, marks: config.marksPerQuestion ?? bq.marks });
    }
  }

  let attempts = 0;
  let seqIdx = 0;
  while (result.length < targetCount && attempts < targetCount * 6) {
    attempts++;
    const topicId = targetTopics[seqIdx % targetTopics.length];
    const generated = generateQuestionForTopic(topicId, seqIdx, config, generatorConfigs);
    seqIdx++;
    if (!seenPrompts.has(generated.questionText) || config.orderMode === 'sequential') {
      seenPrompts.add(generated.questionText);
      result.push({ ...generated, marks: config.marksPerQuestion ?? 1 });
    }
  }

  return result;
}

export function normalizeAnswerText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/sqrt\(([^)]+)\)/g, '√$1')
    .replace(/%$/, '');
}

export function verifyAnswer(userInput: string, question: Question): boolean {
  const userNorm = normalizeAnswerText(userInput);
  const correctNorm = normalizeAnswerText(question.correctAnswer);

  if (!userNorm) return false;
  if (userNorm === correctNorm) return true;

  // Handle remainder format flexibility e.g. "12 r 5" vs "12r5"
  if (correctNorm.includes('r') && userNorm.replace('remainder', 'r') === correctNorm) {
    return true;
  }

  // Handle numeric decimal precision
  const uNum = Number(userNorm);
  const cNum = Number(correctNorm);
  if (!Number.isNaN(uNum) && !Number.isNaN(cNum) && Number.isFinite(uNum) && Number.isFinite(cNum)) {
    return Math.abs(uNum - cNum) < 0.005;
  }

  // Handle unreduced/decimal fraction equivalence (e.g. "0.5" vs "1/2")
  if (correctNorm.includes('/') && !userNorm.includes('/') && !Number.isNaN(uNum)) {
    const [numStr, denStr] = correctNorm.split('/');
    const num = Number(numStr);
    const den = Number(denStr);
    if (!Number.isNaN(num) && !Number.isNaN(den) && den !== 0) {
      return Math.abs(num / den - uNum) < 0.005;
    }
  }

  return false;
}
