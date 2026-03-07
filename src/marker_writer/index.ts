import dotenv from 'dotenv';
dotenv.config();

import { createMarkerWriterGraph } from '@/marker_writer/graph';
import { CONTINUE_MARKER, MARKERS } from '@/marker_writer/markers';

async function main() {
  const app = createMarkerWriterGraph();
  const M = CONTINUE_MARKER;

  // ─────────────────────────────────────────────
  // Pattern 1: text text text█ (continue)
  // ─────────────────────────────────────────────
  console.log('\n=== PATTERN 1: Continue at end ===');
  const r1 = await app.invoke(
    {
      rawInput: `The history of coffee begins in Ethiopia, where legend says a goat herder named Kaldi noticed his goats dancing after eating berries from a certain tree.${M}`,
      userInstruction: '',
    },
    { configurable: { thread_id: 'p1' } },
  );
  console.log('Intent:', r1.intent.type);
  console.log('Position:', r1.documentState.position);
  console.log('Generated:', r1.processedText.slice(0, 200) + '...');

  // ─────────────────────────────────────────────
  // Pattern 2: text\n\n█\n\ntext (insert/bridge)
  // ─────────────────────────────────────────────
  console.log('\n=== PATTERN 2: Insert between sections ===');
  const r2 = await app.invoke(
    {
      rawInput: `## Introduction\n\nAI has transformed how we process information.\n\n${M}\n\n## Conclusion\n\nThe future depends on responsible development.`,
      userInstruction: 'write the main body',
    },
    { configurable: { thread_id: 'p2' } },
  );
  console.log('Intent:', r2.intent.type);
  console.log('Position:', r2.documentState.position);

  // ─────────────────────────────────────────────
  // Pattern 3: text█ instruction █ (inline instruction)
  // ─────────────────────────────────────────────
  console.log('\n=== PATTERN 3: Inline instruction ===');
  const r3 = await app.invoke(
    {
      rawInput: `The quick brown fox jumped over the lazy dog.${M} add a sentence about the cat ${M}`,
      userInstruction: '',
    },
    { configurable: { thread_id: 'p3' } },
  );
  console.log('Intent:', r3.intent.type);
  console.log('Instruction:', r3.intent.instruction);
  console.log('Generated:', r3.processedText.slice(0, 200));

  // ─────────────────────────────────────────────
  // Pattern 4: rewrite region
  // ─────────────────────────────────────────────
  console.log('\n=== PATTERN 4: Rewrite region ===');
  const r4 = await app.invoke(
    {
      rawInput: `The conference was great. ${MARKERS.REWRITE_START}It was really good and had many nice speakers.${MARKERS.REWRITE_END} I look forward to next year.`,
      userInstruction: 'make it more vivid and specific',
    },
    { configurable: { thread_id: 'p4' } },
  );
  console.log('Intent:', r4.intent.type);
  console.log('Selected:', r4.cursorInfo.selectedRegion);
  console.log('Rewritten:', r4.processedText.slice(0, 200));

  // ─────────────────────────────────────────────
  // Pattern 5: █ (generate from empty)
  // ─────────────────────────────────────────────
  console.log('\n=== PATTERN 5: Generate from empty ===');
  const r5 = await app.invoke(
    {
      rawInput: `${M}`,
      userInstruction: 'write a blog post about sustainable urban farming',
    },
    { configurable: { thread_id: 'p5' } },
  );
  console.log('Intent:', r5.intent.type);
  console.log('Generated:', r5.processedText.slice(0, 200) + '...');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('MARKER CHARACTERS:');
  for (const [name, char] of Object.entries(MARKERS)) {
    console.log(
      `  ${name}: U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`,
    );
  }
}

main().catch(console.error);
