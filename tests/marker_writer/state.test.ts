import { describe, it, expect } from 'vitest';
import { WriterState } from '@/marker_writer/state';
import type { WriterStateValue } from '@/marker_writer/state';

describe('WriterState annotation', () => {
  it('has the expected state channels', () => {
    const channels = Object.keys(WriterState.spec);
    expect(channels).toContain('rawInput');
    expect(channels).toContain('userInstruction');
    expect(channels).toContain('knowledgeBasePath');
    expect(channels).toContain('parsedInput');
    expect(channels).toContain('intentAnalysis');
    expect(channels).toContain('styleProfile');
    expect(channels).toContain('writingPlan');
    expect(channels).toContain('generatedText');
    expect(channels).toContain('finalDocument');
    expect(channels).toContain('changeDescription');
    expect(channels).toContain('userPreferences');
    expect(channels).toContain('conversationHistory');
  });

  it('rawInput channel is defined', () => {
    const ch = (WriterState.spec as any).rawInput;
    expect(ch).toBeDefined();
  });

  it('userInstruction channel is defined', () => {
    const ch = (WriterState.spec as any).userInstruction;
    expect(ch).toBeDefined();
  });

  it('generatedText channel is defined', () => {
    const ch = (WriterState.spec as any).generatedText;
    expect(ch).toBeDefined();
  });

  it('finalDocument channel is defined', () => {
    const ch = (WriterState.spec as any).finalDocument;
    expect(ch).toBeDefined();
  });

  describe('userPreferences reducer', () => {
    it('merges two preference objects', () => {
      const ch = (WriterState.spec as any).userPreferences;
      const result = ch.operator({ tone: 'formal' }, { length: 'short' });
      expect(result).toEqual({ tone: 'formal', length: 'short' });
    });

    it('new value overwrites existing key', () => {
      const ch = (WriterState.spec as any).userPreferences;
      const result = ch.operator({ tone: 'formal' }, { tone: 'casual' });
      expect(result.tone).toBe('casual');
    });

    it('handles empty incoming object', () => {
      const ch = (WriterState.spec as any).userPreferences;
      const result = ch.operator({ tone: 'formal' }, {});
      expect(result).toEqual({ tone: 'formal' });
    });
  });

  describe('conversationHistory reducer', () => {
    it('appends new messages to existing history', () => {
      const ch = (WriterState.spec as any).conversationHistory;
      const existing = [{ role: 'user', content: 'hello' }];
      const incoming = [{ role: 'assistant', content: 'hi' }];
      const result = ch.operator(existing, incoming);
      expect(result).toHaveLength(2);
      expect(result[0].role).toBe('user');
      expect(result[1].role).toBe('assistant');
    });

    it('handles empty existing array', () => {
      const ch = (WriterState.spec as any).conversationHistory;
      const incoming = [{ role: 'user', content: 'hello' }];
      const result = ch.operator([], incoming);
      expect(result).toHaveLength(1);
    });

    it('handles empty incoming array', () => {
      const ch = (WriterState.spec as any).conversationHistory;
      const existing = [{ role: 'user', content: 'hello' }];
      const result = ch.operator(existing, []);
      expect(result).toHaveLength(1);
    });
  });
});

describe('WriterStateValue type shape', () => {
  it('accepts a minimal valid state object', () => {
    const state: Partial<WriterStateValue> = {
      rawInput: 'some text',
      userInstruction: '',
      generatedText: '',
      finalDocument: '',
    };
    expect(state.rawInput).toBe('some text');
  });
});
