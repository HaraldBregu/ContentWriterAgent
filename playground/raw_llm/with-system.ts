import dotenv from 'dotenv';
dotenv.config();

import { ChatOpenAI } from '@langchain/openai';
import { saveResult } from '../save-result';

async function main() {
  const modelName = 'gpt-4o';
  const temperature = 0.7;
  const messages = [
    { role: 'system' as const, content: 'You are a pirate. Respond in pirate speak.' },
    { role: 'user' as const, content: 'Tell me about the weather today.' },
  ];

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
