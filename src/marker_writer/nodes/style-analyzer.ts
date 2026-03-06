import type { WriterStateValue } from '@/marker_writer/state';
import { createUnderstandingModel } from '@/marker_writer/models';

export async function styleAnalyzerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const p = state.parsedInput;

  if (p.documentWordCount < 50) {
    return {
      styleProfile: {
        tone: 'neutral',
        avgSentenceLength: 15,
        paragraphStyle: 'mixed',
        vocabulary: 'simple',
        pointOfView: 'third person',
        tense: 'present',
        notablePatterns: [],
      },
    };
  }

  // Use text closest to the marker for most accurate style matching
  const sampleText =
    p.immediateBefore.length > p.immediateAfter.length
      ? p.immediateBefore
      : p.immediateBefore + p.immediateAfter;

  const model = createUnderstandingModel();

  const response = await model.invoke([
    {
      role: 'system' as const,
      content: `Analyze the writing style precisely. Respond with ONLY valid JSON:
       {
         "tone": "specific tone description",
         "avgSentenceLength": 15,
         "paragraphStyle": "short punchy | long flowing | mixed",
         "vocabulary": "simple | intermediate | advanced | specialized",
         "pointOfView": "first person | second person | third person",
         "tense": "past | present | future | mixed",
         "notablePatterns": ["specific patterns, devices, quirks"]
       }`,
    },
    { role: 'user' as const, content: sampleText },
  ] as any);

  const raw = (response.content as string)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  return { styleProfile: JSON.parse(raw) };
}
