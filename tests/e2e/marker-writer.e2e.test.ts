import dotenv from 'dotenv';
dotenv.config();

import { describe, it, expect } from 'vitest';
import { createMarkerWriterGraph } from '@/marker_writer/graph';
import { MARKERS } from '@/marker_writer/markers';
import { stripAllMarkers, countWords } from '@/marker_writer/helpers';

const hasApiKey = !!process.env.OPENAI_API_KEY;

const M = MARKERS.CONTINUE;
const RS = MARKERS.REWRITE_START;
const RE = MARKERS.REWRITE_END;

let threadCounter = 0;
function threadId() {
  return `e2e-${Date.now()}-${++threadCounter}`;
}

function makeConfig() {
  return { configurable: { thread_id: threadId() } };
}

describe.skipIf(!hasApiKey)('Marker Writer E2E — basic positions', () => {
  it(
    'continues text at END_OF_TEXT',
    async () => {
      const rawInput = `The rapid advancement of artificial intelligence has transformed industries worldwide. From healthcare diagnostics to autonomous vehicles, AI systems are becoming increasingly sophisticated.${M}`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('END_OF_TEXT');
      expect(result.parsedInput.operationType).toBe('CONTINUE');
      expect(result.generatedText.length).toBeGreaterThan(20);
      expect(result.finalDocument).toContain(
        'rapid advancement of artificial intelligence',
      );
      expect(result.finalDocument).toContain(result.generatedText);
      expect(stripAllMarkers(result.finalDocument)).toBe(result.finalDocument);
    },
    { timeout: 120_000 },
  );

  it(
    'generates content for EMPTY_DOCUMENT with instruction',
    async () => {
      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        {
          rawInput: M,
          userInstruction: 'Write a brief introduction about climate change',
        },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('EMPTY_DOCUMENT');
      expect(result.parsedInput.operationType).toBe('GENERATE');
      expect(result.generatedText.length).toBeGreaterThan(30);
      expect(result.finalDocument).toBe(result.generatedText);
    },
    { timeout: 120_000 },
  );

  it(
    'prepends content at START_OF_TEXT',
    async () => {
      const rawInput = `${M}The main findings suggest a strong correlation between exercise and mental health outcomes.`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        {
          rawInput,
          userInstruction: 'Add a brief introduction before this',
        },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('START_OF_TEXT');
      expect(result.parsedInput.operationType).toBe('PREPEND');
      expect(result.finalDocument).toContain(result.generatedText);
      expect(result.finalDocument).toContain(
        'strong correlation between exercise',
      );
      // Generated text comes first
      expect(result.finalDocument.indexOf(result.generatedText)).toBeLessThan(
        result.finalDocument.indexOf('strong correlation'),
      );
    },
    { timeout: 120_000 },
  );
});

describe.skipIf(!hasApiKey)('Marker Writer E2E — bridging', () => {
  it(
    'bridges BETWEEN_BLOCKS',
    async () => {
      const rawInput = [
        'The morning started with a gentle rain that covered the city in a soft mist.',
        '',
        M,
        '',
        'By evening, the streets were dry again and people emerged from their homes to enjoy the cool air.',
      ].join('\n');

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('BETWEEN_BLOCKS');
      expect(result.parsedInput.operationType).toBe('BRIDGE');
      expect(result.finalDocument).toContain('morning started');
      expect(result.finalDocument).toContain('streets were dry');
      expect(result.finalDocument).toContain(result.generatedText);
    },
    { timeout: 120_000 },
  );

  it(
    'bridges MID_PARAGRAPH between sentences',
    async () => {
      const rawInput = `The experiment yielded surprising results. ${M}These findings have significant implications for future research.`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: 'Add a sentence about the data' },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('MID_PARAGRAPH');
      expect(result.parsedInput.operationType).toBe('BRIDGE');
      expect(result.finalDocument).toContain('experiment yielded');
      expect(result.finalDocument).toContain('implications for future');
    },
    { timeout: 120_000 },
  );
});

describe.skipIf(!hasApiKey)('Marker Writer E2E — section handling', () => {
  it(
    'fills content AFTER_HEADING',
    async () => {
      const rawInput = [
        '# Research Paper',
        '',
        '## Abstract',
        '',
        'A brief summary of the paper.',
        '',
        '## Introduction',
        '',
        M,
        '',
        '## Methods',
        '',
        'The study used a mixed-methods approach.',
      ].join('\n');

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        {
          rawInput,
          userInstruction:
            'Write an introduction about the importance of sleep research',
        },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('AFTER_HEADING');
      expect(result.parsedInput.operationType).toBe('FILL_SECTION');
      expect(result.parsedInput.currentHeading).toBe('Introduction');
      expect(result.parsedInput.nextHeading).toBe('Methods');
      expect(result.finalDocument).toContain('## Introduction');
      expect(result.finalDocument).toContain('## Methods');
      expect(result.finalDocument).toContain('mixed-methods approach');
      expect(result.generatedText.length).toBeGreaterThan(30);
    },
    { timeout: 120_000 },
  );
});

