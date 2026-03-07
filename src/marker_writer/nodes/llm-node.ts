import type { WriterStateValue } from '@/marker_writer/state';
import { createWriterModel } from '@/marker_writer/models';

export async function llmNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  if (state.intent.type === 'delete') {
    return { generatedText: '' };
  }

  const model = createWriterModel();
  const { system, user } = state.assembledPrompt;

  const response = await model.invoke([
    { role: 'system' as const, content: system },
    { role: 'user' as const, content: user },
  ] as any);

  return { generatedText: response.content as string };
}
