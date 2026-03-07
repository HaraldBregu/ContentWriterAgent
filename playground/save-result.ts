import { writeFileSync } from 'fs';
import { dirname, join } from 'path';

export function saveResult(
  callerFile: string,
  data: {
    model: string;
    temperature: number;
    messages: { role: string; content: string }[];
    response: string;
  },
) {
  const dir = dirname(callerFile);
  const name = callerFile.replace(/\.ts$/, '').split('/').pop()!;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = join(dir, `${name}_${timestamp}.json`);

  writeFileSync(
    filePath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        model: data.model,
        temperature: data.temperature,
        messages: data.messages,
        response: data.response,
      },
      null,
      2,
    ),
  );

  console.log(`\nSaved to ${filePath}`);
}
