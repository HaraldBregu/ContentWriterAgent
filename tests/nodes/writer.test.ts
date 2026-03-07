import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStream = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.stream = mockStream;
  }),
}));

import { writerNode } from '@/nodes/writer';
import type { WritingStateValue } from '@/state';
import { ChatOpenAI } from '@langchain/openai';

function makeState(
  overrides: Partial<WritingStateValue> = {},
): WritingStateValue {
  return {
    inputText: 'The old lighthouse keeper climbed the stairs.',
    continuation: '',
    formattedContinuation: '',
    evaluationScore: 0,
    evaluationFeedback: '',
    passed: false,
    iteration: 0,
    maxIterations: 3,
    history: [],
    ...overrides,
  };
}

async function* makeAsyncIterable(
  chunks: string[],
): AsyncIterable<{ content: string }> {
  for (const chunk of chunks) {
    yield { content: chunk };
  }
}

describe('writerNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns continuation assembled from stream chunks', async () => {
    mockStream.mockResolvedValue(
      makeAsyncIterable(['The lighthouse ', 'beam swept across the sea.']),
    );

    const result = await writerNode(makeState());
    expect(result.continuation).toBe(
      'The lighthouse beam swept across the sea.',
    );
  });

  it('returns empty string when all chunks are empty', async () => {
    mockStream.mockResolvedValue(makeAsyncIterable(['', '']));

    const result = await writerNode(makeState());
    expect(result.continuation).toBe('');
  });

  it('constructs a ChatOpenAI with the config model', async () => {
    mockStream.mockResolvedValue(makeAsyncIterable(['ok']));

    await writerNode(makeState());

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('uses a temperature above 0 for creative output', async () => {
    mockStream.mockResolvedValue(makeAsyncIterable(['ok']));

    await writerNode(makeState());

    const callArgs = (ChatOpenAI as any).mock.calls[0][0];
    expect(callArgs.temperature).toBeGreaterThan(0);
  });

  it('includes feedback in the user message on iteration > 0', async () => {
    const invokedPrompts: any[] = [];
    mockStream.mockImplementation(async (messages: any[]) => {
      invokedPrompts.push(...messages);
      return makeAsyncIterable(['revised']);
    });

    const state = makeState({
      iteration: 1,
      evaluationFeedback: 'Needs more detail',
    });
    await writerNode(state);

    const userMessage = invokedPrompts.find((m) => m.role === 'user');
    expect(userMessage.content).toContain('Needs more detail');
  });

  it('does not include feedback in user message on first iteration (iteration = 0)', async () => {
    const invokedPrompts: any[] = [];
    mockStream.mockImplementation(async (messages: any[]) => {
      invokedPrompts.push(...messages);
      return makeAsyncIterable(['ok']);
    });

    const state = makeState({
      iteration: 0,
      evaluationFeedback: 'Some feedback',
    });
    await writerNode(state);

    const userMessage = invokedPrompts.find((m) => m.role === 'user');
    expect(userMessage.content).not.toContain('Some feedback');
  });

  it('throws when the stream rejects', async () => {
    mockStream.mockRejectedValue(new Error('stream error'));

    await expect(writerNode(makeState())).rejects.toThrow('stream error');
  });

  it('handles chunks with undefined content gracefully', async () => {
    async function* undefinedChunks() {
      yield { content: undefined };
      yield { content: 'actual content' };
    }
    mockStream.mockResolvedValue(undefinedChunks());

    const result = await writerNode(makeState());
    expect(result.continuation).toBe('actual content');
  });
});
