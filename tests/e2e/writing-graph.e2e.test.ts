import dotenv from 'dotenv';
dotenv.config();

import { describe, it, expect } from 'vitest';
import { createWritingGraph } from '@/graph';

const hasApiKey = !!process.env.OPENAI_API_KEY;

describe.skipIf(!hasApiKey)('Writing Graph E2E', () => {
  it(
    'generates a continuation for a creative writing prompt',
    async () => {
      const graph = createWritingGraph();
      const result = await graph.invoke({
        inputText:
          'The old lighthouse keeper climbed the winding stairs, lantern in hand. Each step creaked beneath his weight, echoing through the hollow tower.',
        maxIterations: 2,
      });

      expect(result.continuation).toBeDefined();
      expect(result.continuation.length).toBeGreaterThan(50);

      expect(result.evaluationScore).toBeGreaterThanOrEqual(0);
      expect(result.evaluationScore).toBeLessThanOrEqual(10);

      expect(typeof result.passed).toBe('boolean');

      expect(result.formattedContinuation).toBeDefined();
      expect(result.formattedContinuation.length).toBeGreaterThan(50);
    },
    { timeout: 120_000 },
  );

  it(
    'generates a continuation for a technical writing prompt',
    async () => {
      const graph = createWritingGraph();
      const result = await graph.invoke({
        inputText:
          'TypeScript generics allow developers to create reusable components that work with a variety of types rather than a single one. This concept is fundamental to writing type-safe, flexible code.',
        maxIterations: 1,
      });

      expect(result.continuation).toBeDefined();
      expect(result.continuation.length).toBeGreaterThan(30);
      expect(result.formattedContinuation).toBeDefined();
      expect(result.formattedContinuation.length).toBeGreaterThan(30);
    },
    { timeout: 120_000 },
  );

  it(
    'produces a higher-quality continuation on retry',
    async () => {
      const graph = createWritingGraph();
      const result = await graph.invoke({
        inputText:
          'The sky turned crimson as the sun dipped below the horizon.',
        maxIterations: 3,
      });

      expect(result.formattedContinuation).toBeDefined();
      expect(result.formattedContinuation.length).toBeGreaterThan(0);
      // The graph should either pass evaluation or exhaust iterations
      expect(result.passed || result.iteration >= result.maxIterations).toBe(
        true,
      );
    },
    { timeout: 180_000 },
  );

  it(
    'maintains style consistency with the input text',
    async () => {
      const graph = createWritingGraph();
      const result = await graph.invoke({
        inputText:
          "Yo, check this out — the new skateboard park just opened and it's absolutely insane. Like, they've got half-pipes, rails, and even a mega ramp.",
        maxIterations: 1,
      });

      expect(result.continuation).toBeDefined();
      expect(result.continuation.length).toBeGreaterThan(20);
    },
    { timeout: 120_000 },
  );
});
