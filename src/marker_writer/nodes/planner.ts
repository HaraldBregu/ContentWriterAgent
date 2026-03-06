import type { WriterStateValue } from '@/marker_writer/state';
import { createUnderstandingModel } from '@/marker_writer/models';

export async function plannerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const p = state.parsedInput;

  const model = createUnderstandingModel();

  const response = await model.invoke([
    {
      role: 'system' as const,
      content: `Create a writing plan for this continuation.

       POSITION: ${p.markerPosition}
       OPERATION: ${p.operationType}

       ${p.isInsideSentence ? `CRITICAL: The text before ends mid-sentence: "${p.lastSentenceBefore}"\nYou MUST complete this sentence first.` : ''}

       ${p.operationType === 'BRIDGE' ? `CRITICAL: Text exists AFTER the marker. The continuation must end by flowing naturally into: "${p.firstSentenceAfter}"` : ''}

       ${p.operationType === 'PREPEND' ? `CRITICAL: Content must lead naturally INTO the existing text: "${p.immediateAfter.slice(0, 200)}"` : ''}

       ${p.operationType === 'FILL_SECTION' ? `CRITICAL: Write content for section "${p.currentHeading}"` : ''}

       STYLE: ${JSON.stringify(state.styleProfile)}
       INTENT: ${JSON.stringify(state.intentAnalysis)}

       Respond with ONLY valid JSON:
       {
         "approach": "how to start writing",
         "topics": ["what to cover"],
         "transitionIn": "how to connect to text before marker",
         "transitionOut": "how to connect to text after marker (if any)",
         "constraints": ["things to avoid"],
         "targetWords": 300
       }`,
    },
    {
      role: 'user' as const,
      content: `Before: "${p.immediateBefore.slice(-300)}"\nAfter: "${p.immediateAfter.slice(0, 300)}"`,
    },
  ] as any);

  const raw = (response.content as string)
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  return { writingPlan: JSON.parse(raw) };
}
