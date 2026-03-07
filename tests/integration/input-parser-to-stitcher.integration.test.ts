import { describe, it, expect } from 'vitest';
import { inputParserNode } from '@/marker_writer/nodes/input-parser';
import { stitcherNode } from '@/marker_writer/nodes/stitcher';
import { MARKERS } from '@/marker_writer/markers';
import type { WriterStateValue } from '@/marker_writer/state';

const M = MARKERS.CONTINUE;
const RS = MARKERS.REWRITE_START;
const RE = MARKERS.REWRITE_END;
const ES = MARKERS.ENHANCE_START;
const EE = MARKERS.ENHANCE_END;
const DS = MARKERS.DELETE_START;
const DE = MARKERS.DELETE_END;

function makeParserState(
  rawInput: string,
  userInstruction = '',
): WriterStateValue {
  return { rawInput, userInstruction } as unknown as WriterStateValue;
}

function makeStitcherState(
  parsedInput: any,
  generatedText: string,
): WriterStateValue {
  return { parsedInput, generatedText } as unknown as WriterStateValue;
}

describe('Input Parser → Stitcher: END_OF_TEXT', () => {
  it('appends generated text after sentence-ending punctuation', async () => {
    const raw = `The sun set slowly.${M}`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Stars began to appear.'),
    );

    expect(result.finalDocument).toBe(
      'The sun set slowly. Stars began to appear.',
    );
  });

  it('appends directly after double newline without extra separator', async () => {
    const raw = `End of paragraph.\n\n${M}`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'New paragraph begins.'),
    );

    expect(result.finalDocument).toBe(
      'End of paragraph.\n\nNew paragraph begins.',
    );
  });

  it('appends directly for mid-sentence end-of-text', async () => {
    const raw = `The cat sat on the${M}`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, ' mat and purred.'),
    );

    expect(result.finalDocument).toBe('The cat sat on the mat and purred.');
  });
});

describe('Input Parser → Stitcher: BETWEEN_BLOCKS', () => {
  it('inserts with double newline separators', async () => {
    const raw = `First block.\n\n${M}\n\nSecond block.`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Middle block.'),
    );

    expect(result.finalDocument).toBe(
      'First block.\n\nMiddle block.\n\nSecond block.',
    );
  });
});

describe('Input Parser → Stitcher: MID_PARAGRAPH', () => {
  it('inserts between sentences with space separators', async () => {
    const raw = `First sentence. ${M}Third sentence.`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Second sentence.'),
    );

    expect(result.finalDocument).toBe(
      'First sentence. Second sentence. Third sentence.',
    );
  });
});

describe('Input Parser → Stitcher: MID_SENTENCE', () => {
  it('inserts mid-sentence content with context-aware separators', async () => {
    const raw = `The most important${M} factor is time.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.isInsideSentence).toBe(true);

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, ' and often overlooked'),
    );

    expect(result.finalDocument).toContain('The most important');
    expect(result.finalDocument).toContain('and often overlooked');
    expect(result.finalDocument).toContain('factor is time.');
  });
});

describe('Input Parser → Stitcher: AFTER_HEADING', () => {
  it('fills section content with proper spacing', async () => {
    const raw = `## Introduction\n\n${M}\n\n## Methods\n\nMethods content.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.operationType).toBe('FILL_SECTION');
    expect(parsed.parsedInput!.currentHeading).toBe('Introduction');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'This paper explores the topic.'),
    );

    expect(result.finalDocument).toContain('## Introduction');
    expect(result.finalDocument).toContain('This paper explores the topic.');
    expect(result.finalDocument).toContain('## Methods');
    expect(result.finalDocument).toContain('Methods content.');
  });

  it('fills section at end of document', async () => {
    const raw = `## Only Section\n${M}`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Section content here.'),
    );

    expect(result.finalDocument).toContain('## Only Section');
    expect(result.finalDocument).toContain('Section content here.');
  });
});

describe('Input Parser → Stitcher: START_OF_TEXT', () => {
  it('prepends with double newline separator', async () => {
    const raw = `${M}Existing content starts here.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.operationType).toBe('PREPEND');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Introduction paragraph.'),
    );

    expect(result.finalDocument).toBe(
      'Introduction paragraph.\n\nExisting content starts here.',
    );
  });
});

describe('Input Parser → Stitcher: EMPTY_DOCUMENT', () => {
  it('returns only the generated text', async () => {
    const parsed = await inputParserNode(makeParserState(M));

    expect(parsed.parsedInput!.operationType).toBe('GENERATE');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Brand new content.'),
    );

    expect(result.finalDocument).toBe('Brand new content.');
  });

  it('handles no marker as GENERATE', async () => {
    const parsed = await inputParserNode(makeParserState('no markers here'));

    expect(parsed.parsedInput!.operationType).toBe('GENERATE');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Generated from scratch.'),
    );

    expect(result.finalDocument).toBe('Generated from scratch.');
  });
});

describe('Input Parser → Stitcher: BEFORE_HEADING', () => {
  it('bridges text to next heading', async () => {
    const raw = `Some intro text.\n\n${M}\n\n## Next Section\n\nSection content.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.operationType).toBe('BRIDGE');
    expect(parsed.parsedInput!.nextHeading).toBe('Next Section');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Transitional paragraph.'),
    );

    expect(result.finalDocument).toContain('Some intro text.');
    expect(result.finalDocument).toContain('Transitional paragraph.');
    expect(result.finalDocument).toContain('## Next Section');
  });
});

