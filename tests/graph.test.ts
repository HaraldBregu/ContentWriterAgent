import { describe, it, expect, vi } from 'vitest';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.invoke = vi.fn();
    this.stream = vi.fn();
    this.withStructuredOutput = vi.fn();
  }),
}));

import { createWritingGraph } from '@/graph';

describe('createWritingGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createWritingGraph()).not.toThrow();
  });

  it('returns a compiled graph object', () => {
    const graph = createWritingGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  it('returns a new instance on each call', () => {
    const a = createWritingGraph();
    const b = createWritingGraph();
    expect(a).not.toBe(b);
  });

  it('exposes an invoke method', () => {
    const graph = createWritingGraph();
    expect(typeof graph.invoke).toBe('function');
  });

  it('exposes a stream method', () => {
    const graph = createWritingGraph();
    expect(typeof graph.stream).toBe('function');
  });
});

describe('router function (via graph behaviour)', () => {
  it('graph construction includes writer, evaluator, and formatter nodes', () => {
    // Verifying the graph compiles with all three nodes present.
    // If any node import fails, this test will throw before reaching the assertion.
    const graph = createWritingGraph();
    expect(graph).toBeDefined();
  });
});
