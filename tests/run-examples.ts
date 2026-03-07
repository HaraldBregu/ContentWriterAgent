import dotenv from 'dotenv';
dotenv.config();

import { createMarkerWriterGraph } from '@/marker_writer/graph';

const M = '\uE000';
const RS = '\uE001';
const RE = '\uE002';
const ES = '\uE003';
const EE = '\uE004';
const DS = '\uE005';
const DE = '\uE006';

interface Example {
  id: string;
  name: string;
  category: string;
  rawInput: string;
  userInstruction: string;
}

const EXAMPLES: Example[] = [
  // ─── CONTINUE ──────────────────────────────────────
  {
    id: 'continue-1',
    name: 'Continue at end of document',
    category: 'continue',
    rawInput: `The rise of electric vehicles has fundamentally changed the automotive industry. Legacy manufacturers are racing to catch up with Tesla's head start, while new Chinese competitors are flooding the market with affordable alternatives.${M}`,
    userInstruction: '',
  },
  {
    id: 'continue-2',
    name: 'Continue mid-sentence',
    category: 'continue',
    rawInput: `The three most important factors in building a successful startup are${M}`,
    userInstruction: '',
  },
  {
    id: 'continue-3',
    name: 'Continue with inline instruction',
    category: 'continue',
    rawInput: `The history of coffee begins in Ethiopia.${M} add a sentence about trade routes ${M}`,
    userInstruction: '',
  },

  // ─── INSERT ────────────────────────────────────────
  {
    id: 'insert-1',
    name: 'Insert between paragraphs',
    category: 'insert',
    rawInput: `## Introduction\n\nArtificial intelligence has transformed how we process information.\n\n${M}\n\n## Conclusion\n\nThe future of AI depends on responsible development.`,
    userInstruction: 'write the main body',
  },
  {
    id: 'insert-2',
    name: 'Insert mid-paragraph',
    category: 'insert',
    rawInput: `Coffee consumption has risen steadily over the past decade. ${M}Today, the average American drinks over three cups per day.`,
    userInstruction: 'add a sentence about why consumption increased',
  },
  {
    id: 'insert-3',
    name: 'Insert after heading',
    category: 'insert',
    rawInput: `## The Bebop Revolution\n\n${M}\n\n## Cool Jazz and Beyond\n\nIn reaction to bebop's intensity, cool jazz emerged in the late 1940s.`,
    userInstruction: '',
  },
  {
    id: 'insert-4',
    name: 'Insert between blocks (marker at end of paragraph, text follows)',
    category: 'insert',
    rawInput: `Lorem ipsum dolor sit amet, consectetur adipiscing elit.${M}\n\nSecond paragraph starts here with more content.`,
    userInstruction: '',
  },
  {
    id: 'insert-5',
    name: 'Prepend at start',
    category: 'insert',
    rawInput: `${M}The three main challenges facing remote teams are communication overhead, timezone coordination, and maintaining culture.`,
    userInstruction: 'write an engaging introduction',
  },
  {
    id: 'insert-6',
    name: 'Mid-sentence bridge',
    category: 'insert',
    rawInput: `The three most important factors in building a successful startup are${M} which together determine whether a company can survive its first two years.`,
    userInstruction: '',
  },

  // ─── REWRITE ───────────────────────────────────────
  {
    id: 'rewrite-1',
    name: 'Rewrite selected region',
    category: 'rewrite',
    rawInput: `The conference was great. ${RS}It was really good and had many nice speakers who talked about interesting things.${RE} I look forward to next year.`,
    userInstruction: 'make the highlighted part more vivid and specific',
  },

  // ─── EXPAND ────────────────────────────────────────
  {
    id: 'expand-1',
    name: 'Expand selected region',
    category: 'expand',
    rawInput: `The history of jazz is fascinating. ${ES}Jazz originated in New Orleans.${EE} Many consider it America's greatest art form.`,
    userInstruction: 'add more detail about the origins',
  },

  // ─── DELETE ────────────────────────────────────────
  {
    id: 'delete-1',
    name: 'Delete selected region',
    category: 'delete',
    rawInput: `Keep this sentence. ${DS}Remove this unwanted text completely.${DE} And keep this too.`,
    userInstruction: '',
  },

  // ─── GENERATE ──────────────────────────────────────
  {
    id: 'generate-1',
    name: 'Generate from empty document',
    category: 'generate',
    rawInput: `${M}`,
    userInstruction: 'write a blog post about sustainable urban farming',
  },

  // ─── INLINE INSTRUCTION ────────────────────────────
  {
    id: 'inline-1',
    name: 'Inline instruction - complete sentence',
    category: 'inline',
    rawInput: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.${M} ADD A SENTENCE OR FINISH THE SENTENCE ${M}`,
    userInstruction: '',
  },
  {
    id: 'inline-2',
    name: 'Inline instruction - mid-sentence',
    category: 'inline',
    rawInput: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit${M} ADD A SENTENCE OR FINISH THE SENTENCE ${M}`,
    userInstruction: '',
  },
];

