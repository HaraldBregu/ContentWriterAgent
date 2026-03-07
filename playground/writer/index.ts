import dotenv from 'dotenv';
dotenv.config();

import { parseArgs } from 'util';
import { createWritingGraph } from '../../src/graph';
import { saveResult } from '../save-result';

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      instruction: { type: 'string' },
      thread: { type: 'string' },
    },
  });

  const input = values.input ?? '';
  const instruction = values.instruction ?? '';
  const threadId = values.thread ?? 'playground';

  if (!input) {
    console.error('Provide --input');
    process.exit(1);
  }

  const graph = createWritingGraph();

  const start = Date.now();
  const result = await graph.invoke(
    { inputText: input, instruction },
    { configurable: { thread_id: threadId } },
  );

  console.log('INPUT:', result.inputText);
  console.log('\nOUTPUT:', result.generatedText);

  saveResult(import.meta.filename, {
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [
      {
        role: 'user',
        content: instruction
          ? `${input}\n\nInstruction: ${instruction}`
          : input,
      },
    ],
    response: result.generatedText,
    durationMs: Date.now() - start,
  });
}

main().catch(console.error);
