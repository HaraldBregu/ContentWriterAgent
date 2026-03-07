import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { parseArgs } from 'util';
import { createWritingGraph } from '../../src/graph';
import { saveResult } from '../save-result';

function loadFile(folder: string, name: string): string {
  const filePath = name.endsWith('.md') ? name : `${name}.md`;
  return readFileSync(
    join(dirname(import.meta.filename), folder, filePath),
    'utf-8',
  ).trim();
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      instruction: { type: 'string' },
      file: { type: 'string', short: 'f' },
      'system-file': { type: 'string' },
      thread: { type: 'string' },
    },
  });

  const input = values.input ?? '';
  const instruction = values.instruction ?? '';
  const threadId = values.thread ?? 'playground';

  let systemPrompt = '';
  if (values['system-file']) {
    systemPrompt = loadSystemFile(values['system-file']);
  }

  if (!input) {
    console.error('Provide --input');
    process.exit(1);
  }

  const inputText = [
    systemPrompt ? `System: ${systemPrompt}\n\n` : '',
    input,
    instruction ? `\n\nInstruction: ${instruction}` : '',
  ].join('');

  const graph = createWritingGraph();

  const start = Date.now();
  const result = await graph.invoke(
    { inputText, instruction },
    { configurable: { thread_id: threadId } },
  );

  console.log('INPUT:', input);
  console.log('\nOUTPUT:', result.generatedText);

  saveResult(import.meta.filename, {
    model: 'gpt-4o',
    temperature: 0.7,
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
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
