import type { WriterStateValue } from '@/marker_writer/state';
import { countWords } from '@/marker_writer/helpers';
import { createUnderstandingModel } from '@/marker_writer/models';

function computeAvgSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return 15;
  const total = sentences.reduce((sum, s) => sum + countWords(s.trim()), 0);
  return Math.round(total / sentences.length);
}

function detectPOV(text: string): string {
  const first = (text.match(/\b(I|we|my|our|me|us)\b/gi) || []).length;
  const second = (text.match(/\b(you|your|yours)\b/gi) || []).length;
  const third = (text.match(/\b(he|she|they|it|his|her|their|its)\b/gi) || [])
    .length;
  if (first >= second && first >= third) return 'first person';
  if (second >= first && second >= third) return 'second person';
  return 'third person';
}

function detectTense(text: string): string {
  const past = (text.match(/\b(was|were|had|did|went|said|made)\b/gi) || [])
    .length;
  const present = (text.match(/\b(is|are|has|does|goes|says|makes)\b/gi) || [])
    .length;
  if (past > present * 1.5) return 'past';
  if (present > past * 1.5) return 'present';
  return 'mixed';
}

export async function styleProfilerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { textBefore, textAfter } = state.cursorInfo;
  const wordCount = state.documentState.wordCount;

  // Heuristic path for short docs or simple continuations
  if (wordCount < 50) {
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

  const sampleText =
    textBefore.length > textAfter.length
      ? textBefore.slice(-500)
      : textBefore.slice(-250) + textAfter.slice(0, 250);

  // Fast heuristic path for simple continuations
  if (
    state.intent.type === 'continue' &&
    !state.intent.instruction &&
    wordCount >= 50
  ) {
    return {
      styleProfile: {
        tone: 'match existing',
        avgSentenceLength: computeAvgSentenceLength(sampleText),
        paragraphStyle: 'mixed',
        vocabulary: 'match existing',
        pointOfView: detectPOV(sampleText),
        tense: detectTense(sampleText),
        notablePatterns: [],
      },
    };
  }

  // LLM path for complex cases
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
