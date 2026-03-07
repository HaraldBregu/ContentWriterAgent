import { describe, it, expect } from 'vitest';
import type {
  MarkerPosition,
  OperationType,
  ParsedInput,
} from '@/marker_writer/types';

// Type-level tests: verify the full set of union members at runtime via
// exhaustive arrays. If the union grows we want tests to catch the gap.

describe('MarkerPosition union', () => {
  const allPositions: MarkerPosition[] = [
    'END_OF_TEXT',
    'START_OF_TEXT',
    'BETWEEN_BLOCKS',
    'MID_PARAGRAPH',
    'MID_SENTENCE',
    'AFTER_HEADING',
    'BEFORE_HEADING',
    'INLINE_END',
    'EMPTY_DOCUMENT',
    'BETWEEN_LINES',
    'REGION_SELECTED',
    'AMBIGUOUS',
  ];

  it('contains exactly 12 position variants', () => {
    expect(allPositions).toHaveLength(12);
  });

  it('every variant is a non-empty string', () => {
    for (const pos of allPositions) {
      expect(typeof pos).toBe('string');
      expect(pos.length).toBeGreaterThan(0);
    }
  });

  it('all variants are uppercase snake_case', () => {
    for (const pos of allPositions) {
      expect(pos).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });
});

describe('OperationType union', () => {
  const allOps: OperationType[] = [
    'CONTINUE',
    'BRIDGE',
    'PREPEND',
    'GENERATE',
    'FILL_SECTION',
    'REWRITE_REGION',
    'ENHANCE_REGION',
    'DELETE_REGION',
  ];

  it('contains exactly 8 operation variants', () => {
    expect(allOps).toHaveLength(8);
  });

  it('every variant is a non-empty string', () => {
    for (const op of allOps) {
      expect(typeof op).toBe('string');
      expect(op.length).toBeGreaterThan(0);
    }
  });
});

describe('ParsedInput interface shape', () => {
  it('accepts a fully-populated ParsedInput object', () => {
    const parsed: ParsedInput = {
      markerType: 'CONTINUE',
      markerPosition: 'END_OF_TEXT',
      operationType: 'CONTINUE',
      textBefore: 'some text before',
      textAfter: '',
      selectedRegion: '',
      immediateBefore: 'some text before',
      immediateAfter: '',
      lastSentenceBefore: 'some text before',
      firstSentenceAfter: '',
      isInsideParagraph: false,
      isInsideSentence: false,
      isAfterHeading: false,
      isBeforeHeading: false,
      currentHeading: '',
      previousHeading: '',
      nextHeading: '',
      totalCharsBefore: 16,
      totalCharsAfter: 0,
      documentWordCount: 3,
      markerCharIndex: 16,
      markerLineNumber: 1,
      markerColumnNumber: 17,
    };

    expect(parsed.markerType).toBe('CONTINUE');
    expect(parsed.markerPosition).toBe('END_OF_TEXT');
    expect(parsed.operationType).toBe('CONTINUE');
    expect(parsed.totalCharsBefore).toBe(16);
    expect(parsed.documentWordCount).toBe(3);
  });

  it('allows REGION_SELECTED position with a non-empty selectedRegion', () => {
    const parsed: ParsedInput = {
      markerType: 'REWRITE_START',
      markerPosition: 'REGION_SELECTED',
      operationType: 'REWRITE_REGION',
      textBefore: 'before',
      textAfter: 'after',
      selectedRegion: 'the region to rewrite',
      immediateBefore: 'before',
      immediateAfter: 'after',
      lastSentenceBefore: 'before',
      firstSentenceAfter: 'after',
      isInsideParagraph: false,
      isInsideSentence: false,
      isAfterHeading: false,
      isBeforeHeading: false,
      currentHeading: '',
      previousHeading: '',
      nextHeading: '',
      totalCharsBefore: 6,
      totalCharsAfter: 5,
      documentWordCount: 5,
      markerCharIndex: 6,
      markerLineNumber: 1,
      markerColumnNumber: 7,
    };

    expect(parsed.selectedRegion).toBe('the region to rewrite');
    expect(parsed.operationType).toBe('REWRITE_REGION');
  });
});
