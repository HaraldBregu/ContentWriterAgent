import { describe, it, expect } from 'vitest';
import { stitcherNode } from '@/marker_writer/nodes/stitcher';
import type { WriterStateValue } from '@/marker_writer/state';
import type { ParsedInput } from '@/marker_writer/types';

function makeParsed(overrides: Partial<ParsedInput>): ParsedInput {
  return {
    markerType: 'CONTINUE',
    markerPosition: 'END_OF_TEXT',
    operationType: 'CONTINUE',
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
    markerLineNumber: 1,
    markerColumnNumber: 1,
    ...overrides,
  };
}

function makeState(
  parsedOverrides: Partial<ParsedInput>,
  generatedText: string,
): WriterStateValue {
  return {
    parsedInput: makeParsed(parsedOverrides),
    generatedText,
  } as unknown as WriterStateValue;
}

describe('stitcherNode — CONTINUE operation', () => {
  it('appends generated text directly when inside a sentence', async () => {
    const state = makeState(
      {
        operationType: 'CONTINUE',
        markerPosition: 'END_OF_TEXT',
        textBefore: 'The cat sat on the',
        textAfter: '',
        isInsideSentence: true,
      },
      ' mat.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('The cat sat on the mat.');
  });

  it('adds a space separator when before-text ends with a sentence period', async () => {
    const state = makeState(
      {
        operationType: 'CONTINUE',
        markerPosition: 'END_OF_TEXT',
        textBefore: 'First sentence.',
        textAfter: '',
        isInsideSentence: false,
      },
      'Second sentence.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('First sentence. Second sentence.');
  });

  it('uses no separator when before-text ends with double newline', async () => {
    const state = makeState(
      {
        operationType: 'CONTINUE',
        markerPosition: 'END_OF_TEXT',
        textBefore: 'A paragraph.\n\n',
        textAfter: '',
        isInsideSentence: false,
      },
      'New paragraph.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('A paragraph.\n\nNew paragraph.');
  });
});

describe('stitcherNode — FILL_SECTION operation', () => {
  it('inserts generated text after textBefore with double newline', async () => {
    const state = makeState(
      {
        operationType: 'FILL_SECTION',
        markerPosition: 'AFTER_HEADING',
        textBefore: '## My Section',
        textAfter: '',
        isInsideSentence: false,
      },
      'Section content here.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('## My Section\n\nSection content here.');
  });

  it('preserves textAfter content when present', async () => {
    const state = makeState(
      {
        operationType: 'FILL_SECTION',
        markerPosition: 'AFTER_HEADING',
        textBefore: '## Section A',
        textAfter: '## Section B\n\nB content.',
        isInsideSentence: false,
      },
      'A content.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toContain('A content.');
    expect(result.finalDocument).toContain('## Section B');
  });
});

describe('stitcherNode — BRIDGE operation', () => {
  it('wraps generated text with double newlines for BETWEEN_BLOCKS', async () => {
    const state = makeState(
      {
        operationType: 'BRIDGE',
        markerPosition: 'BETWEEN_BLOCKS',
        textBefore: 'First block.',
        textAfter: 'Second block.',
        isInsideSentence: false,
      },
      'Bridging paragraph.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe(
      'First block.\n\nBridging paragraph.\n\nSecond block.',
    );
  });

  it('adds single newlines for BETWEEN_LINES', async () => {
    const state = makeState(
      {
        operationType: 'BRIDGE',
        markerPosition: 'BETWEEN_LINES',
        textBefore: 'Line one.',
        textAfter: 'Line two.',
        isInsideSentence: false,
      },
      'Inserted line.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('Line one.\nInserted line.\nLine two.');
  });

  it('adds space separators for MID_PARAGRAPH when not inside sentence', async () => {
    const state = makeState(
      {
        operationType: 'BRIDGE',
        markerPosition: 'MID_PARAGRAPH',
        textBefore: 'Sentence one.',
        textAfter: 'Sentence three.',
        isInsideSentence: false,
      },
      'Sentence two.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe(
      'Sentence one. Sentence two. Sentence three.',
    );
  });

  it('uses no left separator for MID_SENTENCE when inside sentence', async () => {
    const state = makeState(
      {
        operationType: 'BRIDGE',
        markerPosition: 'MID_SENTENCE',
        textBefore: 'The cat sat on the',
        textAfter: 'mat.',
        isInsideSentence: true,
      },
      ' comfortable',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('The cat sat on the comfortable mat.');
  });
});

describe('stitcherNode — PREPEND operation', () => {
  it('prepends generated text before textAfter with double newline', async () => {
    const state = makeState(
      {
        operationType: 'PREPEND',
        markerPosition: 'START_OF_TEXT',
        textBefore: '',
        textAfter: 'The existing document content.',
        isInsideSentence: false,
      },
      'Introduction paragraph.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe(
      'Introduction paragraph.\n\nThe existing document content.',
    );
  });
});

describe('stitcherNode — GENERATE operation', () => {
  it('returns only the generated text', async () => {
    const state = makeState(
      {
        operationType: 'GENERATE',
        markerPosition: 'EMPTY_DOCUMENT',
        textBefore: '',
        textAfter: '',
        isInsideSentence: false,
      },
      'Freshly generated content.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('Freshly generated content.');
  });
});

describe('stitcherNode — changeDescription', () => {
  it('always returns a non-empty changeDescription', async () => {
    const state = makeState(
      {
        operationType: 'CONTINUE',
        markerPosition: 'END_OF_TEXT',
        textBefore: 'Hello.',
        textAfter: '',
        isInsideSentence: false,
        markerLineNumber: 1,
        markerColumnNumber: 6,
      },
      ' World.',
    );
    const result = await stitcherNode(state);
    expect(typeof result.changeDescription).toBe('string');
    expect(result.changeDescription!.length).toBeGreaterThan(0);
  });

  it('includes the position and operation in changeDescription', async () => {
    const state = makeState(
      {
        operationType: 'CONTINUE',
        markerPosition: 'END_OF_TEXT',
        textBefore: 'Hello.',
        textAfter: '',
        isInsideSentence: false,
        markerLineNumber: 1,
        markerColumnNumber: 6,
      },
      ' World.',
    );
    const result = await stitcherNode(state);
    expect(result.changeDescription).toContain('END_OF_TEXT');
    expect(result.changeDescription).toContain('CONTINUE');
  });

  it('mentions mid-sentence completion when isInsideSentence is true', async () => {
    const state = makeState(
      {
        operationType: 'CONTINUE',
        markerPosition: 'MID_SENTENCE',
        textBefore: 'The cat',
        textAfter: '',
        isInsideSentence: true,
        markerLineNumber: 1,
        markerColumnNumber: 7,
      },
      ' sat.',
    );
    const result = await stitcherNode(state);
    expect(result.changeDescription).toContain('Completed mid-sentence');
  });

  it('mentions bridge when operationType is BRIDGE', async () => {
    const state = makeState(
      {
        operationType: 'BRIDGE',
        markerPosition: 'BETWEEN_BLOCKS',
        textBefore: 'A.',
        textAfter: 'B.',
        isInsideSentence: false,
        markerLineNumber: 1,
        markerColumnNumber: 2,
      },
      'Bridging.',
    );
    const result = await stitcherNode(state);
    expect(result.changeDescription).toContain('Bridged to existing text');
  });
});

describe('stitcherNode — default fallback', () => {
  it('concatenates textBefore + generated + textAfter for unrecognised operation', async () => {
    const state = makeState(
      {
        operationType: 'REWRITE_REGION',
        markerPosition: 'REGION_SELECTED',
        textBefore: 'Before.',
        textAfter: 'After.',
        isInsideSentence: false,
      },
      'Rewritten.',
    );
    const result = await stitcherNode(state);
    expect(result.finalDocument).toBe('Before.Rewritten.After.');
  });
});
