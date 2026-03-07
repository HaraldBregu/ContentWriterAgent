import { MARKERS } from '@/marker_writer/markers';
import { createUnderstandingModel } from '@/marker_writer/models';
import type { MarkerName } from '@/marker_writer/markers';
import type { WriterStateValue } from '@/marker_writer/state';
import type {
  CursorInfo,
  Intent,
  DocumentState,
  Context,
  Structure,
  StyleProfile,
  MarkerPosition,
  IntentType,
} from '@/marker_writer/types';
import {
  stripAllMarkers,
  extractLastSentence,
  extractFirstSentence,
  extractLastParagraph,
  extractFirstParagraph,
  findCurrentHeading,
  findPreviousHeading,
  findNextHeading,
  countWords,
  getLineNumber,
  getColumnNumber,
} from '@/marker_writer/helpers';

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

export async function inputParserNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { rawInput, userInstruction } = state;

  const markerType = detectMarkerType(rawInput);
  const cursorInfo = extractCursorInfo(rawInput, markerType);
  const position = detectPosition(cursorInfo);
  const intent = inferIntent(markerType, position, cursorInfo, userInstruction);
  const cleanText = stripAllMarkers(rawInput);
  const targetLength = estimateTargetLength(intent, cursorInfo);

  const documentState: DocumentState = {
    cleanText,
    wordCount: countWords(cleanText),
    position,
  };

  const context: Context = {
    immediateBefore: cursorInfo.textBefore.slice(-500),
    immediateAfter: cursorInfo.textAfter.slice(0, 500),
    beforeParagraph: extractLastParagraph(cursorInfo.textBefore),
    afterParagraph: extractFirstParagraph(cursorInfo.textAfter),
    lastSentenceBefore: extractLastSentence(cursorInfo.textBefore),
    firstSentenceAfter: extractFirstSentence(cursorInfo.textAfter),
    isInsideParagraph:
      position === 'MID_PARAGRAPH' || position === 'MID_SENTENCE',
    isInsideSentence: position === 'MID_SENTENCE',
  };

  const structure: Structure = {
    currentHeading: findCurrentHeading(cursorInfo.textBefore),
    previousHeading: findPreviousHeading(cursorInfo.textBefore),
    nextHeading: findNextHeading(cursorInfo.textAfter),
    isAfterHeading: position === 'AFTER_HEADING',
    isBeforeHeading: position === 'BEFORE_HEADING',
  };

  let styleProfile: StyleProfile;

  if (intent.type === 'delete' || position === 'EMPTY_DOCUMENT') {
    styleProfile = {
      tense: '',
      pointOfView: '',
      tone: '',
      formality: '',
      genre: '',
      notablePatterns: [],
    };
  } else {
    const prompt = buildAnalysisPrompt(
      context.immediateBefore,
      context.immediateAfter,
      intent.type,
      targetLength,
    );
    const model = createUnderstandingModel();
    const response = await model.invoke([
      { role: 'user', content: prompt },
    ]);
    const content =
      typeof response.content === 'string' ? response.content : '';
    styleProfile = parseStyleResponse(content);
  }

  return {
    cursorInfo,
    intent,
    documentState,
    context,
    structure,
    styleProfile,
    targetLength,
  };
}
