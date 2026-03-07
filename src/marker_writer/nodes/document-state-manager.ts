import type { WriterStateValue } from '@/marker_writer/state';
import type { MarkerPosition } from '@/marker_writer/types';
import { countWords } from '@/marker_writer/helpers';

export async function documentStateManagerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const cursor = state.cursorInfo;
  const intent = state.intent;
  const { textBefore, textAfter, selectedRegion } = cursor;
  const cleanText = textBefore + selectedRegion + textAfter;
  const trimmedBefore = textBefore.trimEnd();
  const trimmedAfter = textAfter.trimStart();

  let position: MarkerPosition;

  if (selectedRegion) {
    position = 'REGION_SELECTED';
  } else if (cleanText.trim().length === 0) {
    position = 'EMPTY_DOCUMENT';
  } else if (!trimmedBefore && trimmedAfter) {
    position = 'START_OF_TEXT';
  } else if (trimmedBefore && !trimmedAfter) {
    const lastLine = trimmedBefore.split('\n').pop() || '';
    const lastChar = trimmedBefore.slice(-1);

    if (/^#{1,6}\s+.+$/.test(lastLine.trim())) {
      position = 'AFTER_HEADING';
    } else if (/[,;]$/.test(lastChar) || /\w$/.test(lastChar)) {
      position = 'MID_SENTENCE';
    } else {
      position = 'END_OF_TEXT';
    }
  } else if (
    textBefore.endsWith('\n\n') ||
    textAfter.startsWith('\n\n') ||
    (trimmedBefore.endsWith('\n') && trimmedAfter.startsWith('\n'))
  ) {
    const lastLine = (trimmedBefore.split('\n').pop() || '').trim();
    if (/^#{1,6}\s+.+$/.test(lastLine)) {
      position = 'AFTER_HEADING';
    } else if (/^#{1,6}\s+/.test(trimmedAfter)) {
      position = 'BEFORE_HEADING';
    } else {
      position = 'BETWEEN_BLOCKS';
    }
  } else if (textBefore.endsWith('\n') || trimmedAfter.startsWith('\n')) {
    position = 'BETWEEN_LINES';
  } else if (/\w$/.test(trimmedBefore) || /^\w/.test(trimmedAfter)) {
    if (/[.!?]$/.test(trimmedBefore.slice(-1))) {
      position = 'MID_PARAGRAPH';
    } else {
      position = 'MID_SENTENCE';
    }
  } else if (!textBefore.endsWith('\n') && textAfter.startsWith('\n')) {
    position = 'INLINE_END';
  } else {
    position = 'MID_PARAGRAPH';
  }

  return {
    documentState: {
      cleanText,
      wordCount: countWords(cleanText),
      position,
    },
  };
}
