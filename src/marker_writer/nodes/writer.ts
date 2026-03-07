import { MARKERS } from '@/marker_writer/markers';
import {
  createUnderstandingModel,
  createWriterModel,
} from '@/marker_writer/models';
import type { MarkerName } from '@/marker_writer/markers';
import type { WriterStateValue } from '@/marker_writer/state';
import type {
  CursorInfo,
  Intent,
  StyleProfile,
  MarkerPosition,
  IntentType,
  DiffInfo,
} from '@/marker_writer/types';
import {
  stripAllMarkers,
  extractLastParagraph,
  extractFirstParagraph,
  findCurrentHeading,
  countWords,
  getLineNumber,
  getColumnNumber,
} from '@/marker_writer/helpers';

// ─── Input Parsing ──────────────────────────────────────────

function detectMarkerType(rawInput: string): MarkerName {
  if (rawInput.includes(MARKERS.REWRITE_START)) return 'REWRITE_START';
  if (rawInput.includes(MARKERS.ENHANCE_START)) return 'ENHANCE_START';
  if (rawInput.includes(MARKERS.DELETE_START)) return 'DELETE_START';
  if (rawInput.includes(MARKERS.COMMENT)) return 'COMMENT';
  return 'CONTINUE';
}

function extractCursorInfo(
  rawInput: string,
  markerType: MarkerName,
): CursorInfo {
  let markerIndex: number;
  let textBefore: string;
  let textAfter: string;
  let selectedRegion = '';

  if (markerType === 'REWRITE_START') {
    markerIndex = rawInput.indexOf(MARKERS.REWRITE_START);
    textBefore = rawInput.slice(0, markerIndex);
    const endIdx = rawInput.indexOf(MARKERS.REWRITE_END);
    selectedRegion = rawInput.slice(markerIndex + 1, endIdx);
    textAfter = rawInput.slice(endIdx + 1);
  } else if (markerType === 'ENHANCE_START') {
    markerIndex = rawInput.indexOf(MARKERS.ENHANCE_START);
    textBefore = rawInput.slice(0, markerIndex);
    const endIdx = rawInput.indexOf(MARKERS.ENHANCE_END);
    selectedRegion = rawInput.slice(markerIndex + 1, endIdx);
    textAfter = rawInput.slice(endIdx + 1);
  } else if (markerType === 'DELETE_START') {
    markerIndex = rawInput.indexOf(MARKERS.DELETE_START);
    textBefore = rawInput.slice(0, markerIndex);
    const endIdx = rawInput.indexOf(MARKERS.DELETE_END);
    selectedRegion = rawInput.slice(markerIndex + 1, endIdx);
    textAfter = rawInput.slice(endIdx + 1);
  } else {
    markerIndex = rawInput.indexOf(MARKERS.CONTINUE);
    textBefore = rawInput.slice(0, markerIndex);
    const secondMarker = rawInput.indexOf(MARKERS.CONTINUE, markerIndex + 1);
    if (secondMarker !== -1) {
      selectedRegion = rawInput.slice(markerIndex + 1, secondMarker).trim();
      textAfter = rawInput.slice(secondMarker + 1);
    } else {
      textAfter = rawInput.slice(markerIndex + 1);
    }
  }

  return {
    textBefore,
    textAfter,
    selectedRegion,
    markerIndex,
    lineNumber: getLineNumber(rawInput, markerIndex),
    columnNumber: getColumnNumber(rawInput, markerIndex),
    markerType,
  };
}

