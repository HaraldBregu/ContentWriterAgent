import { MARKERS } from '@/marker_writer/markers';
import type { MarkerName } from '@/marker_writer/markers';
import type { WriterStateValue } from '@/marker_writer/state';
import type {
  CursorInfo,
  Intent,
  DocumentState,
  Context,
  Structure,
  MarkerPosition,
  IntentType,
} from '@/marker_writer/types';
import {
  stripAllMarkers,
  extractLastSentence,
  extractFirstSentence,
  extractLastParagraph,
  extractFirstParagraph,
  findCurrentHeading,
  findPreviousHeading,
  findNextHeading,
  countWords,
  getLineNumber,
  getColumnNumber,
} from '@/marker_writer/helpers';

function detectMarkerType(rawInput: string): MarkerName {
  if (rawInput.includes(MARKERS.REWRITE_START)) return 'REWRITE_START';
  if (rawInput.includes(MARKERS.ENHANCE_START)) return 'ENHANCE_START';
  if (rawInput.includes(MARKERS.DELETE_START)) return 'DELETE_START';
  if (rawInput.includes(MARKERS.COMMENT)) return 'COMMENT';
  return 'CONTINUE';
}

function extractCursorInfo(
  rawInput: string,
  markerType: MarkerName,
): CursorInfo {
  let markerIndex: number;
  let textBefore: string;
  let textAfter: string;
  let selectedRegion = '';

  if (markerType === 'REWRITE_START') {
    markerIndex = rawInput.indexOf(MARKERS.REWRITE_START);
    textBefore = rawInput.slice(0, markerIndex);
    const endIdx = rawInput.indexOf(MARKERS.REWRITE_END);
    selectedRegion = rawInput.slice(markerIndex + 1, endIdx);
    textAfter = rawInput.slice(endIdx + 1);
  } else if (markerType === 'ENHANCE_START') {
    markerIndex = rawInput.indexOf(MARKERS.ENHANCE_START);
    textBefore = rawInput.slice(0, markerIndex);
    const endIdx = rawInput.indexOf(MARKERS.ENHANCE_END);
    selectedRegion = rawInput.slice(markerIndex + 1, endIdx);
    textAfter = rawInput.slice(endIdx + 1);
  } else if (markerType === 'DELETE_START') {
    markerIndex = rawInput.indexOf(MARKERS.DELETE_START);
    textBefore = rawInput.slice(0, markerIndex);
    const endIdx = rawInput.indexOf(MARKERS.DELETE_END);
    selectedRegion = rawInput.slice(markerIndex + 1, endIdx);
    textAfter = rawInput.slice(endIdx + 1);
  } else {
    markerIndex = rawInput.indexOf(MARKERS.CONTINUE);
    textBefore = rawInput.slice(0, markerIndex);
    const secondMarker = rawInput.indexOf(MARKERS.CONTINUE, markerIndex + 1);
    if (secondMarker !== -1) {
      selectedRegion = rawInput.slice(markerIndex + 1, secondMarker).trim();
      textAfter = rawInput.slice(secondMarker + 1);
    } else {
      textAfter = rawInput.slice(markerIndex + 1);
    }
  }

  return {
    textBefore,
    textAfter,
    selectedRegion,
    markerIndex,
    lineNumber: getLineNumber(rawInput, markerIndex),
    columnNumber: getColumnNumber(rawInput, markerIndex),
    markerType,
  };
}

function detectPosition(cursor: CursorInfo): MarkerPosition {
  const before = cursor.textBefore.trim();
  const after = cursor.textAfter.trim();

  if (!before && !after) return 'EMPTY_DOCUMENT';
  if (cursor.selectedRegion) return 'REGION_SELECTED';
  if (!before) return 'START_OF_TEXT';
  if (!after) return 'END_OF_TEXT';

  if (/\n\s*\n\s*$/.test(cursor.textBefore)) return 'BETWEEN_BLOCKS';
  if (/^\s*\n\s*\n/.test(cursor.textAfter)) return 'BETWEEN_BLOCKS';
  if (/^\s*#{1,6}\s/.test(cursor.textAfter)) return 'BEFORE_HEADING';
  if (/#{1,6}\s+.+\n\s*$/.test(cursor.textBefore)) return 'AFTER_HEADING';
  if (/\n\s*$/.test(cursor.textBefore)) return 'BETWEEN_LINES';
  if (/[.!?]\s*$/.test(before)) return 'MID_PARAGRAPH';

  return 'MID_SENTENCE';
}

function inferIntent(
  markerType: MarkerName,
  position: MarkerPosition,
  cursor: CursorInfo,
  userInstruction: string,
): Intent {
  let type: IntentType;
  let instruction = userInstruction;

  switch (markerType) {
    case 'REWRITE_START':
      type = 'rewrite';
      break;
    case 'ENHANCE_START':
      type = 'expand';
      break;
    case 'DELETE_START':
      type = 'delete';
      break;
    default:
      if (cursor.selectedRegion && !userInstruction) {
        instruction = cursor.selectedRegion;
      }
      if (position === 'EMPTY_DOCUMENT') {
        type = 'generate';
      } else if (position === 'BETWEEN_BLOCKS') {
        type = 'insert';
      } else {
        type = 'continue';
      }
  }

  return { type, instruction };
}

function estimateTargetLength(intent: Intent, cursor: CursorInfo): number {
  if (intent.type === 'rewrite' || intent.type === 'expand') {
    const regionWords = countWords(cursor.selectedRegion);
    return intent.type === 'expand' ? regionWords * 2 : regionWords;
  }
  if (intent.type === 'delete') return 0;
  if (intent.type === 'generate') return 300;

  const existingWords = countWords(cursor.textBefore + cursor.textAfter);
  if (existingWords < 50) return 50;
  if (existingWords < 200) return 100;
  return 200;
}

export function inputParserNode(
  state: WriterStateValue,
): Partial<WriterStateValue> {
  const { rawInput, userInstruction } = state;

  const markerType = detectMarkerType(rawInput);
  const cursorInfo = extractCursorInfo(rawInput, markerType);
  const position = detectPosition(cursorInfo);
  const intent = inferIntent(markerType, position, cursorInfo, userInstruction);
  const cleanText = stripAllMarkers(rawInput);

  const documentState: DocumentState = {
    cleanText,
    wordCount: countWords(cleanText),
    position,
  };

  const context: Context = {
    immediateBefore: cursorInfo.textBefore.slice(-500),
    immediateAfter: cursorInfo.textAfter.slice(0, 500),
    lastSentenceBefore: extractLastSentence(cursorInfo.textBefore),
    firstSentenceAfter: extractFirstSentence(cursorInfo.textAfter),
    isInsideParagraph:
      position === 'MID_PARAGRAPH' || position === 'MID_SENTENCE',
    isInsideSentence: position === 'MID_SENTENCE',
  };

  const structure: Structure = {
    currentHeading: findCurrentHeading(cursorInfo.textBefore),
    previousHeading: findPreviousHeading(cursorInfo.textBefore),
    nextHeading: findNextHeading(cursorInfo.textAfter),
    isAfterHeading: position === 'AFTER_HEADING',
    isBeforeHeading: position === 'BEFORE_HEADING',
  };

  const targetLength = estimateTargetLength(intent, cursorInfo);

  return {
    cursorInfo,
    intent,
    documentState,
    context,
    structure,
    targetLength,
  };
}
