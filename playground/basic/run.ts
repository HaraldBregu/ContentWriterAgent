import dotenv from 'dotenv';
dotenv.config();

import { parseArgs } from 'util';
import { ChatOpenAI } from '@langchain/openai';
import { saveResult } from '../save-result';

async function main() {
  const { values } = parseArgs({
    options: {
      prompt: { type: 'string', short: 'p' },
      system: { type: 'string', short: 's' },
      temperature: { type: 'string', short: 't' },
      model: { type: 'string', short: 'm' },
    },
  });

  const modelName = values.model ?? 'gpt-4o';
  const temperature = values.temperature ? parseFloat(values.temperature) : 0.7;
  const prompt = values.prompt ?? 'Say hello in one sentence.';

  const messages: { role: 'system' | 'user'; content: string }[] = [];
  if (values.system) {
    messages.push({ role: 'system', content: values.system });
  }
  messages.push({ role: 'user', content: prompt });

  const model = new ChatOpenAI({ model: modelName, temperature });
  const response = await model.invoke(messages);
  const content = typeof response.content === 'string' ? response.content : '';

  console.log(content);

  saveResult(import.meta.filename, {
    model: modelName,
    temperature,
    messages,
    response: content,
  });
}

main().catch(console.error);
