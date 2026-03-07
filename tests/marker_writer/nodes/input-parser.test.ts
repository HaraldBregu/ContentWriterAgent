import { describe, it, expect } from 'vitest';
import { inputParserNode } from '@/marker_writer/nodes/input-parser';
import { MARKERS } from '@/marker_writer/markers';
import type { WriterStateValue } from '@/marker_writer/state';

function makeState(rawInput: string, userInstruction = ''): WriterStateValue {
  return { rawInput, userInstruction } as unknown as WriterStateValue;
}

describe('inputParserNode — CONTINUE marker', () => {
  it('classifies END_OF_TEXT when marker follows sentence-ending punctuation', async () => {
    const raw = `The quick brown fox jumped over the lazy dog.${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('END_OF_TEXT');
    expect(result.parsedInput!.operationType).toBe('CONTINUE');
  });

  it('classifies START_OF_TEXT when marker precedes all text', async () => {
    const raw = `${MARKERS.CONTINUE}The quick brown fox jumped over the lazy dog.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('START_OF_TEXT');
    expect(result.parsedInput!.operationType).toBe('PREPEND');
  });

  it('classifies EMPTY_DOCUMENT when only the marker is present', async () => {
    const raw = MARKERS.CONTINUE;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('EMPTY_DOCUMENT');
    expect(result.parsedInput!.operationType).toBe('GENERATE');
  });

  it('classifies BETWEEN_BLOCKS when marker sits between double newlines', async () => {
    const raw = `First paragraph text here.\n\n${MARKERS.CONTINUE}\n\nSecond paragraph text.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('BETWEEN_BLOCKS');
    expect(result.parsedInput!.operationType).toBe('BRIDGE');
  });

  it('classifies MID_SENTENCE when marker splits an incomplete sentence', async () => {
    const raw = `The three most important factors are${MARKERS.CONTINUE} which determine success.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('MID_SENTENCE');
  });

  it('classifies MID_PARAGRAPH when marker sits between two complete sentences inline', async () => {
    const raw = `First sentence. ${MARKERS.CONTINUE}Second sentence.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('MID_PARAGRAPH');
    expect(result.parsedInput!.operationType).toBe('BRIDGE');
  });

  it('classifies AFTER_HEADING when last non-empty line before marker is a heading', async () => {
    const raw = `## My Section\n\n${MARKERS.CONTINUE}\n\n## Next Section\n\nContent here.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('AFTER_HEADING');
    expect(result.parsedInput!.operationType).toBe('FILL_SECTION');
  });

  it('classifies BEFORE_HEADING when text after marker starts with a heading', async () => {
    const raw = `Some intro text.\n\n${MARKERS.CONTINUE}\n\n## Next Section\n\nContent.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('BEFORE_HEADING');
    expect(result.parsedInput!.operationType).toBe('BRIDGE');
  });

  it('sets correct textBefore and textAfter for END_OF_TEXT', async () => {
    const text = 'Hello world.';
    const raw = `${text}${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.textBefore).toBe(text);
    expect(result.parsedInput!.textAfter).toBe('');
  });

  it('sets correct textBefore and textAfter for START_OF_TEXT', async () => {
    const text = 'Hello world.';
    const raw = `${MARKERS.CONTINUE}${text}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.textBefore).toBe('');
    expect(result.parsedInput!.textAfter).toBe(text);
  });

  it('sets totalCharsBefore and totalCharsAfter correctly', async () => {
    const before = 'Hello world.';
    const after = ' More text.';
    const raw = `${before}${MARKERS.CONTINUE}${after}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.totalCharsBefore).toBe(before.length);
    expect(result.parsedInput!.totalCharsAfter).toBe(after.length);
  });

  it('sets documentWordCount to 0 for EMPTY_DOCUMENT', async () => {
    const result = await inputParserNode(makeState(MARKERS.CONTINUE));
    expect(result.parsedInput!.documentWordCount).toBe(0);
  });

  it('sets documentWordCount for non-empty input', async () => {
    const raw = `one two three${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.documentWordCount).toBe(3);
  });

  it('sets isInsideSentence true when before-text has no sentence terminator', async () => {
    const raw = `The cat sat on the${MARKERS.CONTINUE} mat.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.isInsideSentence).toBe(true);
  });

  it('sets isInsideSentence false when before-text ends with period', async () => {
    const raw = `The cat sat on the mat. ${MARKERS.CONTINUE}More text.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.isInsideSentence).toBe(false);
  });

  it('sets markerType to CONTINUE for single CONTINUE marker', async () => {
    const raw = `Hello.${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerType).toBe('CONTINUE');
  });

  it('populates currentHeading when a heading precedes the marker', async () => {
    const raw = `## My Heading\n\nSome text.\n\n${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.currentHeading).toBe('My Heading');
  });

  it('populates nextHeading when a heading follows the marker', async () => {
    const raw = `Some text.\n\n${MARKERS.CONTINUE}\n\n## Next Heading\n\nMore.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.nextHeading).toBe('Next Heading');
  });
});

