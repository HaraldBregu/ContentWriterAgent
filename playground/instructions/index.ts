import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { parseArgs } from 'util';
import { ChatOpenAI } from '@langchain/openai';
import { saveResult } from '../save-result';

function loadFile(dir: string, folder: string, name: string): string {
  const filePath = name.endsWith('.md') ? name : `${name}.md`;
  return readFileSync(join(dir, folder, filePath), 'utf-8').trim();
}

async function main() {
  const { values } = parseArgs({
    options: {
      input: { type: 'string', short: 'i' },
      instruction: { type: 'string' },
      system: { type: 'string', short: 's' },
      'system-file': { type: 'string' },
      file: { type: 'string', short: 'f' },
      temperature: { type: 'string', short: 't' },
      model: { type: 'string', short: 'm' },
      stream: { type: 'boolean' },
      'max-tokens': { type: 'string' },
    },
  });

  const dir = dirname(import.meta.filename);
  const modelName = values.model ?? 'gpt-4o';
  const temperature = values.temperature ? parseFloat(values.temperature) : 0.7;
  const input = values.input ?? '';

  let instruction = values.instruction ?? '';
  if (values.file) {
    instruction = loadFile(dir, 'assistant', values.file);
  }

  let systemPrompt = values.system ?? '';
  if (values['system-file']) {
    systemPrompt = loadFile(dir, 'system', values['system-file']);
  }
  if (!systemPrompt) {
    systemPrompt = loadFile(dir, 'system', 'writing-assistant');
  }

  if (!input && !instruction) {
    console.error('Provide --input and/or --instruction');
    process.exit(1);
  }

  const prompt = [input, instruction ? `Instruction: ${instruction}` : '']
    .filter(Boolean)
    .join('\n\n');

  const messages: { role: 'system' | 'user'; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const maxTokens = values['max-tokens']
    ? parseInt(values['max-tokens'])
    : undefined;

  const model = new ChatOpenAI({ model: modelName, temperature, maxTokens });

  const start = Date.now();
  let content = '';
  if (values.stream) {
    const stream = await model.stream(messages);
    for await (const chunk of stream) {
      const text = typeof chunk.content === 'string' ? chunk.content : '';
      process.stdout.write(text);
      content += text;
    }
    console.log();
  } else {
    const response = await model.invoke(messages);
    content = typeof response.content === 'string' ? response.content : '';
    console.log(content);
  }

  saveResult(import.meta.filename, {
    model: modelName,
    temperature,
    messages,
    response: content,
    durationMs: Date.now() - start,
    maxTokens,
  });
}

main().catch(console.error);
