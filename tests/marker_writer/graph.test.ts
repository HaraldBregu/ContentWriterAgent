import { describe, it, expect, vi } from 'vitest';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.invoke = vi.fn();
    this.stream = vi.fn();
    this.withStructuredOutput = vi.fn();
  }),
}));

import { createMarkerWriterGraph } from '@/marker_writer/graph';

describe('createMarkerWriterGraph', () => {
  it('compiles without throwing', () => {
    expect(() => createMarkerWriterGraph()).not.toThrow();
  });

  it('returns a compiled graph object', () => {
    const graph = createMarkerWriterGraph();
    expect(graph).toBeDefined();
    expect(typeof graph.invoke).toBe('function');
  });

  it('returns a new instance on each call', () => {
    const a = createMarkerWriterGraph();
    const b = createMarkerWriterGraph();
    expect(a).not.toBe(b);
  });

  it('exposes an invoke method', () => {
    const graph = createMarkerWriterGraph();
    expect(typeof graph.invoke).toBe('function');
  });

  it('exposes a stream method', () => {
    const graph = createMarkerWriterGraph();
    expect(typeof graph.stream).toBe('function');
  });
});
