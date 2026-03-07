import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MARKERS } from '@/marker_writer/markers';

const mockInvoke = vi.fn();

vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts: Record<string, unknown>) {
    this._opts = opts;
    this.invoke = mockInvoke;
    this.stream = vi.fn();
    this.withStructuredOutput = vi.fn();
  }),
}));

import { createMarkerWriterGraph } from '@/marker_writer/graph';

const M = MARKERS.CONTINUE;
const RS = MARKERS.REWRITE_START;
const RE = MARKERS.REWRITE_END;
const ES = MARKERS.ENHANCE_START;
const EE = MARKERS.ENHANCE_END;

function mockLLMSequence(responses: string[]) {
  for (const r of responses) {
    mockInvoke.mockResolvedValueOnce({ content: r });
  }
}

function makeThreadConfig(id: string) {
  return { configurable: { thread_id: id } };
}

describe('Marker Writer Pipeline — END_OF_TEXT continuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('runs the full pipeline for a simple end-of-text continuation', async () => {
    const longText = Array(30)
      .fill('The quick brown fox jumped over the lazy dog.')
      .join(' ');
    const rawInput = `${longText}${M}`;

    // intent_analyzer (heuristic path for CONTINUE + >100 words + no instruction)
    // style_analyzer returns default since doc < 50 words won't apply here, so mock LLM
    // style_analyzer, planner, writer = 3 LLM calls
    mockLLMSequence([
      JSON.stringify({
        tone: 'neutral',
        avgSentenceLength: 10,
        paragraphStyle: 'mixed',
        vocabulary: 'simple',
        pointOfView: 'third person',
        tense: 'past',
        notablePatterns: [],
      }),
      JSON.stringify({
        approach: 'Continue the narrative',
        topics: ['fox', 'dog'],
        transitionIn: 'smooth continuation',
        transitionOut: '',
        constraints: ['match voice'],
        targetWords: 50,
      }),
      'The fox paused to rest under the old oak tree.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-end-of-text'),
    );

    expect(result.parsedInput.markerPosition).toBe('END_OF_TEXT');
    expect(result.parsedInput.operationType).toBe('CONTINUE');
    expect(result.generatedText).toBe(
      'The fox paused to rest under the old oak tree.',
    );
    expect(result.finalDocument).toContain(longText);
    expect(result.finalDocument).toContain(
      'The fox paused to rest under the old oak tree.',
    );
    expect(result.changeDescription).toContain('END_OF_TEXT');
    expect(result.changeDescription).toContain('CONTINUE');
  });
});

describe('Marker Writer Pipeline — EMPTY_DOCUMENT generation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates content for an empty document with user instruction', async () => {
    // input_parser: pure logic (EMPTY_DOCUMENT + GENERATE)
    // intent_analyzer: LLM path (GENERATE, not CONTINUE)
    // style_analyzer: heuristic (doc < 50 words → defaults)
    // planner: LLM
    // writer: LLM
    // stitcher: pure logic
    mockLLMSequence([
      JSON.stringify({
        contentType: 'BLOG_POST',
        writingIntent: 'Write an introduction',
        topic: 'AI in healthcare',
        audience: 'general readers',
        desiredTone: 'informative',
        desiredLength: '~200 words',
        keyMessage: 'AI is transforming healthcare',
        constraints: ['keep it accessible'],
      }),
      // style_analyzer skipped (< 50 words, returns defaults)
      JSON.stringify({
        approach: 'Start with a hook',
        topics: ['AI diagnostics', 'patient care'],
        transitionIn: '',
        transitionOut: '',
        constraints: [],
        targetWords: 200,
      }),
      'Artificial intelligence is revolutionizing healthcare in ways we never imagined.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput: M, userInstruction: 'Write about AI in healthcare' },
      makeThreadConfig('test-empty-doc'),
    );

    expect(result.parsedInput.markerPosition).toBe('EMPTY_DOCUMENT');
    expect(result.parsedInput.operationType).toBe('GENERATE');
    expect(result.finalDocument).toBe(
      'Artificial intelligence is revolutionizing healthcare in ways we never imagined.',
    );
    // style_analyzer uses defaults for short docs — no LLM call for it
    // intent_analyzer + planner + writer = 3 LLM calls
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });
});

describe('Marker Writer Pipeline — BETWEEN_BLOCKS bridging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bridges two paragraphs with proper separator handling', async () => {
    const rawInput = `First paragraph about cats.\n\n${M}\n\nSecond paragraph about dogs.`;

    // intent_analyzer: LLM (not pure CONTINUE or <100 words)
    // style_analyzer: LLM (>50 words needs proper check, but this is short — defaults)
    // planner: LLM
    // writer: LLM
    mockLLMSequence([
      JSON.stringify({
        contentType: 'ARTICLE',
        writingIntent: 'Bridge two paragraphs',
        topic: 'animals',
        audience: 'general',
        desiredTone: 'casual',
        desiredLength: '~50 words',
        keyMessage: 'transition from cats to dogs',
        constraints: [],
      }),
      // style_analyzer returns defaults for < 50 words
      JSON.stringify({
        approach: 'Transitional paragraph',
        topics: ['animals'],
        transitionIn: 'from cats',
        transitionOut: 'to dogs',
        constraints: [],
        targetWords: 50,
      }),
      'Both animals have been companions to humans for millennia.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-bridge'),
    );

    expect(result.parsedInput.markerPosition).toBe('BETWEEN_BLOCKS');
    expect(result.parsedInput.operationType).toBe('BRIDGE');
    expect(result.finalDocument).toBe(
      'First paragraph about cats.\n\n' +
        'Both animals have been companions to humans for millennia.\n\n' +
        'Second paragraph about dogs.',
    );
  });
});

