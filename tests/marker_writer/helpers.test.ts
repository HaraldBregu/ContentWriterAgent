import { describe, it, expect } from 'vitest';
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
import { MARKERS } from '@/marker_writer/markers';

describe('stripAllMarkers', () => {
  it('removes a single CONTINUE marker', () => {
    expect(stripAllMarkers(`hello${MARKERS.CONTINUE}world`)).toBe('helloworld');
  });

  it('removes all marker types from a string', () => {
    const text = `before${MARKERS.REWRITE_START}middle${MARKERS.REWRITE_END}after`;
    expect(stripAllMarkers(text)).toBe('beforemiddleafter');
  });

  it('returns the original string unchanged when no markers are present', () => {
    const plain = 'plain text without markers';
    expect(stripAllMarkers(plain)).toBe(plain);
  });

  it('handles an empty string', () => {
    expect(stripAllMarkers('')).toBe('');
  });

  it('handles a string that is only markers', () => {
    const onlyMarker = MARKERS.CONTINUE;
    expect(stripAllMarkers(onlyMarker)).toBe('');
  });

  it('removes multiple occurrences of the same marker', () => {
    const text = `a${MARKERS.CONTINUE}b${MARKERS.CONTINUE}c`;
    expect(stripAllMarkers(text)).toBe('abc');
  });
});

describe('getCleanIndex', () => {
  it('returns the same index when no markers precede the position', () => {
    const text = `hello${MARKERS.CONTINUE}world`;
    expect(getCleanIndex(text, 5)).toBe(5);
  });

  it('skips the marker character when counting to a position after the marker', () => {
    const text = `ab${MARKERS.CONTINUE}cd`;
    // markedIndex = 4 (position of 'c' in marked text)
    // before that: 'a','b', marker (skipped), 'c' is at clean index 3
    expect(getCleanIndex(text, 4)).toBe(3);
  });

  it('returns 0 for index 0', () => {
    const text = `${MARKERS.CONTINUE}hello`;
    expect(getCleanIndex(text, 0)).toBe(0);
  });

  it('counts correctly with multiple markers', () => {
    const text = `a${MARKERS.CONTINUE}b${MARKERS.CONTINUE}c`;
    // position 5 in marked text (after two markers): 'c'
    expect(getCleanIndex(text, 5)).toBe(3);
  });
});

describe('extractLastSentence', () => {
  it('returns the last sentence from multi-sentence text', () => {
    const text = 'First sentence. Second sentence. Third sentence.';
    expect(extractLastSentence(text)).toBe('Third sentence.');
  });

  it('returns the entire string when there is only one sentence', () => {
    expect(extractLastSentence('Only one.')).toBe('Only one.');
  });

  it('returns an empty string for an empty input', () => {
    expect(extractLastSentence('')).toBe('');
  });

  it('handles whitespace-only input', () => {
    expect(extractLastSentence('   ')).toBe('');
  });

  it('handles exclamation and question marks as sentence terminators', () => {
    const text = 'Really? Yes! Absolutely.';
    expect(extractLastSentence(text)).toBe('Absolutely.');
  });

  it('trims trailing whitespace before splitting', () => {
    const text = 'First. Second.   ';
    expect(extractLastSentence(text)).toBe('Second.');
  });
});

describe('extractFirstSentence', () => {
  it('returns the first sentence from multi-sentence text', () => {
    const text = 'First sentence. Second sentence.';
    expect(extractFirstSentence(text)).toBe('First sentence.');
  });

  it('returns the entire string when it contains no sentence terminator', () => {
    const text = 'No period here at all so we take up to 200 chars';
    expect(extractFirstSentence(text)).toBe(text);
  });

  it('returns an empty string for an empty input', () => {
    expect(extractFirstSentence('')).toBe('');
  });

  it('trims leading whitespace before processing', () => {
    expect(extractFirstSentence('   Hello. World.')).toBe('Hello.');
  });

  it('handles question and exclamation terminators', () => {
    expect(extractFirstSentence('Is it? Yes.')).toBe('Is it?');
  });

  it('caps the result at 200 characters when there is no terminator', () => {
    const long = 'a'.repeat(300);
    expect(extractFirstSentence(long)).toHaveLength(200);
  });
});

describe('findCurrentHeading', () => {
  it('returns the text of the last heading in textBefore', () => {
    const text = '## First\n\nParagraph.\n\n## Second\n\nMore text.';
    expect(findCurrentHeading(text)).toBe('Second');
  });

  it('returns an empty string when no heading is present', () => {
    expect(findCurrentHeading('Just plain text.')).toBe('');
  });

  it('strips the # prefix and whitespace', () => {
    expect(findCurrentHeading('# My Heading\nsome text')).toBe('My Heading');
  });

  it('handles multiple heading levels', () => {
    const text = '# H1\n\n## H2\n\n### H3\n';
    expect(findCurrentHeading(text)).toBe('H3');
  });
});

describe('findPreviousHeading', () => {
  it('returns the second-to-last heading', () => {
    const text = '## First\n\nText.\n\n## Second\n\nMore.';
    expect(findPreviousHeading(text)).toBe('First');
  });

  it('returns an empty string when fewer than two headings exist', () => {
    expect(findPreviousHeading('## Only One\n\nText.')).toBe('');
  });

  it('returns an empty string for text with no headings', () => {
    expect(findPreviousHeading('plain text')).toBe('');
  });
});

describe('findNextHeading', () => {
  it('returns the first heading in textAfter', () => {
    const text = 'Some text.\n\n## Next Section\n\nMore.';
    expect(findNextHeading(text)).toBe('Next Section');
  });

  it('returns an empty string when no heading follows', () => {
    expect(findNextHeading('Just text, no headings.')).toBe('');
  });

  it('returns the very first heading even when there are multiple', () => {
    const text = 'text\n## First\n\n## Second\n';
    expect(findNextHeading(text)).toBe('First');
  });
});

describe('countWords', () => {
  it('counts words in a normal sentence', () => {
    expect(countWords('The quick brown fox')).toBe(4);
  });

  it('returns 0 for an empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only input', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('a  b   c')).toBe(3);
  });

  it('handles newlines as word separators', () => {
    expect(countWords('line one\nline two')).toBe(4);
  });

  it('handles a single word', () => {
    expect(countWords('hello')).toBe(1);
  });
});

describe('getLineNumber', () => {
  it('returns 1 for the start of single-line text', () => {
    expect(getLineNumber('hello world', 0)).toBe(1);
  });

  it('returns 2 for a position on the second line', () => {
    const text = 'line one\nline two';
    expect(getLineNumber(text, 9)).toBe(2);
  });

  it('returns 3 for a position on the third line', () => {
    const text = 'a\nb\nc';
    expect(getLineNumber(text, 4)).toBe(3);
  });

  it('returns 1 when there are no preceding newlines', () => {
    expect(getLineNumber('no newlines here', 5)).toBe(1);
  });
});

describe('getColumnNumber', () => {
  it('returns 1 for the start of the text', () => {
    expect(getColumnNumber('hello', 0)).toBe(1);
  });

  it('returns the column within the current line', () => {
    const text = 'line one\nline two';
    // 'line two' starts at index 9; position 12 is 'd' which is column 4
    expect(getColumnNumber(text, 12)).toBe(4);
  });

  it('handles position immediately after a newline as column 1', () => {
    const text = 'abc\nxyz';
    expect(getColumnNumber(text, 4)).toBe(1);
  });
});
