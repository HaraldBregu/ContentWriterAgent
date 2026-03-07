import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { parseArgs } from 'util';
import { createWritingGraph } from '../../src/graph';
import { saveResult } from '../save-result';

const instructionsDir = join(dirname(import.meta.filename), '..', 'instructions');

function loadFile(folder: string, name: string): string {
  const filePath = name.endsWith('.md') ? name : `${name}.md`;
  return readFileSync(join(instructionsDir, folder, filePath), 'utf-8').trim();
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      instruction: { type: 'string' },
      'system-file': { type: 'string' },
      file: { type: 'string', short: 'f' },
      thread: { type: 'string' },
      stream: { type: 'boolean' },
    },
  });

  const input = values.input ?? '';

  let instruction = values.instruction ?? '';
  if (values.file) {
    instruction = loadFile('assistant', values.file);
  }

  let systemPrompt = '';
  if (values['system-file']) {
    systemPrompt = loadFile('system', values['system-file']);
  }

  const threadId = values.thread ?? 'playground';

  if (!input) {
    console.error('Provide --input');
    process.exit(1);
  }

  const graph = createWritingGraph();

  const inputText = [
    systemPrompt ? `System: ${systemPrompt}\n\n` : '',
    input,
    instruction ? `\n\nInstruction: ${instruction}` : '',
  ].join('');

  const start = Date.now();

  if (values.stream) {
    const stream = graph.stream(
      { inputText, instruction },
      { configurable: { thread_id: threadId } },
    );
    for await (const chunk of await stream) {
      const writerOutput = chunk.writer;
      if (writerOutput?.generatedText) {
        console.log('OUTPUT:', writerOutput.generatedText);
      }
    }
  } else {
    const result = await graph.invoke(
      { inputText, instruction },
      { configurable: { thread_id: threadId } },
    );
    console.log('INPUT:', input);
    console.log('\nOUTPUT:', result.generatedText);
  }

  const result = await graph.invoke(
    { inputText, instruction },
    { configurable: { thread_id: `${threadId}-save` } },
  );

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
