import { MARKERS } from '@/marker_writer/markers';
import type { MarkerName } from '@/marker_writer/markers';
import type {
  MarkerPosition,
  OperationType,
  ParsedInput,
} from '@/marker_writer/types';
import type { WriterStateValue } from '@/marker_writer/state';
import {
  stripAllMarkers,
  getCleanIndex,
  extractLastSentence,
  extractFirstSentence,
  findCurrentHeading,
  findPreviousHeading,
  findNextHeading,
  countWords,
  getLineNumber,
  getColumnNumber,
} from '@/marker_writer/helpers';

// Pure logic — no LLM, instant, free, deterministic.
// Finds the marker, classifies the position pattern, extracts all context
// segments, and determines the operation type.
export async function inputParserNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const raw = state.rawInput;

  // Step 1: Find all markers and their positions
  const markerPositions: Array<{ type: MarkerName; index: number }> = [];

  for (const [name, char] of Object.entries(MARKERS)) {
    let idx = raw.indexOf(char);
    while (idx !== -1) {
      markerPositions.push({ type: name as MarkerName, index: idx });
      idx = raw.indexOf(char, idx + 1);
    }
  }

  markerPositions.sort((a, b) => a.index - b.index);

  // Step 2: Handle paired markers (rewrite/enhance/delete regions)
  const pairedOps: Record<string, [MarkerName, MarkerName]> = {
    REWRITE: ['REWRITE_START', 'REWRITE_END'],
    ENHANCE: ['ENHANCE_START', 'ENHANCE_END'],
    DELETE: ['DELETE_START', 'DELETE_END'],
  };

  for (const [opName, [startMarker, endMarker]] of Object.entries(pairedOps)) {
    const start = markerPositions.find((m) => m.type === startMarker);
    const end = markerPositions.find((m) => m.type === endMarker);

    if (start && end && end.index > start.index) {
      const cleanRaw = stripAllMarkers(raw);
      const startClean = getCleanIndex(raw, start.index);
      const endClean = getCleanIndex(raw, end.index);

      const textBefore = cleanRaw.slice(0, startClean);
      const selectedRegion = cleanRaw.slice(startClean, endClean);
      const textAfter = cleanRaw.slice(endClean);

      const parsed: ParsedInput = {
        markerType: startMarker,
        markerPosition: 'REGION_SELECTED',
        operationType: `${opName}_REGION` as OperationType,
        textBefore,
        textAfter,
        selectedRegion,
        immediateBefore: textBefore.slice(-500),
        immediateAfter: textAfter.slice(0, 500),
        lastSentenceBefore: extractLastSentence(textBefore),
        firstSentenceAfter: extractFirstSentence(textAfter),
        isInsideParagraph: false,
        isInsideSentence: false,
        isAfterHeading: false,
        isBeforeHeading: false,
        currentHeading: findCurrentHeading(textBefore),
        previousHeading: findPreviousHeading(textBefore),
        nextHeading: findNextHeading(textAfter),
        totalCharsBefore: textBefore.length,
        totalCharsAfter: textAfter.length,
        documentWordCount: countWords(cleanRaw),
        markerCharIndex: startClean,
        markerLineNumber: getLineNumber(cleanRaw, startClean),
        markerColumnNumber: getColumnNumber(cleanRaw, startClean),
      };

      return { parsedInput: parsed };
    }
  }

  // Step 3: Handle single CONTINUE marker
  const continueMarker = markerPositions.find((m) => m.type === 'CONTINUE');

  if (!continueMarker) {
    // No marker found — treat entire input as a generation request
    const parsed: ParsedInput = {
      markerType: 'CONTINUE',
      markerPosition: 'EMPTY_DOCUMENT',
      operationType: 'GENERATE',
      textBefore: '',
      textAfter: '',
      selectedRegion: '',
      immediateBefore: '',
      immediateAfter: '',
      lastSentenceBefore: '',
      firstSentenceAfter: '',
      isInsideParagraph: false,
      isInsideSentence: false,
      isAfterHeading: false,
      isBeforeHeading: false,
      currentHeading: '',
      previousHeading: '',
      nextHeading: '',
      totalCharsBefore: 0,
      totalCharsAfter: 0,
      documentWordCount: 0,
      markerCharIndex: 0,
      markerLineNumber: 0,
      markerColumnNumber: 0,
    };
    return { parsedInput: parsed };
  }

  // Strip marker to get clean text
  const cleanText = stripAllMarkers(raw);
  const markerCleanIndex = getCleanIndex(raw, continueMarker.index);

  const textBefore = cleanText.slice(0, markerCleanIndex);
  const textAfter = cleanText.slice(markerCleanIndex);

  // Step 4: Classify the marker position
  const trimmedBefore = textBefore.trimEnd();
  const trimmedAfter = textAfter.trimStart();

  let markerPosition: MarkerPosition;
  let operationType: OperationType;

  if (cleanText.trim().length === 0) {
    markerPosition = 'EMPTY_DOCUMENT';
    operationType = 'GENERATE';
  } else if (trimmedBefore.length === 0 && trimmedAfter.length > 0) {
    markerPosition = 'START_OF_TEXT';
    operationType = 'PREPEND';
  } else if (trimmedBefore.length > 0 && trimmedAfter.length === 0) {
    const lastChar = trimmedBefore.slice(-1);
    const lastLine = trimmedBefore.split('\n').pop() || '';
    const isHeading = /^#{1,6}\s+.+$/.test(lastLine.trim());

    if (isHeading) {
      markerPosition = 'AFTER_HEADING';
      operationType = 'FILL_SECTION';
    } else if (textBefore.endsWith('\n\n')) {
      // marker follows a blank line — end of a paragraph/block
      markerPosition = 'END_OF_TEXT';
      operationType = 'CONTINUE';
    } else if (/[.!?]$/.test(lastChar)) {
      markerPosition = 'END_OF_TEXT';
      operationType = 'CONTINUE';
    } else if (/\w$/.test(lastChar)) {
      // Word ends mid-sentence with no following text — writer must complete
      markerPosition = 'MID_SENTENCE';
      operationType = 'CONTINUE';
    } else {
      // Punctuation (,:;—) or anything else at end-of-text → treat as end
      markerPosition = 'END_OF_TEXT';
      operationType = 'CONTINUE';
    }
  } else if (
    textBefore.endsWith('\n\n') ||
    (trimmedBefore.endsWith('\n') && trimmedAfter.startsWith('\n'))
  ) {
    const isNextHeading = /^#{1,6}\s+/.test(trimmedAfter);
    const isPrevHeading = /^#{1,6}\s+.+$/.test(
      (trimmedBefore.split('\n').pop() || '').trim(),
    );

    if (isPrevHeading) {
      markerPosition = 'AFTER_HEADING';
      operationType = 'FILL_SECTION';
    } else if (isNextHeading) {
      markerPosition = 'BEFORE_HEADING';
      operationType = 'BRIDGE';
    } else {
      markerPosition = 'BETWEEN_BLOCKS';
      operationType = 'BRIDGE';
    }
  } else if (textBefore.endsWith('\n') || trimmedAfter.startsWith('\n')) {
    markerPosition = 'BETWEEN_LINES';
    operationType = 'BRIDGE';
  } else if (/\w$/.test(trimmedBefore) || /^\w/.test(trimmedAfter)) {
    const lastChar = trimmedBefore.slice(-1);
    if (/[.!?]$/.test(lastChar)) {
      markerPosition = 'MID_PARAGRAPH';
      operationType = 'BRIDGE';
    } else {
      markerPosition = 'MID_SENTENCE';
      operationType = 'BRIDGE';
    }
  } else if (!textBefore.endsWith('\n') && textAfter.startsWith('\n')) {
    markerPosition = 'INLINE_END';
    operationType = 'BRIDGE';
  } else {
    markerPosition = 'MID_PARAGRAPH';
    operationType = 'BRIDGE';
  }

  // Step 5: Extract all context segments
  const parsed: ParsedInput = {
    markerType: 'CONTINUE',
    markerPosition,
    operationType,

    textBefore,
    textAfter,
    selectedRegion: '',

    immediateBefore: textBefore.slice(-500),
    immediateAfter: textAfter.slice(0, 500),
    lastSentenceBefore: extractLastSentence(textBefore),
    firstSentenceAfter: extractFirstSentence(textAfter),

    isInsideParagraph:
      !textBefore.endsWith('\n\n') && !textAfter.startsWith('\n\n'),
    isInsideSentence: !/[.!?]\s*$/.test(trimmedBefore),
    isAfterHeading: /^#{1,6}\s+.+$/.test(
      (trimmedBefore.split('\n').pop() || '').trim(),
    ),
    isBeforeHeading: /^#{1,6}\s+/.test(trimmedAfter.trim()),

    currentHeading: findCurrentHeading(textBefore),
    previousHeading: findPreviousHeading(textBefore),
    nextHeading: findNextHeading(textAfter),

    totalCharsBefore: textBefore.length,
    totalCharsAfter: textAfter.length,
    documentWordCount: countWords(cleanText),
    markerCharIndex: markerCleanIndex,
    markerLineNumber: getLineNumber(cleanText, markerCleanIndex),
    markerColumnNumber: getColumnNumber(cleanText, markerCleanIndex),
  };

  return { parsedInput: parsed };
}
