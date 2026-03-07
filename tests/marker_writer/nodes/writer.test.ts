import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.invoke = mockInvoke;
  }),
}));

import { writerNode } from '@/marker_writer/nodes/writer';
import type { WriterStateValue } from '@/marker_writer/state';
import type { ParsedInput } from '@/marker_writer/types';
import { ChatOpenAI } from '@langchain/openai';

function makeParsed(overrides: Partial<ParsedInput> = {}): ParsedInput {
  return {
    markerType: 'CONTINUE',
    markerPosition: 'END_OF_TEXT',
    operationType: 'CONTINUE',
    textBefore: 'Some existing text.',
    textAfter: '',
    selectedRegion: '',
    immediateBefore: 'Some existing text.',
    immediateAfter: '',
    lastSentenceBefore: 'Some existing text.',
    firstSentenceAfter: '',
    isInsideParagraph: false,
    isInsideSentence: false,
    isAfterHeading: false,
    isBeforeHeading: false,
    currentHeading: '',
    previousHeading: '',
    nextHeading: '',
    totalCharsBefore: 19,
    totalCharsAfter: 0,
    documentWordCount: 3,
    markerCharIndex: 19,
    markerLineNumber: 1,
    markerColumnNumber: 20,
    ...overrides,
  };
}

function makeState(
  parsedOverrides: Partial<ParsedInput> = {},
): WriterStateValue {
  return {
    parsedInput: makeParsed(parsedOverrides),
    writingPlan: {
      approach: 'direct continuation',
      topics: ['next steps'],
      transitionIn: 'naturally',
      transitionOut: 'smoothly',
      constraints: ['stay concise'],
      targetWords: 200,
    },
    styleProfile: {
      tone: 'conversational',
      avgSentenceLength: 15,
      paragraphStyle: 'short punchy',
      vocabulary: 'simple',
      pointOfView: 'third person',
      tense: 'present',
      notablePatterns: [],
    },
    userInstruction: '',
  } as unknown as WriterStateValue;
}

describe('writerNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({
      content: 'Generated continuation text for testing.',
    });
  });

  it('calls the LLM and returns generatedText', async () => {
    const state = makeState();
    const result = await writerNode(state);
    expect(ChatOpenAI).toHaveBeenCalled();
    expect(result.generatedText).toBe(
      'Generated continuation text for testing.',
    );
  });

  it('uses a writer model with temperature > 0', async () => {
    const state = makeState();
    await writerNode(state);
    const callArgs = (ChatOpenAI as any).mock.calls[0][0];
    expect(callArgs.temperature).toBeGreaterThan(0);
  });

  it('returns a non-empty string for generatedText', async () => {
    const state = makeState();
    const result = await writerNode(state);
    expect(typeof result.generatedText).toBe('string');
    expect(result.generatedText!.length).toBeGreaterThan(0);
  });

  it('sends position-specific instructions for END_OF_TEXT', async () => {
    const state = makeState({ markerPosition: 'END_OF_TEXT' });
    await writerNode(state);

    const systemPrompt = mockInvoke.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('Continue from the end of the text');
  });

  it('sends position-specific instructions for START_OF_TEXT', async () => {
    const state = makeState({
      markerPosition: 'START_OF_TEXT',
      textBefore: '',
      immediateAfter: 'The existing text starts here.',
    });
    await writerNode(state);

    const systemPrompt = mockInvoke.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('LEADS INTO the existing text');
  });

  it('sends position-specific instructions for EMPTY_DOCUMENT', async () => {
    const state = {
      ...makeState({ markerPosition: 'EMPTY_DOCUMENT' }),
      userInstruction: 'write about coffee',
    } as unknown as WriterStateValue;
    await writerNode(state);

    const systemPrompt = mockInvoke.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('blank document');
  });

  it('sends position-specific instructions for MID_SENTENCE', async () => {
    const state = makeState({
      markerPosition: 'MID_SENTENCE',
      lastSentenceBefore: 'The cat sat on the',
    });
    await writerNode(state);

    const systemPrompt = mockInvoke.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('mid-sentence');
  });

  it('sends position-specific instructions for AFTER_HEADING', async () => {
    const state = makeState({
      markerPosition: 'AFTER_HEADING',
      currentHeading: 'My Section',
    });
    await writerNode(state);

    const systemPrompt = mockInvoke.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('My Section');
  });

  it('includes style profile fields in system prompt', async () => {
    const state = makeState();
    await writerNode(state);

    const systemPrompt = mockInvoke.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('conversational');
    expect(systemPrompt).toContain('third person');
  });

  it('includes plan fields in system prompt', async () => {
    const state = makeState();
    await writerNode(state);

    const systemPrompt = mockInvoke.mock.calls[0][0][0].content;
    expect(systemPrompt).toContain('direct continuation');
    expect(systemPrompt).toContain('200');
  });
});