describe('Marker Writer Pipeline — AFTER_HEADING section fill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fills a section after a heading', async () => {
    const rawInput = `## Introduction\n\n${M}\n\n## Conclusion\n\nFinal thoughts.`;

    mockLLMSequence([
      JSON.stringify({
        contentType: 'ARTICLE',
        writingIntent: 'Write introduction section',
        topic: 'introduction',
        audience: 'readers',
        desiredTone: 'formal',
        desiredLength: '~100 words',
        keyMessage: 'set the stage',
        constraints: [],
      }),
      JSON.stringify({
        approach: 'Write section content',
        topics: ['overview'],
        transitionIn: 'opening paragraph',
        transitionOut: 'lead to conclusion',
        constraints: [],
        targetWords: 100,
      }),
      'This document explores the key concepts.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-heading'),
    );

    expect(result.parsedInput.markerPosition).toBe('AFTER_HEADING');
    expect(result.parsedInput.operationType).toBe('FILL_SECTION');
    expect(result.parsedInput.currentHeading).toBe('Introduction');
    expect(result.parsedInput.nextHeading).toBe('Conclusion');
    expect(result.finalDocument).toContain('## Introduction');
    expect(result.finalDocument).toContain(
      'This document explores the key concepts.',
    );
    expect(result.finalDocument).toContain('## Conclusion');
    expect(result.finalDocument).toContain('Final thoughts.');
  });
});

describe('Marker Writer Pipeline — START_OF_TEXT prepend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prepends content before existing text', async () => {
    const rawInput = `${M}The main body of the document starts here.`;

    mockLLMSequence([
      JSON.stringify({
        contentType: 'ARTICLE',
        writingIntent: 'Write an introduction',
        topic: 'introduction',
        audience: 'readers',
        desiredTone: 'neutral',
        desiredLength: '~50 words',
        keyMessage: 'introduce the topic',
        constraints: [],
      }),
      JSON.stringify({
        approach: 'Opening statement',
        topics: ['introduction'],
        transitionIn: '',
        transitionOut: 'lead into body',
        constraints: [],
        targetWords: 50,
      }),
      'Welcome to this guide.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-prepend'),
    );

    expect(result.parsedInput.markerPosition).toBe('START_OF_TEXT');
    expect(result.parsedInput.operationType).toBe('PREPEND');
    expect(result.finalDocument).toBe(
      'Welcome to this guide.\n\nThe main body of the document starts here.',
    );
  });
});

describe('Marker Writer Pipeline — MID_SENTENCE continuation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles mid-sentence marker with text after', async () => {
    const rawInput = `The most important${M} thing to remember.`;

    mockLLMSequence([
      JSON.stringify({
        contentType: 'ARTICLE',
        writingIntent: 'Complete the sentence',
        topic: 'advice',
        audience: 'general',
        desiredTone: 'neutral',
        desiredLength: '~20 words',
        keyMessage: 'complete thought',
        constraints: ['complete the sentence first'],
      }),
      JSON.stringify({
        approach: 'Complete sentence',
        topics: ['advice'],
        transitionIn: 'continue mid-sentence',
        transitionOut: 'connect to next',
        constraints: [],
        targetWords: 20,
      }),
      'and often overlooked',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-mid-sentence'),
    );

    expect(result.parsedInput.markerPosition).toBe('MID_SENTENCE');
    expect(result.parsedInput.isInsideSentence).toBe(true);
    expect(result.finalDocument).toContain('The most important');
    expect(result.finalDocument).toContain('and often overlooked');
    expect(result.finalDocument).toContain('thing to remember.');
  });
});