describe('Input Parser → Stitcher: BETWEEN_LINES', () => {
  it('inserts with single newline separators', async () => {
    const raw = `Line one.\n${M}\nLine two.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.markerPosition).toBe('BETWEEN_LINES');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Inserted line.'),
    );

    expect(result.finalDocument).toBe('Line one.\nInserted line.\nLine two.');
  });
});

describe('Input Parser → Stitcher: paired markers', () => {
  it('handles REWRITE_REGION through parser to stitcher', async () => {
    const raw = `Before. ${RS}old text${RE} After.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.operationType).toBe('REWRITE_REGION');
    expect(parsed.parsedInput!.selectedRegion).toBe('old text');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'new text'),
    );

    // Default fallback: textBefore + generated + textAfter
    expect(result.finalDocument).toBe('Before. new text After.');
  });

  it('handles ENHANCE_REGION through parser to stitcher', async () => {
    const raw = `Start. ${ES}enhance this${EE} End.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.operationType).toBe('ENHANCE_REGION');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'enhanced version of this'),
    );

    expect(result.finalDocument).toBe('Start. enhanced version of this End.');
  });

  it('handles DELETE_REGION through parser to stitcher', async () => {
    const raw = `Keep this. ${DS}remove me${DE} Keep this too.`;
    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.operationType).toBe('DELETE_REGION');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, ''),
    );

    expect(result.finalDocument).toBe('Keep this.  Keep this too.');
  });
});

describe('Input Parser → Stitcher: changeDescription', () => {
  it('includes position, operation, and word count', async () => {
    const raw = `Hello world.${M}`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Three more words.'),
    );

    expect(result.changeDescription).toContain('END_OF_TEXT');
    expect(result.changeDescription).toContain('CONTINUE');
    expect(result.changeDescription).toContain('Added ~3 words');
  });

  it('notes mid-sentence completion', async () => {
    const raw = `The cat sat on${M}`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, ' the mat.'),
    );

    expect(result.changeDescription).toContain('Completed mid-sentence');
  });

  it('notes bridge operation', async () => {
    const raw = `Block A.\n\n${M}\n\nBlock B.`;
    const parsed = await inputParserNode(makeParserState(raw));

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Transition.'),
    );

    expect(result.changeDescription).toContain('Bridged to existing text');
  });
});

describe('Input Parser → Stitcher: complex documents', () => {
  it('handles a multi-section document with heading fill', async () => {
    const raw = [
      '# Title',
      '',
      'Some intro text.',
      '',
      '## Section One',
      '',
      'Section one content.',
      '',
      `## Section Two`,
      '',
      M,
      '',
      '## Section Three',
      '',
      'Section three content.',
    ].join('\n');

    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.markerPosition).toBe('AFTER_HEADING');
    expect(parsed.parsedInput!.currentHeading).toBe('Section Two');
    expect(parsed.parsedInput!.nextHeading).toBe('Section Three');

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Section two content goes here.'),
    );

    expect(result.finalDocument).toContain('# Title');
    expect(result.finalDocument).toContain('Section one content.');
    expect(result.finalDocument).toContain('Section two content goes here.');
    expect(result.finalDocument).toContain('## Section Three');
    expect(result.finalDocument).toContain('Section three content.');
  });

  it('handles continuation at the very end of a long document', async () => {
    const paragraphs = Array(5)
      .fill('Lorem ipsum dolor sit amet, consectetur adipiscing elit.')
      .join('\n\n');
    const raw = `${paragraphs}${M}`;

    const parsed = await inputParserNode(makeParserState(raw));

    expect(parsed.parsedInput!.markerPosition).toBe('END_OF_TEXT');
    expect(parsed.parsedInput!.documentWordCount).toBeGreaterThan(0);

    const result = await stitcherNode(
      makeStitcherState(parsed.parsedInput, 'Final addition.'),
    );

    expect(result.finalDocument).toContain(paragraphs);
    expect(result.finalDocument).toContain('Final addition.');
  });
});
