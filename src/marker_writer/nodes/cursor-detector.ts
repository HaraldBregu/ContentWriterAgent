import { MARKERS } from '@/marker_writer/markers';
import type { MarkerName } from '@/marker_writer/markers';
import type { WriterStateValue } from '@/marker_writer/state';
import {
  stripAllMarkers,
  getCleanIndex,
  getLineNumber,
  getColumnNumber,
} from '@/marker_writer/helpers';

export async function cursorDetectorNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const raw = state.rawInput;

  const found: Array<{ type: MarkerName; index: number }> = [];
  for (const [name, char] of Object.entries(MARKERS)) {
    let idx = raw.indexOf(char);
    while (idx !== -1) {
      found.push({ type: name as MarkerName, index: idx });
      idx = raw.indexOf(char, idx + 1);
    }
  }
  found.sort((a, b) => a.index - b.index);

  // Paired markers (rewrite/enhance/delete)
  const pairs: Record<string, [MarkerName, MarkerName]> = {
    REWRITE: ['REWRITE_START', 'REWRITE_END'],
    ENHANCE: ['ENHANCE_START', 'ENHANCE_END'],
    DELETE: ['DELETE_START', 'DELETE_END'],
  };

  for (const [, [startM, endM]] of Object.entries(pairs)) {
    const start = found.find((m) => m.type === startM);
    const end = found.find((m) => m.type === endM);

    if (start && end && end.index > start.index) {
      const clean = stripAllMarkers(raw);
      const startClean = getCleanIndex(raw, start.index);
      const endClean = getCleanIndex(raw, end.index);

      return {
        cursorInfo: {
          textBefore: clean.slice(0, startClean),
          textAfter: clean.slice(endClean),
          selectedRegion: clean.slice(startClean, endClean),
          markerIndex: startClean,
          lineNumber: getLineNumber(clean, startClean),
          columnNumber: getColumnNumber(clean, startClean),
          markerType: startM,
        },
      };
    }
  }

  // Paired CONTINUE markers → inline instruction
  const continueMarkers = found.filter((m) => m.type === 'CONTINUE');

  if (continueMarkers.length >= 2) {
    const first = continueMarkers[0];
    const second = continueMarkers[1];
    const inlineInstruction = raw.slice(first.index + 1, second.index).trim();
    const cleaned = raw.slice(0, first.index + 1) + raw.slice(second.index + 1);
    const cleanText = stripAllMarkers(cleaned);
    const markerCleanIndex = getCleanIndex(cleaned, first.index);

    return {
      userInstruction: inlineInstruction || state.userInstruction,
      cursorInfo: {
        textBefore: cleanText.slice(0, markerCleanIndex),
        textAfter: cleanText.slice(markerCleanIndex),
        selectedRegion: '',
        markerIndex: markerCleanIndex,
        lineNumber: getLineNumber(cleanText, markerCleanIndex),
        columnNumber: getColumnNumber(cleanText, markerCleanIndex),
        markerType: 'CONTINUE',
      },
    };
  }

  // Single CONTINUE marker
  const single = continueMarkers[0];

  if (!single) {
    return {
      cursorInfo: {
        textBefore: '',
        textAfter: '',
        selectedRegion: '',
        markerIndex: 0,
        lineNumber: 0,
        columnNumber: 0,
        markerType: 'CONTINUE',
      },
    };
  }

  const cleanText = stripAllMarkers(raw);
  const markerCleanIndex = getCleanIndex(raw, single.index);

  return {
    cursorInfo: {
      textBefore: cleanText.slice(0, markerCleanIndex),
      textAfter: cleanText.slice(markerCleanIndex),
      selectedRegion: '',
      markerIndex: markerCleanIndex,
      lineNumber: getLineNumber(cleanText, markerCleanIndex),
      columnNumber: getColumnNumber(cleanText, markerCleanIndex),
      markerType: 'CONTINUE',
    },
  };
}