describe('inputParserNode — no marker present', () => {
  it('returns EMPTY_DOCUMENT + GENERATE when no marker found', async () => {
    const result = await inputParserNode(
      makeState('plain text without marker'),
    );
    expect(result.parsedInput!.markerPosition).toBe('EMPTY_DOCUMENT');
    expect(result.parsedInput!.operationType).toBe('GENERATE');
    expect(result.parsedInput!.documentWordCount).toBe(0);
  });
});

describe('inputParserNode — paired markers', () => {
  it('handles REWRITE region and sets operationType REWRITE_REGION', async () => {
    const raw = `Before text. ${MARKERS.REWRITE_START}old content${MARKERS.REWRITE_END} After text.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.operationType).toBe('REWRITE_REGION');
    expect(result.parsedInput!.markerPosition).toBe('REGION_SELECTED');
    expect(result.parsedInput!.selectedRegion).toBe('old content');
  });

  it('handles ENHANCE region and sets operationType ENHANCE_REGION', async () => {
    const raw = `Before. ${MARKERS.ENHANCE_START}text to enhance${MARKERS.ENHANCE_END} After.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.operationType).toBe('ENHANCE_REGION');
    expect(result.parsedInput!.markerPosition).toBe('REGION_SELECTED');
    expect(result.parsedInput!.selectedRegion).toBe('text to enhance');
  });

  it('handles DELETE region and sets operationType DELETE_REGION', async () => {
    const raw = `Keep this. ${MARKERS.DELETE_START}remove me${MARKERS.DELETE_END} Keep this too.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.operationType).toBe('DELETE_REGION');
    expect(result.parsedInput!.selectedRegion).toBe('remove me');
  });

  it('sets textBefore and textAfter correctly for paired markers', async () => {
    const raw = `Before. ${MARKERS.REWRITE_START}region${MARKERS.REWRITE_END} After.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.textBefore).toBe('Before. ');
    expect(result.parsedInput!.textAfter).toBe(' After.');
  });

  it('sets markerType to REWRITE_START for rewrite regions', async () => {
    const raw = `A. ${MARKERS.REWRITE_START}B${MARKERS.REWRITE_END} C.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerType).toBe('REWRITE_START');
  });
});

describe('inputParserNode — paired CONTINUE markers (inline instruction)', () => {
  it('extracts inline instruction from between two CONTINUE markers', async () => {
    const raw = `Hello world.${MARKERS.CONTINUE} add a greeting ${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.userInstruction).toBe('add a greeting');
  });

  it('classifies END_OF_TEXT when text before ends with period (Example 1)', async () => {
    const raw = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.${MARKERS.CONTINUE} ADD A SENTENCE OR FINISH THE SENTENCE ${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('END_OF_TEXT');
    expect(result.parsedInput!.operationType).toBe('CONTINUE');
    expect(result.userInstruction).toBe(
      'ADD A SENTENCE OR FINISH THE SENTENCE',
    );
  });

  it('classifies MID_SENTENCE when text before ends mid-word (Example 2)', async () => {
    const raw = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit${MARKERS.CONTINUE} ADD A SENTENCE OR FINISH THE SENTENCE ${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.markerPosition).toBe('MID_SENTENCE');
    expect(result.parsedInput!.operationType).toBe('CONTINUE');
    expect(result.userInstruction).toBe(
      'ADD A SENTENCE OR FINISH THE SENTENCE',
    );
  });

  it('strips the inline instruction from the document text', async () => {
    const raw = `Before text.${MARKERS.CONTINUE} instruction here ${MARKERS.CONTINUE} After text.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.textBefore).toBe('Before text.');
    expect(result.parsedInput!.textAfter).toBe(' After text.');
    expect(result.userInstruction).toBe('instruction here');
  });

  it('preserves textAfter when content follows the second marker', async () => {
    const raw = `Start.${MARKERS.CONTINUE} do something ${MARKERS.CONTINUE} End.`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.textAfter).toBe(' End.');
  });

  it('sets empty textAfter when nothing follows the second marker', async () => {
    const raw = `Hello world.${MARKERS.CONTINUE} finish this ${MARKERS.CONTINUE}`;
    const result = await inputParserNode(makeState(raw));
    expect(result.parsedInput!.textAfter).toBe('');
  });
});
