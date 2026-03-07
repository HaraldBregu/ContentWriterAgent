import type { WriterStateValue } from '@/marker_writer/state';
import {
  findCurrentHeading,
  findPreviousHeading,
  findNextHeading,
} from '@/marker_writer/helpers';

export async function structureAnalyzerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { textBefore, textAfter } = state.cursorInfo;
  const trimmedBefore = textBefore.trimEnd();
  const trimmedAfter = textAfter.trimStart();

  return {
    structure: {
      currentHeading: findCurrentHeading(textBefore),
      previousHeading: findPreviousHeading(textBefore),
      nextHeading: findNextHeading(textAfter),
      isAfterHeading: /^#{1,6}\s+.+$/.test(
        (trimmedBefore.split('\n').pop() || '').trim(),
      ),
      isBeforeHeading: /^#{1,6}\s+/.test(trimmedAfter.trim()),
    },
  };
}
