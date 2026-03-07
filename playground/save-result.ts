import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

export function saveResult(
  callerFile: string,
  data: {
    model: string;
    temperature: number;
    messages: { role: string; content: string }[];
    response: string;
    durationMs: number;
    maxTokens?: number;
  },
) {
  const dir = dirname(callerFile);
  const resultsDir = join(dir, 'results');
  mkdirSync(resultsDir, { recursive: true });

  const name = callerFile.replace(/\.ts$/, '').split('/').pop()!;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = join(resultsDir, `${name}_${timestamp}.md`);

  const messages = data.messages
    .map((m) => `**${m.role}:** ${m.content}`)
    .join('\n\n');

  const content = `# Result: ${name}

**Timestamp:** ${new Date().toISOString()}
**Model:** ${data.model}
**Temperature:** ${data.temperature}
**Duration:** ${data.durationMs}ms${data.maxTokens ? `\n**Max Tokens:** ${data.maxTokens}` : ''}

## Messages

${messages}

## Response

${data.response}
`;

  writeFileSync(filePath, content);
  console.log(`\nSaved to ${filePath}`);
}