describe('Marker Writer Pipeline — paired REWRITE region', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes a rewrite region through the full pipeline', async () => {
    const rawInput = `Good intro. ${RS}This part is bad and needs rewriting.${RE} Good conclusion.`;

    mockLLMSequence([
      JSON.stringify({
        contentType: 'ARTICLE',
        writingIntent: 'Rewrite the selected region',
        topic: 'improvement',
        audience: 'readers',
        desiredTone: 'neutral',
        desiredLength: '~30 words',
        keyMessage: 'improve the passage',
        constraints: [],
      }),
      JSON.stringify({
        tone: 'neutral',
        avgSentenceLength: 12,
        paragraphStyle: 'mixed',
        vocabulary: 'simple',
        pointOfView: 'third person',
        tense: 'present',
        notablePatterns: [],
      }),
      JSON.stringify({
        approach: 'Rewrite for clarity',
        topics: ['rewrite'],
        transitionIn: 'match surrounding text',
        transitionOut: 'flow into conclusion',
        constraints: [],
        targetWords: 30,
      }),
      'This part has been significantly improved and reads much better now.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: 'Improve this section' },
      makeThreadConfig('test-rewrite'),
    );

    expect(result.parsedInput.markerPosition).toBe('REGION_SELECTED');
    expect(result.parsedInput.operationType).toBe('REWRITE_REGION');
    expect(result.parsedInput.selectedRegion).toBe(
      'This part is bad and needs rewriting.',
    );
    expect(result.generatedText).toContain('significantly improved');
    expect(result.finalDocument).toContain('Good intro.');
    expect(result.finalDocument).toContain('Good conclusion.');
  });
});

describe('Marker Writer Pipeline — heuristic fast path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips intent_analyzer LLM when CONTINUE + >100 words + no instruction', async () => {
    const longText = Array(30)
      .fill('The quick brown fox jumped over the lazy dog.')
      .join(' ');
    const rawInput = `${longText}${M}`;

    // Only style_analyzer, planner, writer need LLM = 3 calls
    mockLLMSequence([
      JSON.stringify({
        tone: 'neutral',
        avgSentenceLength: 9,
        paragraphStyle: 'mixed',
        vocabulary: 'simple',
        pointOfView: 'third person',
        tense: 'past',
        notablePatterns: [],
      }),
      JSON.stringify({
        approach: 'Continue naturally',
        topics: ['fox', 'dog'],
        transitionIn: 'flow',
        transitionOut: '',
        constraints: [],
        targetWords: 60,
      }),
      'The lazy dog finally woke up.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-heuristic'),
    );

    expect(result.intentAnalysis.writingIntent).toBe('CONTINUE');
    expect(result.intentAnalysis.constraints).toContain(
      'match existing voice exactly',
    );
    // 3 LLM calls: style_analyzer + planner + writer
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });

  it('skips style_analyzer LLM when document has fewer than 50 words', async () => {
    const rawInput = `Short text.${M}`;

    // intent_analyzer (LLM, because <100 words) + planner + writer = 3 LLM calls
    // style_analyzer returns defaults (no LLM)
    mockLLMSequence([
      JSON.stringify({
        contentType: 'SOCIAL_POST',
        writingIntent: 'Continue',
        topic: 'short text',
        audience: 'general',
        desiredTone: 'casual',
        desiredLength: '~50 words',
        keyMessage: 'continue',
        constraints: [],
      }),
      JSON.stringify({
        approach: 'Extend',
        topics: ['topic'],
        transitionIn: 'from short text',
        transitionOut: '',
        constraints: [],
        targetWords: 50,
      }),
      'More content follows.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-short-doc'),
    );

    expect(result.styleProfile.tone).toBe('neutral');
    expect(result.styleProfile.vocabulary).toBe('simple');
    // 3 LLM calls: intent_analyzer + planner + writer (style_analyzer skipped)
    expect(mockInvoke).toHaveBeenCalledTimes(3);
  });
});

describe('Marker Writer Pipeline — state propagation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propagates all intermediate state fields correctly', async () => {
    const rawInput = `Hello world. This is a test document.${M}`;

    mockLLMSequence([
      JSON.stringify({
        contentType: 'BLOG_POST',
        writingIntent: 'Continue the text',
        topic: 'testing',
        audience: 'developers',
        desiredTone: 'technical',
        desiredLength: '~100 words',
        keyMessage: 'testing is important',
        constraints: ['be concise'],
      }),
      JSON.stringify({
        approach: 'Add technical content',
        topics: ['testing'],
        transitionIn: 'smooth',
        transitionOut: '',
        constraints: ['no jargon'],
        targetWords: 100,
      }),
      'Testing ensures software reliability.',
    ]);

    const graph = createMarkerWriterGraph();
    const result = await graph.invoke(
      { rawInput, userInstruction: '' },
      makeThreadConfig('test-propagation'),
    );

    // parsedInput populated by input_parser
    expect(result.parsedInput).toBeDefined();
    expect(result.parsedInput.markerType).toBe('CONTINUE');

    // intentAnalysis populated by intent_analyzer
    expect(result.intentAnalysis).toBeDefined();
    expect(result.intentAnalysis.contentType).toBe('BLOG_POST');

    // styleProfile populated by style_analyzer (defaults for < 50 words)
    expect(result.styleProfile).toBeDefined();
    expect(result.styleProfile.tone).toBe('neutral');

    // writingPlan populated by planner
    expect(result.writingPlan).toBeDefined();
    expect(result.writingPlan.targetWords).toBe(100);

    // generatedText populated by writer
    expect(result.generatedText).toBe('Testing ensures software reliability.');

    // finalDocument and changeDescription populated by stitcher
    expect(result.finalDocument).toBeDefined();
    expect(result.changeDescription).toBeDefined();
  });
});
