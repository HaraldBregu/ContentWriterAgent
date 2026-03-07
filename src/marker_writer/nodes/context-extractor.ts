import type { WriterStateValue } from '@/marker_writer/state';
import {
  extractLastSentence,
  extractFirstSentence,
} from '@/marker_writer/helpers';

export async function contextExtractorNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { textBefore, textAfter } = state.cursorInfo;
  const trimmedBefore = textBefore.trimEnd();

  return {
    context: {
      immediateBefore: textBefore.slice(-500),
      immediateAfter: textAfter.slice(0, 500),
      lastSentenceBefore: extractLastSentence(textBefore),
      firstSentenceAfter: extractFirstSentence(textAfter),
      isInsideParagraph:
        !textBefore.endsWith('\n\n') && !textAfter.startsWith('\n\n'),
      isInsideSentence: !/[.!?]\s*$/.test(trimmedBefore),
    },
  };
}
