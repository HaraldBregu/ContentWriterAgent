import type { WriterStateValue } from '@/marker_writer/state';
import type { IntentType } from '@/marker_writer/types';

const MARKER_TO_INTENT: Record<string, IntentType> = {
  CONTINUE: 'continue',
  REWRITE_START: 'rewrite',
  ENHANCE_START: 'expand',
  DELETE_START: 'delete',
};

export async function intentRouterNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const cursor = state.cursorInfo;
  let type: IntentType = MARKER_TO_INTENT[cursor.markerType] ?? 'continue';

  // Empty document with instruction → generate from scratch
  if (
    type === 'continue' &&
    !cursor.textBefore.trim() &&
    !cursor.textAfter.trim() &&
    !cursor.selectedRegion
  ) {
    type = 'generate';
  }

  // CONTINUE with text on both sides → insert (bridge)
  if (
    type === 'continue' &&
    cursor.textBefore.trim() &&
    cursor.textAfter.trim()
  ) {
    type = 'insert';
  }

  return {
    intent: {
      type,
      instruction: state.userInstruction || '',
    },
  };
}
