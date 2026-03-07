import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.invoke = mockInvoke;
  }),
}));

import { styleAnalyzerNode } from '@/marker_writer/nodes/style-analyzer';
import type { WriterStateValue } from '@/marker_writer/state';
import type { ParsedInput } from '@/marker_writer/types';
import { ChatOpenAI } from '@langchain/openai';

function makeParsed(overrides: Partial<ParsedInput> = {}): ParsedInput {
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
  parsedOverrides: Partial<ParsedInput> = {},
): WriterStateValue {
  return {
    parsedInput: makeParsed(parsedOverrides),
  } as unknown as WriterStateValue;
}

const defaultStyleProfile = {
  tone: 'formal',
  avgSentenceLength: 20,
  paragraphStyle: 'long flowing',
  vocabulary: 'advanced',
  pointOfView: 'third person',
  tense: 'past',
  notablePatterns: ['passive voice', 'complex clauses'],
};

describe('styleAnalyzerNode — short text fast path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a neutral default profile when documentWordCount < 50', async () => {
    const state = makeState({ documentWordCount: 10 });
    const result = await styleAnalyzerNode(state);
    expect(result.styleProfile).toBeDefined();
    expect(result.styleProfile!.tone).toBe('neutral');
    expect(result.styleProfile!.avgSentenceLength).toBe(15);
    expect(result.styleProfile!.paragraphStyle).toBe('mixed');
    expect(result.styleProfile!.vocabulary).toBe('simple');
    expect(result.styleProfile!.pointOfView).toBe('third person');
    expect(result.styleProfile!.tense).toBe('present');
    expect(result.styleProfile!.notablePatterns).toEqual([]);
  });

  it('skips LLM for short text', async () => {
    const state = makeState({ documentWordCount: 49 });
    await styleAnalyzerNode(state);
    expect(ChatOpenAI).not.toHaveBeenCalled();
  });

  it('returns a default profile with 0 word count', async () => {
    const state = makeState({ documentWordCount: 0 });
    const result = await styleAnalyzerNode(state);
    expect(result.styleProfile!.tone).toBe('neutral');
  });
});

describe('styleAnalyzerNode — LLM path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      content: JSON.stringify(defaultStyleProfile),
    });
  });

  it('calls LLM when documentWordCount >= 50', async () => {
    const state = makeState({
      documentWordCount: 100,
      immediateBefore:
        'A longer text sample with enough words to trigger analysis.',
      immediateAfter: '',
    });
    await styleAnalyzerNode(state);
    expect(ChatOpenAI).toHaveBeenCalled();
  });

  it('returns the parsed style profile from LLM response', async () => {
    const state = makeState({
      documentWordCount: 100,
      immediateBefore: 'Some text long enough for style analysis.',
      immediateAfter: '',
    });
    const result = await styleAnalyzerNode(state);
    expect(result.styleProfile!.tone).toBe('formal');
    expect(result.styleProfile!.avgSentenceLength).toBe(20);
    expect(result.styleProfile!.vocabulary).toBe('advanced');
    expect(result.styleProfile!.pointOfView).toBe('third person');
    expect(result.styleProfile!.tense).toBe('past');
    expect(result.styleProfile!.notablePatterns).toContain('passive voice');
  });

  it('prefers immediateBefore as sample text when longer than immediateAfter', async () => {
    const state = makeState({
      documentWordCount: 100,
      immediateBefore: 'A long before text sample with many characters to use.',
      immediateAfter: 'Short after.',
    });
    await styleAnalyzerNode(state);
    const userMessage = mockInvoke.mock.calls[0][0][1].content;
    expect(userMessage).toBe(
      'A long before text sample with many characters to use.',
    );
  });
});
