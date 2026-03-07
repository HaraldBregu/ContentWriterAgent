import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockInvoke = vi.fn();
const mockWithStructuredOutput = vi.fn(() => ({ invoke: mockInvoke }));

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.withStructuredOutput = mockWithStructuredOutput;
  }),
}));

import { evaluatorNode } from '@/nodes/evaluator';
import type { WritingStateValue } from '@/state';
import { ChatOpenAI } from '@langchain/openai';

function makeState(
  overrides: Partial<WritingStateValue> = {},
): WritingStateValue {
  return {
    inputText: 'The old lighthouse keeper climbed the stairs.',
    continuation: 'He found a note left by his predecessor.',
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

describe('evaluatorNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWithStructuredOutput.mockReturnValue({ invoke: mockInvoke });
  });

  it('returns evaluationScore, evaluationFeedback, and passed', async () => {
    mockInvoke.mockResolvedValue({
      score: 8,
      passed: true,
      feedback: 'Great continuation.',
    });

    const result = await evaluatorNode(makeState());

    expect(result.evaluationScore).toBe(8);
    expect(result.evaluationFeedback).toBe('Great continuation.');
    expect(result.passed).toBe(true);
  });

  it('returns passed: false when score is below threshold', async () => {
    mockInvoke.mockResolvedValue({
      score: 4,
      passed: false,
      feedback: 'Lacks coherence.',
    });

    const result = await evaluatorNode(makeState());
    expect(result.passed).toBe(false);
    expect(result.evaluationScore).toBe(4);
  });

  it('constructs a ChatOpenAI with temperature 0 for determinism', async () => {
    mockInvoke.mockResolvedValue({ score: 7, passed: true, feedback: '' });

    await evaluatorNode(makeState());

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ temperature: 0 }),
    );
  });

  it('calls withStructuredOutput to enforce a typed schema', async () => {
    mockInvoke.mockResolvedValue({ score: 7, passed: true, feedback: '' });

    await evaluatorNode(makeState());
    expect(mockWithStructuredOutput).toHaveBeenCalled();
  });

  it('throws when the LLM invocation fails', async () => {
    mockInvoke.mockRejectedValue(new Error('LLM error'));

    await expect(evaluatorNode(makeState())).rejects.toThrow('LLM error');
  });

  it('uses the config model name', async () => {
    mockInvoke.mockResolvedValue({ score: 7, passed: true, feedback: '' });

    await evaluatorNode(makeState());

    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });
});
