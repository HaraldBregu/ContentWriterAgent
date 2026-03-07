import dotenv from 'dotenv';
dotenv.config();

import { createMarkerWriterGraph } from '@/marker_writer/graph';

async function main() {
  const app = createMarkerWriterGraph();

  const result = await app.invoke(
    {
      inputText:
        'The village sat at the edge of a vast forest that no one dared enter after dark.',
      instruction: '',
    },
    { configurable: { thread_id: 'test' } },
  );

  console.log(result.generatedText);
}

main().catch(console.error);