function detectPosition(cursor: CursorInfo): MarkerPosition {
  const before = cursor.textBefore.trim();
  const after = cursor.textAfter.trim();

  if (!before && !after) return 'EMPTY_DOCUMENT';
  if (cursor.selectedRegion) return 'REGION_SELECTED';
  if (!before) return 'START_OF_TEXT';
  if (!after) return 'END_OF_TEXT';

  if (/\n\s*\n\s*$/.test(cursor.textBefore)) return 'BETWEEN_BLOCKS';
  if (/^\s*\n\s*\n/.test(cursor.textAfter)) return 'BETWEEN_BLOCKS';
  if (/^\s*#{1,6}\s/.test(cursor.textAfter)) return 'BEFORE_HEADING';
  if (/#{1,6}\s+.+\n\s*$/.test(cursor.textBefore)) return 'AFTER_HEADING';
  if (/\n\s*$/.test(cursor.textBefore)) return 'BETWEEN_LINES';
  if (/[.!?]\s*$/.test(before)) return 'MID_PARAGRAPH';

  return 'MID_SENTENCE';
}

function inferIntent(
  markerType: MarkerName,
  position: MarkerPosition,
  cursor: CursorInfo,
  userInstruction: string,
): Intent {
  let type: IntentType;
  let instruction = userInstruction;

  switch (markerType) {
    case 'REWRITE_START':
      type = 'rewrite';
      break;
    case 'ENHANCE_START':
      type = 'expand';
      break;
    case 'DELETE_START':
      type = 'delete';
      break;
    default:
      if (cursor.selectedRegion && !userInstruction) {
        instruction = cursor.selectedRegion;
      }
      if (position === 'EMPTY_DOCUMENT') {
        type = 'generate';
      } else if (position === 'BETWEEN_BLOCKS') {
        type = 'insert';
      } else {
        type = 'continue';
      }
  }

  return { type, instruction };
}

function estimateTargetLength(intent: Intent, cursor: CursorInfo): number {
  if (intent.type === 'rewrite' || intent.type === 'expand') {
    const regionWords = countWords(cursor.selectedRegion);
    return intent.type === 'expand' ? regionWords * 2 : regionWords;
  }
  if (intent.type === 'delete') return 0;
  if (intent.type === 'generate') return 300;

  const existingWords = countWords(cursor.textBefore + cursor.textAfter);
  if (existingWords < 50) return 50;
  if (existingWords < 200) return 100;
  return 200;
}

// ─── Style Analysis ─────────────────────────────────────────

function buildAnalysisPrompt(
  beforeText: string,
  afterText: string,
  intentType: IntentType,
  targetLength: number,
): string {
  const actionLabel = intentType.toUpperCase();

  let prompt = `Analyze the writing style of the following text.\n\n`;
  prompt += `## Inputs\n\n`;
  prompt += `### BEFORE_TEXT\n<before_text>\n${beforeText}\n</before_text>\n\n`;
  prompt += `### AFTER_TEXT\n<after_text>\n${afterText}\n</after_text>\n\n`;
  prompt += `### GENERATION TARGET\n`;
  prompt += `- Requested length: ${targetLength} words\n`;
  prompt += `- Action type: ${actionLabel}\n\n`;
  prompt += `## Instructions\n\n`;
  prompt += `Based on the BEFORE_TEXT and AFTER_TEXT, extract the writing style. `;
  prompt += `Respond with ONLY a JSON object (no markdown fences) with these fields:\n`;
  prompt += `- "tense": the narrative tense (e.g. "past", "present")\n`;
  prompt += `- "pointOfView": the narrative POV (e.g. "third person limited (Elena)", "first person")\n`;
  prompt += `- "tone": comma-separated tone descriptors (e.g. "suspenseful, atmospheric")\n`;
  prompt += `- "formality": the writing register (e.g. "literary fiction", "casual", "academic")\n`;
  prompt += `- "genre": the genre (e.g. "dark fantasy", "sci-fi", "memoir")\n`;
  prompt += `- "notablePatterns": array of notable stylistic patterns (e.g. ["short punchy sentences", "heavy use of metaphor"])`;

  return prompt;
}

function parseStyleResponse(content: string): StyleProfile {
  const fallback: StyleProfile = {
    tense: 'past',
    pointOfView: 'third person',
    tone: 'neutral',
    formality: 'standard',
    genre: 'general',
    notablePatterns: [],
  };

  try {
    const parsed = JSON.parse(content);
    return {
      tense: parsed.tense || fallback.tense,
      pointOfView: parsed.pointOfView || fallback.pointOfView,
      tone: parsed.tone || fallback.tone,
      formality: parsed.formality || fallback.formality,
      genre: parsed.genre || fallback.genre,
      notablePatterns: parsed.notablePatterns || fallback.notablePatterns,
    };
  } catch {
    return fallback;
  }
}

async function analyzeStyle(
  beforeText: string,
  afterText: string,
  intentType: IntentType,
  targetLength: number,
): Promise<StyleProfile> {
  const prompt = buildAnalysisPrompt(
    beforeText,
    afterText,
    intentType,
    targetLength,
  );
  const model = createUnderstandingModel();
  const response = await model.invoke([{ role: 'user', content: prompt }]);
  const content = typeof response.content === 'string' ? response.content : '';
  return parseStyleResponse(content);
}

// ─── Prompt Building ────────────────────────────────────────

function formatStyleNotes(style: StyleProfile): string {
  const lines = [];
  if (style.tense) lines.push(`- Tense: ${style.tense}`);
  if (style.pointOfView) lines.push(`- POV: ${style.pointOfView}`);
  if (style.tone) lines.push(`- Tone: ${style.tone}`);
  if (style.formality) lines.push(`- Formality: ${style.formality}`);
  if (style.genre) lines.push(`- Genre: ${style.genre}`);
  if (style.notablePatterns.length > 0) {
    lines.push(`- Patterns: ${style.notablePatterns.join(', ')}`);
  }
  return lines.join('\n');
}

function buildWriterPrompt(
  intent: Intent,
  beforeParagraph: string,
  afterParagraph: string,
  styleProfile: StyleProfile,
  targetLength: number,
  selectedRegion: string,
  currentHeading: string,
): { system: string; user: string } {
  const system =
    `You are a skilled writer. Generate text that seamlessly fits the surrounding context.\n` +
    `Rules:\n` +
    `- Match the tone, style, and vocabulary of the existing text\n` +
    `- Output ONLY the generated text, no explanations or meta-commentary\n` +
    `- Target approximately ${targetLength} words`;

  let user = `## Inputs\n\n`;

  user += `### BEFORE_TEXT\n<before_text>\n${beforeParagraph}\n</before_text>\n\n`;
  user += `### AFTER_TEXT\n<after_text>\n${afterParagraph}\n</after_text>\n\n`;

  const styleNotes = formatStyleNotes(styleProfile);
  if (styleNotes) {
    user += `### STYLE_NOTES\n<style_notes>\n${styleNotes}\n</style_notes>\n\n`;
  }

  user += `### GENERATION TARGET\n`;
  user += `- Requested length: ${targetLength} words\n`;
  user += `- Action type: ${intent.type.toUpperCase()}\n\n`;

  switch (intent.type) {
    case 'continue':
      user += `Continue naturally from where the BEFORE_TEXT left off.`;
      if (afterParagraph) {
        user += ` The text must flow into the AFTER_TEXT.`;
      }
      break;

    case 'insert':
      user += `Write text that bridges between BEFORE_TEXT and AFTER_TEXT naturally.`;
      if (currentHeading) {
        user += `\nCurrent section: "${currentHeading}"`;
      }
      break;

    case 'rewrite':
      user += `Rewrite the following selected text while preserving its meaning:\n\n"${selectedRegion}"`;
      break;

    case 'expand':
      user += `Expand the following selected text with more detail:\n\n"${selectedRegion}"`;
      break;

    case 'delete':
      return { system: '', user: '' };

    case 'generate':
      user += `Generate a complete, well-structured piece of writing.`;
      break;
  }

  if (intent.instruction) {
    user += `\n\nAdditional instruction: ${intent.instruction}`;
  }

  return { system, user };
}

// ─── Stitching ──────────────────────────────────────────────

function stitch(
  cursor: CursorInfo,
  intent: Intent,
  generatedText: string,
): { finalDocument: string; diff: DiffInfo; changeDescription: string } {
  let finalDocument: string;
  let diff: DiffInfo;

  switch (intent.type) {
    case 'delete':
      finalDocument = (cursor.textBefore + cursor.textAfter).trim();
      diff = {
        type: 'delete',
        position: cursor.markerIndex,
        addedText: '',
        removedText: cursor.selectedRegion,
        addedWords: 0,
      };
      break;

    case 'rewrite':
    case 'expand':
      finalDocument = cursor.textBefore + generatedText + cursor.textAfter;
      diff = {
        type: 'replace',
        position: cursor.markerIndex,
        addedText: generatedText,
        removedText: cursor.selectedRegion,
        addedWords: countWords(generatedText),
      };
      break;

    case 'generate':
      finalDocument = generatedText;
      diff = {
        type: 'generate',
        position: 0,
        addedText: generatedText,
        removedText: '',
        addedWords: countWords(generatedText),
      };
      break;

    default:
      finalDocument = cursor.textBefore + generatedText + cursor.textAfter;
      diff = {
        type: 'insert',
        position: cursor.markerIndex,
        addedText: generatedText,
        removedText: '',
        addedWords: countWords(generatedText),
      };
  }

  return {
    finalDocument,
    diff,
    changeDescription: `${intent.type}: ${diff.addedWords} words`,
  };
}

// ─── Node ───────────────────────────────────────────────────

export async function writerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { rawInput, userInstruction } = state;

  const markerType = detectMarkerType(rawInput);
  const cursorInfo = extractCursorInfo(rawInput, markerType);
  const position = detectPosition(cursorInfo);
  const intent = inferIntent(markerType, position, cursorInfo, userInstruction);
  const targetLength = estimateTargetLength(intent, cursorInfo);

  const beforeParagraph = extractLastParagraph(cursorInfo.textBefore);
  const afterParagraph = extractFirstParagraph(cursorInfo.textAfter);
  const currentHeading = findCurrentHeading(cursorInfo.textBefore);

  if (intent.type === 'delete') {
    const result = stitch(cursorInfo, intent, '');
    return {
      cursorInfo,
      intent,
      documentState: {
        cleanText: stripAllMarkers(rawInput),
        wordCount: countWords(stripAllMarkers(rawInput)),
        position,
      },
      targetLength,
      ...result,
    };
  }

  const styleProfile =
    position === 'EMPTY_DOCUMENT'
      ? {
          tense: '',
          pointOfView: '',
          tone: '',
          formality: '',
          genre: '',
          notablePatterns: [],
        }
      : await analyzeStyle(
          beforeParagraph,
          afterParagraph,
          intent.type,
          targetLength,
        );

  const prompt = buildWriterPrompt(
    intent,
    beforeParagraph,
    afterParagraph,
    styleProfile,
    targetLength,
    cursorInfo.selectedRegion,
    currentHeading,
  );

  const model = createWriterModel();
  const response = await model.invoke([
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ]);

  const generatedText =
    typeof response.content === 'string' ? response.content.trim() : '';

  const result = stitch(cursorInfo, intent, generatedText);

  return {
    cursorInfo,
    intent,
    documentState: {
      cleanText: stripAllMarkers(rawInput),
      wordCount: countWords(stripAllMarkers(rawInput)),
      position,
    },
    styleProfile,
    targetLength,
    assembledPrompt: prompt,
    generatedText,
    processedText: generatedText,
    ...result,
  };
}
