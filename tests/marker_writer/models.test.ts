import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @langchain/openai before importing models so no real API keys are needed.
// Use a regular function (not arrow) so `new ChatOpenAI(...)` works correctly.
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._modelOpts = opts;
    this.model = opts.model;
    this.temperature = opts.temperature;
    this.maxTokens = opts.maxTokens;
  }),
}));

import {
  createUnderstandingModel,
  createWriterModel,
  createReviewerModel,
} from '@/marker_writer/models';
import { ChatOpenAI } from '@langchain/openai';

describe('createUnderstandingModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs a ChatOpenAI with model gpt-4o', () => {
    createUnderstandingModel();
    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o', temperature: 0 }),
    );
  });

  it('uses temperature 0 for deterministic understanding', () => {
    const instance = createUnderstandingModel() as any;
    expect(instance.temperature).toBe(0);
  });

  it('returns a new instance each call', () => {
    const a = createUnderstandingModel();
    const b = createUnderstandingModel();
    expect(a).not.toBe(b);
  });
});

describe('createWriterModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs a ChatOpenAI with model gpt-4o', () => {
    createWriterModel();
    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('uses a temperature above 0 for creative output', () => {
    const instance = createWriterModel() as any;
    expect(instance.temperature).toBeGreaterThan(0);
  });

  it('sets a maxTokens cap for the writer', () => {
    const instance = createWriterModel() as any;
    expect(instance.maxTokens).toBeGreaterThan(0);
  });
});

describe('createReviewerModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('constructs a ChatOpenAI with model gpt-4o', () => {
    createReviewerModel();
    expect(ChatOpenAI).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o' }),
    );
  });

  it('uses a low temperature for near-deterministic review', () => {
    const instance = createReviewerModel() as any;
    expect(instance.temperature).toBeLessThan(0.5);
  });
});
