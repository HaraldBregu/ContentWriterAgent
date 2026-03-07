import type { WriterStateValue } from '@/marker_writer/state';
import { createReviewerModel } from '@/marker_writer/models';

export async function coherenceValidatorNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { processedText, context, styleProfile, intent } = state;

  const needsAfterCheck = intent.type === 'insert' || intent.type === 'expand';

  const model = createReviewerModel();

  const response = await model.invoke([
    {
      role: 'system' as const,
      content: `You are a writing quality evaluator. Check the generated text for:

1. SEAM COHERENCE (before): Does it flow naturally from the preceding text?
   Last sentence before: "${context.lastSentenceBefore}"

${needsAfterCheck ? `2. SEAM COHERENCE (after): Does it connect naturally to the following text?\n   First sentence after: "${context.firstSentenceAfter}"` : '2. SEAM COHERENCE (after): N/A — no text follows.'}

3. VOICE MATCH: Does vocabulary, sentence length, and tense match?
   Style: tone=${styleProfile.tone}, avgSentenceLength=${styleProfile.avgSentenceLength}, POV=${styleProfile.pointOfView}, tense=${styleProfile.tense}

4. NO REPETITION: Does the text avoid repeating phrases from the context?

Respond with ONLY valid JSON:
{
  "pass": true | false,
  "issues": ["issue description if any"],
  "retryInstruction": "specific fix instruction, or empty string if pass"
}`,
    },
    {
      role: 'user' as const,
      content:
        `BEFORE:\n"${context.immediateBefore.slice(-300)}"\n\n` +
        `GENERATED:\n"${processedText}"\n\n` +
        `AFTER:\n"${context.immediateAfter.slice(0, 300) || '(end of document)'}"`,
    },
  ] as any);

  const raw = (response.content as string)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const result = JSON.parse(raw);

  if (result.pass) {
    return {
      coherencePass: true,
      coherenceFeedback: '',
      retryCount: state.retryCount ?? 0,
    };
  }

  return {
    coherencePass: false,
    coherenceFeedback: result.retryInstruction || result.issues?.join('; '),
    retryCount: (state.retryCount ?? 0) + 1,
  };
}
