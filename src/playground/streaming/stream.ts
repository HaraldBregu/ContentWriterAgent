import dotenv from 'dotenv';
dotenv.config();

import { ChatOpenAI } from '@langchain/openai';

async function main() {
  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0.7 });

  const stream = await model.stream([
    { role: 'user', content: 'Write a short paragraph about the moon.' },
  ]);

  for await (const chunk of stream) {
    process.stdout.write(typeof chunk.content === 'string' ? chunk.content : '');
  }
  console.log();
}

main().catch(console.error);
