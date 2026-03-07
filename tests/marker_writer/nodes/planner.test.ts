import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.invoke = mockInvoke;
  }),
}));

import { plannerNode } from '@/marker_writer/nodes/planner';
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
    styleProfile: {
      tone: 'neutral',
      avgSentenceLength: 15,
      paragraphStyle: 'mixed',
      vocabulary: 'simple',
      pointOfView: 'third person',
      tense: 'present',
      notablePatterns: [],
    },
    intentAnalysis: {
      contentType: 'BLOG_POST',
      writingIntent: 'inform',
      topic: 'coffee',
      audience: 'general',
      desiredTone: 'conversational',
      desiredLength: '~200 words',
      keyMessage: 'coffee is great',
      constraints: [],
    },
  } as unknown as WriterStateValue;
}

const defaultPlan = {
  approach: 'start with context',
  topics: ['background', 'current state', 'future outlook'],
  transitionIn: 'Building on the previous point',
  transitionOut: 'This sets up the next section',
  constraints: ['avoid repetition', 'stay on topic'],
  targetWords: 300,
};

describe('plannerNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue({ content: JSON.stringify(defaultPlan) });
  });

  it('always calls the LLM', async () => {
    const state = makeState();
    await plannerNode(state);
    expect(ChatOpenAI).toHaveBeenCalled();
  });

  it('returns a writingPlan with the expected shape', async () => {
    const state = makeState();
    const result = await plannerNode(state);
    expect(result.writingPlan).toBeDefined();
    expect(result.writingPlan!.approach).toBe('start with context');
    expect(result.writingPlan!.topics).toEqual([
      'background',
      'current state',
      'future outlook',
    ]);
    expect(result.writingPlan!.transitionIn).toBe(
      'Building on the previous point',
    );
    expect(result.writingPlan!.transitionOut).toBe(
      'This sets up the next section',
    );
    expect(result.writingPlan!.constraints).toContain('avoid repetition');
    expect(result.writingPlan!.targetWords).toBe(300);
  });

  it('uses a ChatOpenAI with temperature 0 for deterministic planning', async () => {
    const state = makeState();
    await plannerNode(state);
    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    );
  });

  it('strips markdown code fences from LLM response before parsing', async () => {
    mockInvoke.mockResolvedValue({
      content: '```json\n' + JSON.stringify(defaultPlan) + '\n```',
    });

    const state = makeState();
    const result = await plannerNode(state);
    expect(result.writingPlan!.approach).toBe('start with context');
  });
});
