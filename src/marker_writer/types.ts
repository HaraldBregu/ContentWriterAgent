import type { MarkerName } from '@/marker_writer/markers';

// Every possible relationship between the marker and existing text.
// The parser classifies into one of these deterministically.
export type MarkerPosition =
  | 'END_OF_TEXT' //  text text text█          → append
  | 'START_OF_TEXT' //  █text text text          → prepend
  | 'BETWEEN_BLOCKS' //  text\n\n█\n\ntext        → bridge between sections
  | 'MID_PARAGRAPH' //  text. █text. text        → insert between sentences
  | 'MID_SENTENCE' //  text word█ word text     → insert mid-sentence
  | 'AFTER_HEADING' //  ## Heading\n█             → start new section
  | 'BEFORE_HEADING' //  text\n█\n## Heading       → end section before next
  | 'INLINE_END' //  text text█\nmore text    → continue at end of line
  | 'EMPTY_DOCUMENT' //  █                         → nothing exists, generate
  | 'BETWEEN_LINES' //  line1\n█\nline2           → insert between lines
  | 'REGION_SELECTED' //  text⟨START⟩selected⟨END⟩text → operate on region
  | 'AMBIGUOUS'; //  needs LLM to resolve

// What the agent should DO based on position
export type OperationType =
  | 'CONTINUE' //  write new content at marker
  | 'BRIDGE' //  connect text-before to text-after
  | 'PREPEND' //  write content before existing text
  | 'GENERATE' //  empty doc, write from scratch
  | 'FILL_SECTION' //  write section content after heading
  | 'REWRITE_REGION' //  rewrite marked region
  | 'ENHANCE_REGION' //  enhance marked region
  | 'DELETE_REGION'; //  delete marked region

// Complete, unambiguous description of the writing task derived from markers.
export interface ParsedInput {
  markerType: MarkerName;
  markerPosition: MarkerPosition;
  operationType: OperationType;

  textBefore: string;
  textAfter: string;
  selectedRegion: string;

  immediateBefore: string; // last ~500 chars before marker
  immediateAfter: string; // first ~500 chars after marker
  lastSentenceBefore: string;
  firstSentenceAfter: string;

  isInsideParagraph: boolean;
  isInsideSentence: boolean;
  isAfterHeading: boolean;
  isBeforeHeading: boolean;
  currentHeading: string;
  previousHeading: string;
  nextHeading: string;

  totalCharsBefore: number;
  totalCharsAfter: number;
  documentWordCount: number;
  markerCharIndex: number;
  markerLineNumber: number; // 1-indexed
  markerColumnNumber: number; // 1-indexed
}
