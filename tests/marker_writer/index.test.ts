import { describe, it, expect, vi } from 'vitest';

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.invoke = vi.fn();
    this.stream = vi.fn();
  }),
}));

// The index module calls main() at the top level. We test its re-exported
// dependencies directly rather than importing the module, to avoid starting
// a real graph invocation in the test process.

import { createMarkerWriterGraph } from '@/marker_writer/graph';
import { CONTINUE_MARKER, MARKERS } from '@/marker_writer/markers';

describe('marker_writer entry point dependencies', () => {
  it('createMarkerWriterGraph is callable and returns a graph', () => {
    const app = createMarkerWriterGraph();
    expect(app).toBeDefined();
    expect(typeof app.invoke).toBe('function');
  });

  it('CONTINUE_MARKER is the same as MARKERS.CONTINUE', () => {
    expect(CONTINUE_MARKER).toBe(MARKERS.CONTINUE);
  });

  it('MARKERS object has all required keys used by index.ts', () => {
    expect(MARKERS).toHaveProperty('CONTINUE');
    expect(MARKERS).toHaveProperty('REWRITE_START');
    expect(MARKERS).toHaveProperty('REWRITE_END');
    expect(MARKERS).toHaveProperty('ENHANCE_START');
    expect(MARKERS).toHaveProperty('ENHANCE_END');
    expect(MARKERS).toHaveProperty('DELETE_START');
    expect(MARKERS).toHaveProperty('DELETE_END');
    expect(MARKERS).toHaveProperty('COMMENT');
  });

  it('all marker characters have code points in U+E000–U+F8FF range', () => {
    for (const char of Object.values(MARKERS)) {
      const cp = char.codePointAt(0)!;
      expect(cp).toBeGreaterThanOrEqual(0xe000);
      expect(cp).toBeLessThanOrEqual(0xf8ff);
    }
  });
});
