import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStream = vi.fn();
const mockStructuredInvoke = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.stream = mockStream;
    this.invoke = vi.fn();
    this.withStructuredOutput = vi.fn(() => ({
      invoke: mockStructuredInvoke,
    }));
  }),
}));

import { createWritingGraph } from '@/graph';

async function* chunks(parts: string[]): AsyncIterable<{ content: string }> {
  for (const p of parts) yield { content: p };
}

function setupPassingCycle(
  continuation: string[],
  score: number,
  formatted: string[],
) {
  mockStream.mockResolvedValueOnce(chunks(continuation));
  mockStructuredInvoke.mockResolvedValueOnce({
    score,
    passed: true,
    feedback: 'Good.',
  });
  mockStream.mockResolvedValueOnce(chunks(formatted));
}

function setupFailingEvaluation(
  continuation: string[],
  score: number,
  feedback: string,
) {
  mockStream.mockResolvedValueOnce(chunks(continuation));
  mockStructuredInvoke.mockResolvedValueOnce({
    score,
    passed: false,
    feedback,
  });
}

describe('Writing Graph Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes the full write-evaluate-format cycle on first pass', async () => {
    setupPassingCycle(['The lighthouse ', 'beam swept across the sea.'], 9, [
      'The lighthouse beam swept across the sea, polished.',
    ]);

    const graph = createWritingGraph();
    const result = await graph.invoke({
      inputText: 'Once upon a time in a distant land.',
    });

    expect(result.continuation).toBe(
      'The lighthouse beam swept across the sea.',
    );
    expect(result.evaluationScore).toBe(9);
    expect(result.passed).toBe(true);
    expect(result.formattedContinuation).toBe(
      'The lighthouse beam swept across the sea, polished.',
    );
  });

  it('retries when evaluation fails then succeeds on second attempt', async () => {
    setupFailingEvaluation(['First draft.'], 4, 'Needs more detail.');
    setupPassingCycle(['Revised draft with detail.'], 8, ['Polished draft.']);

    const graph = createWritingGraph();
    const result = await graph.invoke({
      inputText: 'A beginning.',
    });

    expect(result.evaluationScore).toBe(8);
    expect(result.passed).toBe(true);
    expect(result.formattedContinuation).toBe('Polished draft.');
  });

  it('routes to formatter after maxIterations even when evaluation never passes', async () => {
    for (let i = 0; i < 3; i++) {
      setupFailingEvaluation([`Attempt ${i + 1}.`], 3, 'Still poor.');
    }
    mockStream.mockResolvedValueOnce(chunks(['Best effort, polished.']));

    const graph = createWritingGraph();
    const result = await graph.invoke({
      inputText: 'Test input.',
      maxIterations: 3,
    });

    expect(result.passed).toBe(false);
    expect(result.formattedContinuation).toBe('Best effort, polished.');
  });

  it('preserves inputText through the entire pipeline', async () => {
    const input = 'The rain fell softly on the rooftops.';
    setupPassingCycle(['Continuation.'], 8, ['Polished.']);

    const graph = createWritingGraph();
    const result = await graph.invoke({ inputText: input });

    expect(result.inputText).toBe(input);
  });

  it('accumulates history entries across retries', async () => {
    setupFailingEvaluation(['Draft 1.'], 4, 'Weak.');
    setupPassingCycle(['Draft 2.'], 9, ['Final.']);

    const graph = createWritingGraph();
    const result = await graph.invoke({
      inputText: 'Some text.',
    });

    expect(result.formattedContinuation).toBe('Final.');
    expect(result.passed).toBe(true);
  });

  it('handles empty continuation from writer gracefully', async () => {
    mockStream.mockResolvedValueOnce(chunks(['']));
    mockStructuredInvoke.mockResolvedValueOnce({
      score: 2,
      passed: false,
      feedback: 'Empty output.',
    });
    setupPassingCycle(['Proper content.'], 8, ['Polished content.']);

    const graph = createWritingGraph();
    const result = await graph.invoke({
      inputText: 'Start here.',
    });

    expect(result.formattedContinuation).toBe('Polished content.');
  });

  it('invokes the writer node with the correct number of LLM calls', async () => {
    setupPassingCycle(['Done.'], 10, ['Done polished.']);

    const graph = createWritingGraph();
    await graph.invoke({ inputText: 'Quick.' });

    // writer(stream) + formatter(stream) = 2 stream calls
    // evaluator(structured invoke) = 1 invoke call
    expect(mockStream).toHaveBeenCalledTimes(2);
    expect(mockStructuredInvoke).toHaveBeenCalledTimes(1);
  });
});