describe.skipIf(!hasApiKey)('Marker Writer E2E — mid-sentence', () => {
  it(
    'completes a sentence and continues',
    async () => {
      const rawInput = `The three most critical factors in software development are${M}`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('MID_SENTENCE');
      expect(result.parsedInput.isInsideSentence).toBe(true);
      // The continuation should complete the sentence
      const finalDoc = result.finalDocument;
      expect(finalDoc).toContain('three most critical factors');
      expect(finalDoc.length).toBeGreaterThan(rawInput.length);
    },
    { timeout: 120_000 },
  );
});

describe.skipIf(!hasApiKey)('Marker Writer E2E — paired markers', () => {
  it(
    'rewrites a selected region',
    async () => {
      const rawInput = `The study was conducted in 2024. ${RS}The results was very bad and not good at all.${RE} Further analysis is recommended.`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        {
          rawInput,
          userInstruction: 'Improve the grammar and tone of this sentence',
        },
        makeConfig(),
      );

      expect(result.parsedInput.markerPosition).toBe('REGION_SELECTED');
      expect(result.parsedInput.operationType).toBe('REWRITE_REGION');
      expect(result.parsedInput.selectedRegion).toBe(
        'The results was very bad and not good at all.',
      );
      expect(result.finalDocument).toContain('study was conducted');
      expect(result.finalDocument).toContain('Further analysis is recommended');
      // The rewritten text should not contain the original bad grammar
      expect(result.generatedText).not.toContain('results was very bad');
    },
    { timeout: 120_000 },
  );
});

describe.skipIf(!hasApiKey)('Marker Writer E2E — style matching', () => {
  it(
    'matches formal academic style',
    async () => {
      const rawInput = [
        'The empirical evidence suggests a statistically significant correlation',
        'between socioeconomic factors and educational attainment. Previous research',
        'has established that household income serves as a reliable predictor of',
        'academic performance across diverse demographic cohorts. Furthermore,',
        'longitudinal studies conducted over the past decade have consistently',
        'demonstrated that early childhood interventions yield measurable improvements',
        `in standardized assessment outcomes.${M}`,
      ].join(' ');

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(result.generatedText.length).toBeGreaterThan(20);
      // The continuation should exist and not contain markers
      expect(stripAllMarkers(result.finalDocument)).toBe(result.finalDocument);
    },
    { timeout: 120_000 },
  );

  it(
    'matches casual conversational style',
    async () => {
      const rawInput = `So I was just hanging out at the coffee shop, right? And this dude walks in with like three dogs — no leashes or anything. Everyone's just staring.${M}`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(result.generatedText.length).toBeGreaterThan(20);
      expect(result.finalDocument).toContain('coffee shop');
      expect(result.finalDocument).toContain(result.generatedText);
    },
    { timeout: 120_000 },
  );
});

describe.skipIf(!hasApiKey)('Marker Writer E2E — output integrity', () => {
  it(
    'never leaves marker characters in the final document',
    async () => {
      const rawInput = `Complete text here.${M}`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(stripAllMarkers(result.finalDocument)).toBe(result.finalDocument);
    },
    { timeout: 120_000 },
  );

  it(
    'returns a non-empty changeDescription',
    async () => {
      const rawInput = `Short text.${M}`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(result.changeDescription).toBeDefined();
      expect(result.changeDescription.length).toBeGreaterThan(0);
    },
    { timeout: 120_000 },
  );

  it(
    'populates all intermediate state fields',
    async () => {
      const rawInput = `A document with enough words to trigger all the analysis nodes in the pipeline.${M}`;

      const graph = createMarkerWriterGraph();
      const result = await graph.invoke(
        { rawInput, userInstruction: '' },
        makeConfig(),
      );

      expect(result.parsedInput).toBeDefined();
      expect(result.intentAnalysis).toBeDefined();
      expect(result.styleProfile).toBeDefined();
      expect(result.writingPlan).toBeDefined();
      expect(result.generatedText).toBeDefined();
      expect(result.finalDocument).toBeDefined();
      expect(result.changeDescription).toBeDefined();

      expect(result.intentAnalysis.contentType).toBeTruthy();
      expect(result.styleProfile.tone).toBeTruthy();
      expect(result.writingPlan.targetWords).toBeGreaterThan(0);
      expect(countWords(result.generatedText)).toBeGreaterThan(0);
    },
    { timeout: 120_000 },
  );
});
