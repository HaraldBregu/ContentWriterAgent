import type { WriterStateValue } from '@/marker_writer/state';
import { countWords } from '@/marker_writer/helpers';
import { createUnderstandingModel } from '@/marker_writer/models';

function inferContentType(text: string): string {
  if (/^#{1,2}\s+/m.test(text) && countWords(text) > 500) return 'ARTICLE';
  if (/^Dear\s|^Hi\s|^Hello\s/i.test(text.trim())) return 'EMAIL';
  if (/^\d+\.\s/m.test(text)) return 'TECHNICAL';
  if (/^(INT\.|EXT\.)/m.test(text)) return 'SCRIPT';
  if (countWords(text) < 300) return 'SOCIAL_POST';
  return 'BLOG_POST';
}

export async function intentAnalyzerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const p = state.parsedInput;

  // For pure continuation with existing text, we can infer without the LLM
  if (
    p.operationType === 'CONTINUE' &&
    p.documentWordCount > 100 &&
    !state.userInstruction
  ) {
    return {
      intentAnalysis: {
        contentType: inferContentType(p.textBefore + p.textAfter),
        writingIntent: 'CONTINUE',
        topic: p.currentHeading || 'continuation of existing text',
        audience: 'same as existing text',
        desiredTone: 'match existing',
        desiredLength: `~${Math.min(300, Math.max(100, p.documentWordCount * 0.2))} words`,
        keyMessage: 'continue the current train of thought',
        constraints: [
          'match existing voice exactly',
          'do not repeat earlier content',
          p.isInsideSentence ? 'complete the current sentence first' : '',
        ].filter(Boolean),
      },
    };
  }

  const model = createUnderstandingModel();

  const response = await model.invoke([
    {
      role: 'system' as const,
      content: `Analyze what the user wants written. You have precise information about
       where in the document they want content.

       MARKER ANALYSIS:
       Position: ${p.markerPosition}
       Operation: ${p.operationType}
       Inside sentence: ${p.isInsideSentence}
       Inside paragraph: ${p.isInsideParagraph}
       Current section: "${p.currentHeading}"
       Next section: "${p.nextHeading}"
       Document length: ${p.documentWordCount} words
       Text before marker: ${p.totalCharsBefore} chars
       Text after marker: ${p.totalCharsAfter} chars

       IMMEDIATE CONTEXT:
       Before: "${p.immediateBefore.slice(-200)}"
       After: "${p.immediateAfter.slice(0, 200)}"

       USER INSTRUCTION: "${state.userInstruction || '(none — just continue)'}"

       Respond with ONLY valid JSON:
       {
         "contentType": "ARTICLE | BLOG_POST | ESSAY | STORY | etc.",
         "writingIntent": "what the user wants to achieve",
         "topic": "the subject to write about",
         "audience": "who will read this",
         "desiredTone": "tone to use",
         "desiredLength": "how much to write",
         "keyMessage": "the core message",
         "constraints": ["constraint1", "constraint2"]
       }`,
    },
    {
      role: 'user' as const,
      content:
        `Full text before marker:\n${p.textBefore.slice(-1000)}\n\n` +
        `Full text after marker:\n${p.textAfter.slice(0, 1000)}`,
    },
  ] as any);

  return { intentAnalysis: JSON.parse(response.content as string) };
}
