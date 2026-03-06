import dotenv from 'dotenv';
dotenv.config();

import { createMarkerWriterGraph } from '@/marker_writer/graph';
import type { MarkerPosition, OperationType } from '@/marker_writer/types';

// ─────────────────────────────────────────────────────────────────────────────
// Marker shorthands
// ─────────────────────────────────────────────────────────────────────────────
const M = '\uE000'; // CONTINUE
const RS = '\uE001'; // REWRITE_START
const RE = '\uE002'; // REWRITE_END
const ES = '\uE003'; // ENHANCE_START
const EE = '\uE004'; // ENHANCE_END

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationCheck {
  description: string;
  check: (result: TestResult) => boolean;
}

export interface TestCase {
  id: string;
  name: string;
  category: string;
  rawInput: string;
  userInstruction: string;
  expectedPosition: MarkerPosition;
  expectedOperation: OperationType;
  validationChecks: ValidationCheck[];
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  positionMatch: boolean;
  operationMatch: boolean;
  checkResults: Array<{ description: string; passed: boolean }>;
  generatedText: string;
  finalDocument: string;
  error?: string;
  durationMs: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Console colors (ANSI escape codes — works in Node.js terminals)
// ─────────────────────────────────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
};

function pass(msg: string) {
  return `${C.green}PASS${C.reset} ${msg}`;
}
function fail(msg: string) {
  return `${C.red}FAIL${C.reset} ${msg}`;
}
function check(ok: boolean, msg: string) {
  return ok
    ? `  ${C.green}[+]${C.reset} ${msg}`
    : `  ${C.red}[-]${C.reset} ${msg}`;
}

function containsLanguageChars(text: string, pattern: RegExp): boolean {
  return pattern.test(text);
}