// ─── Runner ──────────────────────────────────────────────────────────────────

const G = '\x1b[32m';
const R = '\x1b[31m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const D = '\x1b[2m';
const B = '\x1b[1m';
const X = '\x1b[0m';

async function runExample(app: any, example: Example): Promise<void> {
  const start = Date.now();
  try {
    const result = await app.invoke(
      { rawInput: example.rawInput, userInstruction: example.userInstruction },
      { configurable: { thread_id: example.id } },
    );
    const ms = Date.now() - start;

    console.log(`\n${G}PASS${X} ${B}${example.name}${X} ${D}(${ms}ms)${X}`);
    console.log(`  ${C}intent:${X}   ${result.intent.type}`);
    console.log(`  ${C}position:${X} ${result.documentState.position}`);
    if (result.intent.instruction) {
      console.log(`  ${C}instruction:${X} ${result.intent.instruction}`);
    }
    console.log(`  ${C}target:${X}   ~${result.targetLength} words`);
    console.log(
      `  ${C}generated:${X} ${result.processedText.slice(0, 150).replace(/\n/g, '\\n')}${result.processedText.length > 150 ? '...' : ''}`,
    );
    if (result.diff) {
      console.log(
        `  ${C}diff:${X}      ${result.diff.type} | +${result.diff.addedWords} words`,
      );
    }
    console.log(`  ${C}change:${X}   ${result.changeDescription}`);
  } catch (err: any) {
    const ms = Date.now() - start;
    console.log(`\n${R}FAIL${X} ${B}${example.name}${X} ${D}(${ms}ms)${X}`);
    console.log(`  ${R}error:${X} ${err.message}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const categoryFlag = args.indexOf('--category');
  const idFlag = args.indexOf('--id');
  const listFlag = args.includes('--list');

  if (listFlag) {
    console.log(`\n${B}Available examples:${X}\n`);
    const categories = [...new Set(EXAMPLES.map((e) => e.category))];
    for (const cat of categories) {
      console.log(`  ${Y}${cat}${X}`);
      for (const ex of EXAMPLES.filter((e) => e.category === cat)) {
        console.log(`    ${D}${ex.id}${X} — ${ex.name}`);
      }
    }
    console.log(
      `\n${D}Usage: --category <name> | --id <id> | --all | --list${X}\n`,
    );
    return;
  }

  let selected: Example[];

  if (categoryFlag !== -1 && args[categoryFlag + 1]) {
    const cat = args[categoryFlag + 1].toLowerCase();
    selected = EXAMPLES.filter((e) => e.category === cat);
    if (selected.length === 0) {
      console.log(`${R}No examples found for category: ${cat}${X}`);
      return;
    }
  } else if (idFlag !== -1 && args[idFlag + 1]) {
    const id = args[idFlag + 1];
    selected = EXAMPLES.filter((e) => e.id === id);
    if (selected.length === 0) {
      console.log(`${R}No example found with id: ${id}${X}`);
      return;
    }
  } else if (args.includes('--all')) {
    selected = EXAMPLES;
  } else {
    console.log(
      `${Y}Usage:${X} tsx tests/run-examples.ts --all | --category <name> | --id <id> | --list`,
    );
    return;
  }

  console.log(`\n${B}Running ${selected.length} example(s)...${X}`);

  const app = createMarkerWriterGraph();

  for (const example of selected) {
    await runExample(app, example);
  }

  console.log(`\n${B}Done.${X}\n`);
}

main().catch(console.error);
