import { describe, it, expect } from 'vitest';
import { WritingState } from '@/state';
import type { AttemptRecord } from '@/state';

// In LangGraph 0.2.x, WritingState.spec is the channels object directly.
// Fields with a custom reducer are BinaryOperatorAggregate instances with
// `.operator` (the reducer) and `.initialValueFactory` (the default factory).
// Fields without a custom reducer are LastValue instances.

describe('WritingState annotation', () => {
  it('has the expected state fields', () => {
    const channels = Object.keys(WritingState.spec);
    expect(channels).toContain('inputText');
    expect(channels).toContain('continuation');
    expect(channels).toContain('formattedContinuation');
    expect(channels).toContain('evaluationScore');
    expect(channels).toContain('evaluationFeedback');
    expect(channels).toContain('passed');
    expect(channels).toContain('iteration');
    expect(channels).toContain('maxIterations');
    expect(channels).toContain('history');
  });

  it('string fields default to an empty string', () => {
    const defaults = Object.fromEntries(
      Object.entries(WritingState.spec).map(([k, ch]) => [
        k,
        (ch as any).initialValueFactory?.(),
      ]),
    );
    expect(defaults.inputText).toBe('');
    expect(defaults.continuation).toBe('');
    expect(defaults.formattedContinuation).toBe('');
    expect(defaults.evaluationFeedback).toBe('');
  });

  it('evaluationScore defaults to 0', () => {
    const ch = (WritingState.spec as any).evaluationScore;
    expect(ch.initialValueFactory()).toBe(0);
  });

  it('passed defaults to false', () => {
    const ch = (WritingState.spec as any).passed;
    expect(ch.initialValueFactory()).toBe(false);
  });

  it('iteration defaults to 0', () => {
    const ch = (WritingState.spec as any).iteration;
    expect(ch.initialValueFactory()).toBe(0);
  });

  it('maxIterations defaults to 3', () => {
    const ch = (WritingState.spec as any).maxIterations;
    expect(ch.initialValueFactory()).toBe(3);
  });

  it('history defaults to an empty array', () => {
    const ch = (WritingState.spec as any).history;
    expect(ch.initialValueFactory()).toEqual([]);
  });

  describe('reducers', () => {
    it('string fields use last-write-wins when new value is not null/undefined', () => {
      const ch = (WritingState.spec as any).inputText;
      expect(ch.operator('old', 'new')).toBe('new');
    });

    it('string fields keep the current value when new value is null', () => {
      const ch = (WritingState.spec as any).inputText;
      expect(ch.operator('old', null)).toBe('old');
    });

    it('iteration reducer adds 1 to the new value when provided', () => {
      // The reducer is (a, b) => (b ?? a) + 1
      const ch = (WritingState.spec as any).iteration;
      expect(ch.operator(0, 0)).toBe(1);
      expect(ch.operator(2, 2)).toBe(3);
    });

    it('history reducer appends new records to existing ones', () => {
      const ch = (WritingState.spec as any).history;
      const existing: AttemptRecord[] = [
        { continuation: 'a', score: 5, feedback: 'ok' },
      ];
      const incoming: AttemptRecord[] = [
        { continuation: 'b', score: 8, feedback: 'great' },
      ];
      const result = ch.operator(existing, incoming);
      expect(result).toHaveLength(2);
      expect(result[0].continuation).toBe('a');
      expect(result[1].continuation).toBe('b');
    });

    it('history reducer handles null existing gracefully', () => {
      const ch = (WritingState.spec as any).history;
      const incoming: AttemptRecord[] = [
        { continuation: 'x', score: 7, feedback: 'good' },
      ];
      const result = ch.operator(null, incoming);
      expect(result).toHaveLength(1);
    });
  });
});

describe('AttemptRecord type shape', () => {
  it('accepts a valid attempt record object', () => {
    const record: AttemptRecord = {
      continuation: 'The quick brown fox',
      score: 8,
      feedback: 'Good flow',
    };
    expect(record.continuation).toBe('The quick brown fox');
    expect(record.score).toBe(8);
    expect(record.feedback).toBe('Good flow');
  });
});