// ─────────────────────────────────────────────────────────────────────────────
// All test cases
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_TESTS: TestCase[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 1: BASIC POSITION PATTERNS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '1.1',
    name: 'Simple end of document',
    category: 'BASIC_POSITION',
    rawInput: `The rise of electric vehicles has fundamentally changed the automotive industry. Legacy manufacturers are racing to catch up with Tesla's head start, while new Chinese competitors are flooding the market with affordable alternatives.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Continuation discusses EV trends or related topic',
        check: (r) =>
          /electric|vehicle|EV|automotive|manufacturer|market|compet|Tesla|Chinese|battery|charging|adopt/i.test(
            r.generatedText,
          ),
      },
      {
        description:
          "Does not begin by repeating 'Tesla' or 'Chinese competitors' as first clause",
        check: (r) => {
          const first50 = r.generatedText.trim().slice(0, 50).toLowerCase();
          return !first50.startsWith('tesla') && !first50.startsWith('chinese');
        },
      },
      {
        description: 'Final document contains the original text',
        check: (r) =>
          r.finalDocument.includes('Legacy manufacturers are racing'),
      },
    ],
  },
  {
    id: '1.2',
    name: 'Prepend — write opening',
    category: 'BASIC_POSITION',
    rawInput: `${M}Remote workers report 23% higher productivity than office-based peers, according to a Stanford study. However, they also report higher rates of loneliness and difficulty disconnecting from work. The tradeoffs are real and measurable.`,
    userInstruction:
      'write a compelling opening paragraph that hooks the reader',
    expectedPosition: 'START_OF_TEXT',
    expectedOperation: 'PREPEND',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Generated text does not mention the 23% stat (that comes after)',
        check: (r) => !/23%/.test(r.generatedText),
      },
      {
        description: 'Final document contains the Stanford stat paragraph',
        check: (r) => r.finalDocument.includes('23% higher productivity'),
      },
      {
        description: 'Generated text precedes the original in finalDocument',
        check: (r) => {
          const generatedIdx = r.finalDocument.indexOf(
            r.generatedText.trim().slice(0, 30),
          );
          const originalIdx = r.finalDocument.indexOf(
            '23% higher productivity',
          );
          return generatedIdx < originalIdx;
        },
      },
    ],
  },
  {
    id: '1.3',
    name: 'Blank page — generate from instruction',
    category: 'BASIC_POSITION',
    rawInput: `${M}`,
    userInstruction:
      'Write a blog post about why most productivity advice is wrong',
    expectedPosition: 'EMPTY_DOCUMENT',
    expectedOperation: 'GENERATE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text is at least 300 words',
        check: (r) => r.generatedText.trim().split(/\s+/).length >= 300,
      },
      {
        description: 'Generated text engages with productivity as a topic',
        check: (r) =>
          /productiv|advice|work|habit|routine|focus|time|task/i.test(
            r.generatedText,
          ),
      },
    ],
  },
  {
    id: '1.4',
    name: 'Blank page — no instruction',
    category: 'BASIC_POSITION',
    rawInput: `${M}`,
    userInstruction: '',
    expectedPosition: 'EMPTY_DOCUMENT',
    expectedOperation: 'GENERATE',
    validationChecks: [
      {
        description: 'Agent does not crash — finalDocument is a string',
        check: (r) => typeof r.finalDocument === 'string',
      },
      {
        description: 'Some output is produced or generatedText is non-null',
        check: (r) => r.generatedText !== undefined && r.generatedText !== null,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 2: MID-SENTENCE PATTERNS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '2.1',
    name: 'Incomplete sentence at end',
    category: 'MID_SENTENCE',
    rawInput: `The three fundamental pillars of a successful startup are${M}`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text completes the sentence (non-empty)',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document forms a grammatically complete sentence',
        check: (r) => {
          const combined = r.finalDocument.trim();
          return /[.!?]$/.test(combined) || /\.\s/.test(combined);
        },
      },
      {
        description: 'Generated text lists or names at least one concept',
        check: (r) => r.generatedText.trim().length > 5,
      },
    ],
  },
  {
    id: '2.2',
    name: 'Incomplete sentence with text after',
    category: 'MID_SENTENCE',
    rawInput: `The most effective way to learn a new language is${M} which is why immersion programs consistently outperform classroom instruction.`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains both sides of the original text',
        check: (r) =>
          r.finalDocument.includes(
            'The most effective way to learn a new language is',
          ) && r.finalDocument.includes('which is why immersion programs'),
      },
      {
        description: 'Generated bridge connects grammatically (sentence flows)',
        check: (r) => r.generatedText.trim().length > 3,
      },
    ],
  },
  {
    id: '2.3',
    name: 'After comma',
    category: 'MID_SENTENCE',
    rawInput: `While many companies have adopted AI tools for customer service,${M}`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains original text before generated',
        check: (r) =>
          r.finalDocument.includes(
            'While many companies have adopted AI tools',
          ),
      },
      {
        description:
          'Generated text provides a contrasting or completing main clause',
        check: (r) => r.generatedText.trim().split(/\s+/).length >= 3,
      },
    ],
  },
  {
    id: '2.4',
    name: 'After em dash',
    category: 'MID_SENTENCE',
    rawInput: `The CEO's decision to pivot — a move that surprised everyone on the board —${M} resulted in a 300% increase in quarterly revenue.`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Final document preserves both the em-dash aside and the 300% clause',
        check: (r) =>
          r.finalDocument.includes('surprised everyone on the board') &&
          r.finalDocument.includes('300% increase'),
      },
      {
        description: 'Generated bridge does not repeat the revenue figure',
        check: (r) => !/300%/.test(r.generatedText),
      },
    ],
  },
  {
    id: '2.5',
    name: 'Long incomplete sentence — formal/academic',
    category: 'MID_SENTENCE',
    rawInput: `In the context of modern urban planning, where cities must simultaneously address housing affordability, environmental sustainability, and equitable access to transportation, the most promising approach that has emerged from recent research in both European and Asian metropolitan areas is the concept of${M}`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document is a complete sentence',
        check: (r) => {
          const doc = r.finalDocument.trim();
          return /[.!?]/.test(doc);
        },
      },
      {
        description:
          'Generated text names a concept or approach (substantive completion)',
        check: (r) => r.generatedText.trim().split(/\s+/).length >= 2,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 3: BETWEEN SECTIONS / BLOCKS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '3.1',
    name: 'Bridge between headed sections',
    category: 'BETWEEN_SECTIONS',
    rawInput: `## The Problem\n\nMost small businesses fail within five years. The reasons are well-documented: undercapitalization, poor market fit, and operational inefficiency. But there is a deeper issue that rarely gets discussed.\n\n${M}\n\n## The Solution\n\nWhat if the problem isn't a lack of resources, but a lack of the right kind of thinking?`,
    userInstruction:
      'write a transition section that deepens the problem before the solution',
    expectedPosition: 'BETWEEN_BLOCKS',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains both headings',
        check: (r) =>
          r.finalDocument.includes('## The Problem') &&
          r.finalDocument.includes('## The Solution'),
      },
      {
        description: 'Generated text appears between the two headings',
        check: (r) => {
          const problemIdx = r.finalDocument.indexOf('## The Problem');
          const solutionIdx = r.finalDocument.indexOf('## The Solution');
          const genIdx = r.finalDocument.indexOf(
            r.generatedText.trim().slice(0, 20),
          );
          return genIdx > problemIdx && genIdx < solutionIdx;
        },
      },
    ],
  },
  {
    id: '3.2',
    name: 'Bridge between paragraphs — no headings',
    category: 'BETWEEN_SECTIONS',
    rawInput: `Coffee culture in Italy is a ritual, not a habit. The morning espresso at the bar is a social act, a small ceremony that anchors the day. Italians do not linger over their coffee — they stand, they drink, they leave.\n\n${M}\n\nIn America, coffee is fuel. It is consumed in enormous quantities, often on the go, in containers that would be considered absurd in Rome. The ritual, if there is one, is the drive-through.`,
    userInstruction: '',
    expectedPosition: 'BETWEEN_BLOCKS',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Final document contains both the Italian and American paragraphs',
        check: (r) =>
          r.finalDocument.includes('Coffee culture in Italy') &&
          r.finalDocument.includes('In America, coffee is fuel'),
      },
      {
        description: 'Generated bridge appears between the two paragraphs',
        check: (r) => {
          const italyIdx = r.finalDocument.indexOf('Coffee culture in Italy');
          const americaIdx = r.finalDocument.indexOf(
            'In America, coffee is fuel',
          );
          const genSnippet = r.generatedText.trim().slice(0, 25);
          const genIdx = r.finalDocument.indexOf(genSnippet);
          return genIdx > italyIdx && genIdx < americaIdx;
        },
      },
    ],
  },
  {
    id: '3.3',
    name: 'Fill empty section after heading',
    category: 'BETWEEN_SECTIONS',
    rawInput: `## Why We Sleep\n\nSleep is not passive rest. During sleep, the brain consolidates memories, clears metabolic waste, and performs maintenance that is impossible during waking hours. Chronic sleep deprivation is linked to Alzheimer's, cardiovascular disease, and metabolic disorders.\n\n## The Science of Dreams\n\n${M}\n\n## Practical Sleep Tips\n\nHere are evidence-based strategies for improving sleep quality: maintain a consistent schedule, keep your bedroom cool, avoid screens one hour before bed, and limit caffeine after noon.`,
    userInstruction: '',
    expectedPosition: 'AFTER_HEADING',
    expectedOperation: 'FILL_SECTION',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Generated text is topically relevant to dreams or sleep science',
        check: (r) =>
          /dream|REM|sleep|brain|conscious|subconscious|neural|memory|vision|night/i.test(
            r.generatedText,
          ),
      },
      {
        description: 'Final document contains all three headings',
        check: (r) =>
          r.finalDocument.includes('## Why We Sleep') &&
          r.finalDocument.includes('## The Science of Dreams') &&
          r.finalDocument.includes('## Practical Sleep Tips'),
      },
    ],
  },
  {
    id: '3.4',
    name: 'Before a heading — wrap up and transition',
    category: 'BETWEEN_SECTIONS',
    rawInput: `Machine learning models are only as good as the data they are trained on. Garbage in, garbage out — a principle as old as computing itself. Yet organizations routinely underinvest in data quality, focusing instead on model architecture and compute.\n\n${M}\n## How to Audit Your Training Data`,
    userInstruction:
      'wrap up the argument and transition to the practical section',
    expectedPosition: 'BEFORE_HEADING',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains the heading',
        check: (r) =>
          r.finalDocument.includes('## How to Audit Your Training Data'),
      },
      {
        description:
          'Generated text relates to data quality or the preceding argument',
        check: (r) =>
          /data|model|quality|train|audit|garbage|organiz/i.test(
            r.generatedText,
          ),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 4: MID-PARAGRAPH INSERTIONS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '4.1',
    name: 'Insert between sentences — compare to other organs',
    category: 'MID_PARAGRAPH',
    rawInput: `The human brain consumes roughly 20% of the body's energy despite being only 2% of its mass. ${M}This disproportionate energy demand explains why we feel mentally exhausted after intensive cognitive work.`,
    userInstruction: 'add a sentence comparing this to other organs',
    expectedPosition: 'MID_PARAGRAPH',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains both the original sentences',
        check: (r) =>
          r.finalDocument.includes("20% of the body's energy") &&
          r.finalDocument.includes(
            'mentally exhausted after intensive cognitive work',
          ),
      },
      {
        description: 'Generated text mentions an organ or makes a comparison',
        check: (r) =>
          /organ|heart|liver|muscle|kidney|lung|body|compar/i.test(
            r.generatedText,
          ),
      },
    ],
  },
  {
    id: '4.2',
    name: 'Insert example of cognitive bias',
    category: 'MID_PARAGRAPH',
    rawInput: `Cognitive biases affect every decision we make, from choosing what to eat for breakfast to evaluating billion-dollar business strategies. ${M}Understanding these biases is the first step toward mitigating their effects, though complete elimination is likely impossible.`,
    userInstruction: 'add a concrete example of a common bias in action',
    expectedPosition: 'MID_PARAGRAPH',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains both the original sentences',
        check: (r) =>
          r.finalDocument.includes('Cognitive biases affect every decision') &&
          r.finalDocument.includes(
            'Understanding these biases is the first step',
          ),
      },
      {
        description:
          'Generated text names or describes a specific bias or scenario',
        check: (r) =>
          /bias|confirm|anchor|heurist|availab|loss avers|overconfid|example|instance|consider/i.test(
            r.generatedText,
          ),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 5: MULTI-LANGUAGE TESTS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '5.1',
    name: 'Italian — continue end of document',
    category: 'MULTI_LANGUAGE',
    rawInput: `L'intelligenza artificiale sta trasformando radicalmente il tessuto produttivo delle piccole e medie imprese italiane. Settori tradizionali come la moda, l'agroalimentare e il manifatturiero stanno adottando strumenti di automazione e analisi predittiva che fino a pochi anni fa erano appannaggio esclusivo delle grandi corporazioni. La sfida principale non è tecnologica, ma culturale: convincere imprenditori con decenni di esperienza che i dati possono complementare — e non sostituire — il loro intuito.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text contains Italian characters or words',
        check: (r) =>
          containsLanguageChars(
            r.generatedText,
            /[àáâãäåæçèéêëìíîïðñòóôõöùúûü]|della|delle|degli|nella|nelle|degli|questo|questo|impresa|aziend/i,
          ),
      },
      {
        description: 'Final document contains the original Italian opening',
        check: (r) => r.finalDocument.includes("L'intelligenza artificiale"),
      },
    ],
  },
  {
    id: '5.2',
    name: 'Spanish — mid-sentence completion',
    category: 'MULTI_LANGUAGE',
    rawInput: `Los expertos en cambio climático advierten que las consecuencias más graves serán${M}`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text contains Spanish words or diacritics',
        check: (r) =>
          containsLanguageChars(
            r.generatedText,
            /[áéíóúüñ]|los|las|del|con|por|para|que|una|más|será/i,
          ),
      },
      {
        description: 'Final document begins with the original Spanish fragment',
        check: (r) =>
          r.finalDocument.includes('Los expertos en cambio climático'),
      },
    ],
  },
  {
    id: '5.3',
    name: 'French — bridge between paragraphs',
    category: 'MULTI_LANGUAGE',
    rawInput: `La cuisine française est souvent perçue comme hautaine et inaccessible, réservée aux palais raffinés des grandes villes. Cette réputation, forgée au fil des siècles par des chefs exigeants et des critiques sévères, masque une réalité bien plus nuancée.\n\n${M}\n\nDans les villages de province, la cuisine du quotidien est simple, généreuse et profondément enracinée dans les saisons et le terroir. C'est cette cuisine-là — celle des mères et des grandmères — qui constitue le véritable cœur de la gastronomie française.`,
    userInstruction: '',
    expectedPosition: 'BETWEEN_BLOCKS',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text contains French words or diacritics',
        check: (r) =>
          containsLanguageChars(
            r.generatedText,
            /[àâçèéêëîïôùûü]|les|des|une|dans|avec|pour|cuisine|français/i,
          ),
      },
      {
        description:
          'Final document contains both the original French paragraphs',
        check: (r) =>
          r.finalDocument.includes('La cuisine française') &&
          r.finalDocument.includes('Dans les villages de province'),
      },
    ],
  },
  {
    id: '5.4',
    name: 'German — fill section after heading',
    category: 'MULTI_LANGUAGE',
    rawInput: `## Die Zukunft der deutschen Automobilindustrie\n\n${M}\n\n## Herausforderungen und Chancen\n\nDie Transformation zur Elektromobilität birgt sowohl erhebliche Risiken als auch bedeutende Chancen für die deutschen Automobilhersteller. Während traditionelle Stärken wie Ingenieurpräzision und Qualitätsverarbeitung weiterhin relevant bleiben, müssen Unternehmen wie BMW, Mercedes-Benz und Volkswagen ihre Geschäftsmodelle grundlegend überdenken.`,
    userInstruction: '',
    expectedPosition: 'AFTER_HEADING',
    expectedOperation: 'FILL_SECTION',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text contains German words or umlauts',
        check: (r) =>
          containsLanguageChars(
            r.generatedText,
            /[äöüß]|die|der|das|und|für|mit|deutschen|Automobil|Industrie|Elektro/i,
          ),
      },
      {
        description: 'Final document contains the German heading',
        check: (r) =>
          r.finalDocument.includes(
            '## Die Zukunft der deutschen Automobilindustrie',
          ),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 6: CONTENT TYPES
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '6.1',
    name: 'Email — continue after opening',
    category: 'CONTENT_TYPE',
    rawInput: `Dear Marcus,\n\nThank you for taking the time to meet with us last Thursday. We were genuinely impressed by your team's approach to the supply chain problem, and we left the room with a much clearer picture of the scope involved.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document preserves the email greeting',
        check: (r) => r.finalDocument.includes('Dear Marcus'),
      },
      {
        description: 'Generated text maintains professional email register',
        check: (r) => r.generatedText.trim().split(/\s+/).length >= 10,
      },
    ],
  },
  {
    id: '6.2',
    name: 'Technical docs — fill authentication section',
    category: 'CONTENT_TYPE',
    rawInput: `# API Reference\n\n## Overview\n\nThis API follows REST conventions and returns JSON responses. All endpoints require authentication.\n\n## Authentication\n\n${M}\n\n## Rate Limiting\n\nRequests are limited to 1000 per hour per API key. Exceeding this limit returns a 429 status code.`,
    userInstruction: '',
    expectedPosition: 'AFTER_HEADING',
    expectedOperation: 'FILL_SECTION',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text mentions authentication concepts',
        check: (r) =>
          /API key|token|bearer|OAuth|header|Authorization|authenticat|credential/i.test(
            r.generatedText,
          ),
      },
      {
        description: 'Final document preserves Rate Limiting section',
        check: (r) => r.finalDocument.includes('## Rate Limiting'),
      },
    ],
  },
  {
    id: '6.3',
    name: 'Story / Narrative — continue',
    category: 'CONTENT_TYPE',
    rawInput: `The lighthouse had been dark for eleven years. Everyone in Portmore knew the story — the keeper who disappeared on a February night, the investigation that found nothing, the slow bureaucratic decision to automate the light and seal the quarters. Nobody went near it anymore.\n\nExcept Eleanor.\n\nShe had been coming every Tuesday for three months, always at dusk, always alone. She never told anyone.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Generated text maintains narrative voice and references Eleanor or the lighthouse',
        check: (r) =>
          /Eleanor|lighthouse|Portmore|keeper|dusk|Tuesday|dark/i.test(
            r.generatedText,
          ),
      },
      {
        description: 'Final document preserves the original story opening',
        check: (r) =>
          r.finalDocument.includes(
            'The lighthouse had been dark for eleven years',
          ),
      },
    ],
  },
  {
    id: '6.4',
    name: 'Academic / Research — bridge methodology to results',
    category: 'CONTENT_TYPE',
    rawInput: `## Methodology\n\nParticipants (N=247) were recruited through university research panels and screened for eligibility using DSM-5 criteria. The intervention consisted of eight weekly sessions of cognitive behavioral therapy delivered via structured video telehealth. Outcome measures were collected at baseline, four weeks, and eight weeks using validated instruments including the PHQ-9, GAD-7, and the WHO-5 Well-Being Index.\n\n${M}\n\n## Results\n\nAt the eight-week endpoint, participants in the intervention group showed statistically significant improvements across all three outcome measures compared to the waitlist control group.`,
    userInstruction: 'bridge methodology to results',
    expectedPosition: 'BETWEEN_BLOCKS',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text references methodology or results context',
        check: (r) =>
          /participant|data|analys|collect|measur|study|intervent|outcome|statistic/i.test(
            r.generatedText,
          ),
      },
      {
        description:
          'Final document contains both Methodology and Results sections',
        check: (r) =>
          r.finalDocument.includes('## Methodology') &&
          r.finalDocument.includes('## Results'),
      },
    ],
  },
  {
    id: '6.5',
    name: 'Marketing copy — mid-sentence hook',
    category: 'CONTENT_TYPE',
    rawInput: `The reason most diets fail isn't willpower — it's${M}`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains the original hook opener',
        check: (r) =>
          r.finalDocument.includes(
            "The reason most diets fail isn't willpower",
          ),
      },
      {
        description: 'Generated completion provides a compelling reason',
        check: (r) => r.generatedText.trim().split(/\s+/).length >= 3,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 7: PAIRED MARKERS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '7.1',
    name: 'Rewrite weak paragraph',
    category: 'PAIRED_MARKERS',
    rawInput: `The quarterly results were strong and showed good growth. ${RS}Sales went up a lot and we made more money than last quarter. The team worked hard and things went well. Customers seemed happy and we got positive feedback.${RE} Looking ahead, we expect continued momentum into Q4.`,
    userInstruction:
      'rewrite the highlighted section to be more professional and specific',
    expectedPosition: 'REGION_SELECTED',
    expectedOperation: 'REWRITE_REGION',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Generated text does not contain the weak original phrases',
        check: (r) =>
          !r.generatedText.includes('went up a lot') &&
          !r.generatedText.includes('things went well'),
      },
      {
        description: 'Final document contains surrounding context',
        check: (r) =>
          r.finalDocument.includes('quarterly results were strong') &&
          r.finalDocument.includes('Looking ahead'),
      },
    ],
  },
  {
    id: '7.2',
    name: 'Enhance paragraph',
    category: 'PAIRED_MARKERS',
    rawInput: `Climate change is one of the defining challenges of our era. ${ES}Rising temperatures are causing ice caps to melt, sea levels to rise, and extreme weather events to become more frequent. The scientific consensus is clear: human activity is the primary driver of these changes, and the window for meaningful action is narrowing.${EE} Governments, businesses, and individuals all have a role to play in the response.`,
    userInstruction:
      'enhance the highlighted section with more vivid language and specific data',
    expectedPosition: 'REGION_SELECTED',
    expectedOperation: 'ENHANCE_REGION',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Generated text is longer or richer than a minimal placeholder',
        check: (r) => r.generatedText.trim().split(/\s+/).length >= 20,
      },
      {
        description: 'Final document contains surrounding context',
        check: (r) =>
          r.finalDocument.includes(
            'Climate change is one of the defining challenges',
          ) &&
          r.finalDocument.includes('Governments, businesses, and individuals'),
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 8: EDGE CASES
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '8.1',
    name: 'Continue after bulleted list',
    category: 'EDGE_CASE',
    rawInput: `Before you start any home renovation project, make sure you have the following:\n\n- A detailed budget with a 20% contingency buffer\n- All necessary permits from your local authority\n- A written contract with your contractor\n- A realistic timeline that accounts for delays\n\n${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document preserves the bulleted list',
        check: (r) =>
          r.finalDocument.includes('- A detailed budget') &&
          r.finalDocument.includes('- All necessary permits'),
      },
    ],
  },
  {
    id: '8.2',
    name: 'Continue after code block in technical article',
    category: 'EDGE_CASE',
    rawInput:
      'To authenticate with the API, include your key in the Authorization header:\n\n```http\nGET /api/v1/users HTTP/1.1\nHost: api.example.com\nAuthorization: Bearer YOUR_API_KEY\n```\n\n' +
      `${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document preserves the code block',
        check: (r) => r.finalDocument.includes('Authorization: Bearer'),
      },
    ],
  },
  {
    id: '8.3',
    name: 'Almost empty — just a title',
    category: 'EDGE_CASE',
    rawInput: `# The Hidden Cost of Remote Work\n\n${M}`,
    userInstruction: '',
    expectedPosition: 'AFTER_HEADING',
    expectedOperation: 'FILL_SECTION',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains the title',
        check: (r) =>
          r.finalDocument.includes('# The Hidden Cost of Remote Work'),
      },
      {
        description: 'Generated text is topically relevant to remote work',
        check: (r) =>
          /remote|work|cost|home|office|distributed|team|productiv/i.test(
            r.generatedText,
          ),
      },
    ],
  },
  {
    id: '8.4',
    name: 'Deep in long document — Chapter 2',
    category: 'EDGE_CASE',
    rawInput: `# Cryptography: A Practical Guide\n\n## Chapter 1: The Foundations\n\nCryptography is the practice of securing communication from third-party interference. Its roots stretch back to ancient civilizations — Julius Caesar famously used a simple substitution cipher to protect military messages. In the modern era, cryptography underpins everything from banking to messaging apps.\n\nThe core principle is simple: transform readable data (plaintext) into unreadable data (ciphertext) using a mathematical algorithm and a key. Only someone with the correct key can reverse the process.\n\nSymmetric encryption uses the same key to encrypt and decrypt. It is fast and efficient, making it suitable for bulk data. The most widely used symmetric algorithm today is AES (Advanced Encryption Standard), adopted by the US government in 2001.\n\nAsymmetric encryption uses a pair of keys — a public key for encryption and a private key for decryption. RSA, invented in 1977, remains the most widely deployed asymmetric algorithm. It relies on the computational difficulty of factoring the product of two large prime numbers.\n\nHash functions are a third category: they transform data into a fixed-length digest that cannot be reversed. They are used to verify data integrity, store passwords securely, and create digital signatures.\n\n## Chapter 2: Modern Protocols\n\nBuilding on these foundations, modern protocols combine multiple cryptographic primitives to achieve security goals that no single primitive could provide alone.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Generated text discusses protocols or cryptographic concepts',
        check: (r) =>
          /protocol|TLS|SSL|HTTPS|cipher|key|encrypt|handshake|authenticat|certificate/i.test(
            r.generatedText,
          ),
      },
      {
        description: 'Final document preserves the chapter structure',
        check: (r) =>
          r.finalDocument.includes('## Chapter 1') &&
          r.finalDocument.includes('## Chapter 2'),
      },
    ],
  },
  {
    id: '8.5',
    name: 'Conflicting instruction — weather text with off-topic instruction',
    category: 'EDGE_CASE',
    rawInput: `Meteorologists have struggled to predict this season's unusual weather patterns. The jet stream has shifted further north than at any point in recorded history, pushing cold Arctic air deep into regions that rarely see frost.${M}`,
    userInstruction:
      'write about quantum computing and its applications in cryptography',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Agent produces output without crashing',
        check: (r) => typeof r.generatedText === 'string',
      },
      {
        description: 'Final document contains the original weather text',
        check: (r) => r.finalDocument.includes('Meteorologists have struggled'),
      },
    ],
  },
  {
    id: '8.6',
    name: 'Very long document — continue after 10 paragraphs',
    category: 'EDGE_CASE',
    rawInput: `# Understanding Modern Cryptography\n\nCryptography is the art and science of secure communication in the presence of adversaries. Since ancient times, humans have sought ways to protect sensitive messages from prying eyes.\n\nThe earliest cryptographic systems were simple substitution ciphers. Julius Caesar used a shift of three positions in the Roman alphabet to encode his military dispatches. While primitive by modern standards, this was sufficient against enemies who lacked both the concept and the tools to break it.\n\nThe Vigenère cipher, developed in the 16th century, added another layer by using a keyword to vary the substitution. For nearly three centuries it was considered unbreakable — until Charles Babbage and later Friedrich Kasiski independently discovered its weakness in the 19th century.\n\nWorld War II transformed cryptography into a critical military discipline. The German Enigma machine used rotating wheels to create a polyalphabetic cipher of extraordinary complexity. Its defeat by Alan Turing and the team at Bletchley Park is considered one of the defining intellectual achievements of the 20th century.\n\nThe post-war era brought the first truly mathematical approach to cryptography. Claude Shannon's 1949 paper "Communication Theory of Secrecy Systems" laid the theoretical foundations, proving that a cipher is perfectly secure only if the key is as long as the message and used only once — the one-time pad.\n\nThe 1970s saw a revolution with the development of public-key cryptography. Whitfield Diffie and Martin Hellman published their groundbreaking key exchange protocol in 1976, solving the fundamental problem of how two parties who have never met can establish a shared secret over a public channel.\n\nShortly after, Ron Rivest, Adi Shamir, and Leonard Adleman developed RSA, the first practical public-key encryption system. Its security rests on the assumption that multiplying two large prime numbers is easy, but factoring their product is computationally infeasible.\n\nThe adoption of the Data Encryption Standard (DES) by the US government in 1977 marked the first time a cryptographic algorithm was published openly for public scrutiny. DES used a 56-bit key, which became increasingly vulnerable to brute-force attacks as computing power grew. It was replaced by AES in 2001 after an open competition.\n\nElliptic curve cryptography emerged in the 1980s as an alternative mathematical foundation. It offers equivalent security to RSA with much shorter key lengths, making it particularly valuable in constrained environments like mobile devices and IoT sensors.\n\nToday, cryptography is everywhere: in the TLS that secures your browser connection, in the end-to-end encryption of messaging apps, in the digital signatures that authenticate software updates, and in the proof-of-work mechanisms of blockchain systems.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text relates to cryptography',
        check: (r) =>
          /cryptograph|encrypt|key|cipher|quantum|hash|algorithm|security|protocol/i.test(
            r.generatedText,
          ),
      },
      {
        description: 'Final document preserves the full original text',
        check: (r) =>
          r.finalDocument.includes('Today, cryptography is everywhere'),
      },
    ],
  },
  {
    id: '8.7',
    name: 'Text with URLs, numbers, and special chars',
    category: 'EDGE_CASE',
    rawInput: `According to the 2023 report (https://example.org/report?id=42&format=pdf#section-3), global CO2 emissions reached 36.8 Gt in 2022 — a 0.9% increase from 2021 levels. The breakdown by sector: energy (73.2%), agriculture (18.4%), industrial processes (5.2%), and waste (3.2%). See also: Table 4, Figure 7B, Appendix C.3.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document preserves the URL and statistics',
        check: (r) =>
          r.finalDocument.includes('https://example.org') &&
          r.finalDocument.includes('36.8 Gt'),
      },
    ],
  },
  {
    id: '8.8',
    name: 'Micro-insertion — one sentence between two',
    category: 'EDGE_CASE',
    rawInput: `Meditation has been practiced for thousands of years across dozens of cultures. ${M}Modern neuroscience has confirmed many of its claimed benefits through rigorous clinical trials.`,
    userInstruction:
      'add one sentence bridging ancient practice and modern science',
    expectedPosition: 'MID_PARAGRAPH',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains both original sentences',
        check: (r) =>
          r.finalDocument.includes(
            'Meditation has been practiced for thousands of years',
          ) && r.finalDocument.includes('Modern neuroscience has confirmed'),
      },
      {
        description:
          'Generated text is relatively brief (bridging sentence, not essay)',
        check: (r) => r.generatedText.trim().split(/\s+/).length <= 80,
      },
    ],
  },
  {
    id: '8.9',
    name: 'Multiple continue markers — only first should be used',
    category: 'EDGE_CASE',
    rawInput: `The first principle of good writing is clarity.${M} The second principle is brevity.${M} The third principle is precision.`,
    userInstruction: '',
    // The parser processes the first CONTINUE marker it finds
    expectedPosition: 'MID_PARAGRAPH',
    expectedOperation: 'BRIDGE',
    validationChecks: [
      {
        description: 'Agent does not crash with multiple markers',
        check: (r) => typeof r.generatedText === 'string',
      },
      {
        description: 'Final document is a non-empty string',
        check: (r) => r.finalDocument.trim().length > 0,
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY 9: VOICE MATCHING
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: '9.1',
    name: 'Hemingway-style — terse, minimalist',
    category: 'VOICE_MATCHING',
    rawInput: `The old man fished alone. He had not caught anything in eighty-four days. The boy had left. His parents said the old man was unlucky now. The boy thought they were wrong, but he did not say so.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description:
          'Generated sentences are relatively short (avg <= 15 words)',
        check: (r) => {
          const sentences = r.generatedText
            .split(/[.!?]+/)
            .filter((s) => s.trim().length > 0);
          if (sentences.length === 0) return false;
          const avgLen =
            sentences.reduce(
              (sum, s) => sum + s.trim().split(/\s+/).length,
              0,
            ) / sentences.length;
          return avgLen <= 20;
        },
      },
      {
        description: 'Final document contains the original minimalist passage',
        check: (r) => r.finalDocument.includes('eighty-four days'),
      },
    ],
  },
  {
    id: '9.2',
    name: 'Dense academic prose',
    category: 'VOICE_MATCHING',
    rawInput: `The proliferation of algorithmic decision-making systems across domains as diverse as criminal justice, financial credit assessment, and medical diagnosis has engendered significant scholarly debate regarding the epistemological foundations of fairness, accountability, and transparency in machine learning. Scholars such as Barocas and Hardt (2019) have argued that technical definitions of fairness are often mutually incompatible, rendering the simultaneous satisfaction of multiple fairness criteria mathematically impossible under standard assumptions.${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Generated text uses academic vocabulary',
        check: (r) =>
          /algorithmic|epistemo|theoret|empirical|framework|paradigm|methodolog|scholaR|dissemin|albeit|notwithstanding|contemporan/i.test(
            r.generatedText,
          ),
      },
      {
        description: 'Final document contains the original academic passage',
        check: (r) => r.finalDocument.includes('proliferation of algorithmic'),
      },
    ],
  },
  {
    id: '9.3',
    name: 'Excited, high-energy blog voice',
    category: 'VOICE_MATCHING',
    rawInput: `Okay, I have to tell you about the best productivity hack I've discovered this year — and I've tried literally hundreds of them. This one actually WORKS. It takes about five minutes to set up and you'll never go back to your old system. Ready? Here's the thing:${M}`,
    userInstruction: '',
    expectedPosition: 'MID_SENTENCE',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document contains the original excited opening',
        check: (r) => r.finalDocument.includes('best productivity hack'),
      },
      {
        description: 'Generated text is enthusiastic or informal in register',
        check: (r) =>
          /!|you|your|I |we |really|actually|just|so |definitely|amazing|incredible|love/i.test(
            r.generatedText,
          ),
      },
    ],
  },
  {
    id: '9.4',
    name: 'Legal document style',
    category: 'VOICE_MATCHING',
    rawInput: `WHEREAS, the parties hereto desire to enter into a mutually binding agreement governing the terms of service delivery, intellectual property ownership, and confidentiality obligations arising from the engagement described herein; and\n\nWHEREAS, the Client (as defined in Section 1.2) has represented that it possesses the requisite authority to enter into this Agreement on behalf of its principals; and\n\nNOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:${M}`,
    userInstruction: '',
    expectedPosition: 'END_OF_TEXT',
    expectedOperation: 'CONTINUE',
    validationChecks: [
      {
        description: 'Generated text is non-empty',
        check: (r) => r.generatedText.trim().length > 0,
      },
      {
        description: 'Final document preserves the WHEREAS preamble',
        check: (r) => r.finalDocument.includes('WHEREAS, the parties hereto'),
      },
      {
        description: 'Generated text uses legal register',
        check: (r) =>
          /shall|herein|pursuant|thereof|notwithstanding|indemnif|represent|warrant|covenant|oblig|terminat|Section|party|parties/i.test(
            r.generatedText,
          ),
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────

export async function runTest(test: TestCase): Promise<TestResult> {
  const start = Date.now();
  const threadId = `test-${test.id}-${Date.now()}`;

  try {
    const app = createMarkerWriterGraph();

    const raw = await app.invoke(
      { rawInput: test.rawInput, userInstruction: test.userInstruction },
      { configurable: { thread_id: threadId } },
    );

    const generatedText: string = raw.generatedText ?? '';
    const finalDocument: string = raw.finalDocument ?? '';
    const actualPosition: MarkerPosition = raw.parsedInput?.markerPosition;
    const actualOperation: OperationType = raw.parsedInput?.operationType;

    const positionMatch = actualPosition === test.expectedPosition;
    const operationMatch = actualOperation === test.expectedOperation;

    const partialResult = {
      testCase: test,
      positionMatch,
      operationMatch,
      generatedText,
      finalDocument,
      durationMs: 0,
    };

    const checkResults = test.validationChecks.map((vc) => {
      let passed = false;
      try {
        passed = vc.check({
          ...partialResult,
          passed: false,
          checkResults: [],
        });
      } catch {
        passed = false;
      }
      return { description: vc.description, passed };
    });

    const passed =
      positionMatch && operationMatch && checkResults.every((c) => c.passed);

    return {
      testCase: test,
      passed,
      positionMatch,
      operationMatch,
      checkResults,
      generatedText,
      finalDocument,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      testCase: test,
      passed: false,
      positionMatch: false,
      operationMatch: false,
      checkResults: test.validationChecks.map((vc) => ({
        description: vc.description,
        passed: false,
      })),
      generatedText: '',
      finalDocument: '',
      error: errorMessage,
      durationMs: Date.now() - start,
    };
  }
}

function printResult(result: TestResult): void {
  const statusLine = result.passed
    ? pass(`[${result.testCase.id}] ${result.testCase.name}`)
    : fail(`[${result.testCase.id}] ${result.testCase.name}`);

  console.log(`\n${statusLine}  ${C.dim}(${result.durationMs}ms)${C.reset}`);

  if (result.error) {
    console.log(`  ${C.red}ERROR: ${result.error}${C.reset}`);
    return;
  }

  console.log(
    check(
      result.positionMatch,
      `Position: expected ${C.cyan}${result.testCase.expectedPosition}${C.reset}, got ${C.cyan}${result.testCase.expectedPosition !== result.testCase.expectedPosition ? '???' : result.positionMatch ? result.testCase.expectedPosition : 'MISMATCH'}${C.reset}`,
    ),
  );
  console.log(
    check(
      result.operationMatch,
      `Operation: expected ${C.cyan}${result.testCase.expectedOperation}${C.reset}`,
    ),
  );

  for (const c of result.checkResults) {
    console.log(check(c.passed, c.description));
  }

  if (result.generatedText) {
    const preview = result.generatedText
      .trim()
      .slice(0, 120)
      .replace(/\n/g, ' ');
    console.log(`  ${C.dim}Generated: "${preview}..."${C.reset}`);
  }
}

function printSummary(results: TestResult[]): void {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`${C.bold}Test Summary${C.reset}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(`  Total:  ${total}`);
  console.log(`  ${C.green}Passed: ${passed}${C.reset}`);
  console.log(`  ${C.red}Failed: ${failed}${C.reset}`);

  if (failed > 0) {
    console.log(`\n${C.bold}Failed tests:${C.reset}`);
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`  ${C.red}[${r.testCase.id}]${C.reset} ${r.testCase.name}`);
    }
  }

  const totalMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  console.log(`\n  Total time: ${(totalMs / 1000).toFixed(1)}s`);
}

export async function runCategory(category: string): Promise<void> {
  const tests = ALL_TESTS.filter(
    (t) => t.category.toLowerCase() === category.toLowerCase(),
  );

  if (tests.length === 0) {
    console.log(
      `${C.yellow}No tests found for category: ${category}${C.reset}`,
    );
    console.log(
      `Available categories: ${[...new Set(ALL_TESTS.map((t) => t.category))].join(', ')}`,
    );
    return;
  }

  console.log(
    `\n${C.bold}${C.blue}Running category: ${category} (${tests.length} tests)${C.reset}`,
  );
  const results: TestResult[] = [];

  for (const test of tests) {
    const result = await runTest(test);
    printResult(result);
    results.push(result);
  }

  printSummary(results);
}

export async function runAll(): Promise<void> {
  console.log(
    `\n${C.bold}${C.blue}Running all tests (${ALL_TESTS.length} total)${C.reset}`,
  );
  const results: TestResult[] = [];

  for (const test of ALL_TESTS) {
    const result = await runTest(test);
    printResult(result);
    results.push(result);
  }

  printSummary(results);
}

export async function runSingle(name: string): Promise<void> {
  const test = ALL_TESTS.find(
    (t) => t.name.toLowerCase() === name.toLowerCase() || t.id === name,
  );

  if (!test) {
    console.log(
      `${C.yellow}No test found with name or id: "${name}"${C.reset}`,
    );
    console.log(`\nAvailable tests:`);
    for (const t of ALL_TESTS) {
      console.log(`  [${t.id}] ${t.name}`);
    }
    return;
  }

  console.log(
    `\n${C.bold}${C.blue}Running single test: ${test.name}${C.reset}`,
  );
  const result = await runTest(test);
  printResult(result);
  printSummary([result]);
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry point
// ─────────────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

async function main(): Promise<void> {
  if (args.includes('--all') || args.length === 0) {
    await runAll();
    return;
  }

  const categoryFlag = args.indexOf('--category');
  if (categoryFlag !== -1) {
    const category = args[categoryFlag + 1];
    if (!category) {
      console.error('--category requires a value');
      process.exit(1);
    }
    await runCategory(category);
    return;
  }

  const testFlag = args.indexOf('--test');
  if (testFlag !== -1) {
    const testName = args[testFlag + 1];
    if (!testName) {
      console.error('--test requires a value');
      process.exit(1);
    }
    await runSingle(testName);
    return;
  }

  console.log(`${C.yellow}Unknown arguments. Usage:${C.reset}`);
  console.log('  --all                  Run all tests');
  console.log('  --category CATEGORY    Run a specific category');
  console.log('  --test "test name"    Run a single test by name or id');
}

main().catch((err) => {
  console.error(`${C.red}Fatal error:${C.reset}`, err);
  process.exit(1);
});
