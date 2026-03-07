import type { MarkerName } from '@/marker_writer/markers';

// ─── Layer 1 Types ───────────────────────────────────────────

export type MarkerPosition =
  | 'END_OF_TEXT'
  | 'START_OF_TEXT'
  | 'BETWEEN_BLOCKS'
  | 'MID_PARAGRAPH'
  | 'MID_SENTENCE'
  | 'AFTER_HEADING'
  | 'BEFORE_HEADING'
  | 'INLINE_END'
  | 'EMPTY_DOCUMENT'
  | 'BETWEEN_LINES'
  | 'REGION_SELECTED';

export type IntentType =
  | 'continue'
  | 'insert'
  | 'rewrite'
  | 'expand'
  | 'delete'
  | 'generate';

export interface CursorInfo {
  textBefore: string;
  textAfter: string;
  selectedRegion: string;
  markerIndex: number;
  lineNumber: number;
  columnNumber: number;
  markerType: MarkerName;
}

export interface Intent {
  type: IntentType;
  instruction: string;
}

export interface DocumentState {
  cleanText: string;
  wordCount: number;
  position: MarkerPosition;
}

// ─── Layer 2 Types ───────────────────────────────────────────

export interface Context {
  immediateBefore: string;
  immediateAfter: string;
  lastSentenceBefore: string;
  firstSentenceAfter: string;
  isInsideParagraph: boolean;
  isInsideSentence: boolean;
}

export interface StyleProfile {
  tone: string;
  avgSentenceLength: number;
  paragraphStyle: string;
  vocabulary: string;
  pointOfView: string;
  tense: string;
  notablePatterns: string[];
}

export interface Structure {
  currentHeading: string;
  previousHeading: string;
  nextHeading: string;
  isAfterHeading: boolean;
  isBeforeHeading: boolean;
}

// ─── Layer 3 Types ───────────────────────────────────────────

export interface AssembledPrompt {
  system: string;
  user: string;
}

// ─── Layer 5 Types ───────────────────────────────────────────

export interface DiffInfo {
  type: 'insert' | 'replace' | 'delete' | 'generate';
  position: number;
  addedText: string;
  removedText: string;
  addedWords: number;
}
