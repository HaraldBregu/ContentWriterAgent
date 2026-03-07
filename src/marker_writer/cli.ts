import dotenv from 'dotenv';
dotenv.config();

import { createMarkerWriterGraph } from '@/marker_writer/graph';

async function main() {
  const args = process.argv.slice(2);
  const textFlag = args.indexOf('--text');
  const instructionFlag = args.indexOf('--instruction');

  if (textFlag === -1 || !args[textFlag + 1]) {
    console.log(
      'Usage: tsx src/marker_writer/cli.ts --text "<text>" [--instruction "<instruction>"]',
    );
    console.log('');
    console.log(
      'Place the cursor marker \\uE000 in your text where you want the AI to write.',
    );
    console.log(
      'Use $MARKER as a shorthand — it will be replaced with the actual marker character.',
    );
    console.log('');
    console.log('Examples:');
    console.log('  --text "Hello world.$MARKER"');
    console.log('  --text "First paragraph.$MARKER Second paragraph."');
    console.log('  --text "$MARKER" --instruction "write a poem about rain"');
    console.log(
      '  --text "The sun was setting.$MARKER add a metaphor $MARKER"',
    );
    process.exit(1);
  }

  const rawText = args[textFlag + 1].replace(/\$MARKER/g, '\uE000');
  const instruction =
    instructionFlag !== -1 ? args[instructionFlag + 1] || '' : '';

  const app = createMarkerWriterGraph();

  const result = await app.invoke(
    { rawInput: rawText, userInstruction: instruction },
    { configurable: { thread_id: 'cli' } },
  );

  console.log('\n--- Result ---');
  console.log('Intent:', result.intent.type);
  console.log('Position:', result.documentState.position);
  if (result.intent.instruction) {
    console.log('Instruction:', result.intent.instruction);
  }
  console.log('Target:', `~${result.targetLength} words`);
  console.log('');
  console.log(result.finalDocument);
}

main().catch(console.error);
