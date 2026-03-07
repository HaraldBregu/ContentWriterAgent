import dotenv from 'dotenv';
dotenv.config();

import { createWritingGraph } from '../../src/graph';
import { saveResult } from '../save-result';

async function main() {
  const graph = createWritingGraph();

  const inputText = 'Coffee originated in Ethiopia.';
  const instruction = 'expand this into a full paragraph';

  const result = await graph.invoke(
    { inputText, instruction },
    { configurable: { thread_id: 'instruction-test' } },
  );

  console.log('INPUT:', result.inputText);
  console.log('\nOUTPUT:', result.generatedText);

  saveResult(import.meta.filename, {
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [{ role: 'user', content: `${inputText}\n\nInstruction: ${instruction}` }],
    response: result.generatedText,
  });
}

main().catch(console.error);
