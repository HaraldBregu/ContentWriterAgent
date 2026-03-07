import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStream = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.stream = mockStream;
  }),
}));

import { formatterNode } from '@/nodes/formatter';
import type { WritingStateValue } from '@/state';
import { ChatOpenAI } from '@langchain/openai';

function makeState(
  overrides: Partial<WritingStateValue> = {},
): WritingStateValue {
  return {
    inputText: 'The old lighthouse keeper climbed the stairs.',
    continuation: 'He found a note left by his predecessor.',
    formattedContinuation: '',
    evaluationScore: 8,
    evaluationFeedback: '',
    passed: true,
    iteration: 1,
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

describe('formatterNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns formattedContinuation assembled from stream chunks', async () => {
    mockStream.mockResolvedValue(
      makeAsyncIterable(['Polished ', 'text ', 'here.']),
    );

    const result = await formatterNode(makeState());
    expect(result.formattedContinuation).toBe('Polished text here.');
  });

  it('returns an empty string when all chunks are empty', async () => {
    mockStream.mockResolvedValue(makeAsyncIterable(['', '']));

    const result = await formatterNode(makeState());
    expect(result.formattedContinuation).toBe('');
  });

  it('constructs a ChatOpenAI with the config model', async () => {
    mockStream.mockResolvedValue(makeAsyncIterable(['ok']));

    await formatterNode(makeState());

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('uses a low temperature for near-deterministic polishing', async () => {
    mockStream.mockResolvedValue(makeAsyncIterable(['ok']));

    await formatterNode(makeState());

    const callArgs = (ChatOpenAI as any).mock.calls[0][0];
    expect(callArgs.temperature).toBeLessThan(0.5);
  });

  it('throws when the stream rejects', async () => {
    mockStream.mockRejectedValue(new Error('stream error'));

    await expect(formatterNode(makeState())).rejects.toThrow('stream error');
  });

  it('handles chunks with undefined content gracefully', async () => {
    async function* undefinedChunks() {
      yield { content: undefined };
      yield { content: 'real content' };
    }
    mockStream.mockResolvedValue(undefinedChunks());

    const result = await formatterNode(makeState());
    expect(result.formattedContinuation).toBe('real content');
  });
});
