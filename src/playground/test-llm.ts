import dotenv from 'dotenv';
dotenv.config();

import { ChatOpenAI } from '@langchain/openai';

async function main() {
  const model = new ChatOpenAI({ model: 'gpt-4o', temperature: 0.7 });

  const response = await model.invoke([
    { role: 'user', content: 'Say hello in one sentence.' },
  ]);

  console.log(response.content);
}

main().catch(console.error);
