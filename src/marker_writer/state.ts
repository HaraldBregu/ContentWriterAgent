import { Annotation } from '@langchain/langgraph';
import type {
  CursorInfo,
  Intent,
  DocumentState,
  Context,
  StyleProfile,
  Structure,
  AssembledPrompt,
  DiffInfo,
} from '@/marker_writer/types';

export const WriterState = Annotation.Root({
  // Input
  rawInput: Annotation<string>,
  userInstruction: Annotation<string>,

  // Layer 1
  cursorInfo: Annotation<CursorInfo>,
  intent: Annotation<Intent>,
  documentState: Annotation<DocumentState>,

  // Layer 2
  context: Annotation<Context>,
  styleProfile: Annotation<StyleProfile>,
  structure: Annotation<Structure>,
  targetLength: Annotation<number>,

  // Layer 3
  assembledPrompt: Annotation<AssembledPrompt>,
  generatedText: Annotation<string>,

  // Layer 4
  processedText: Annotation<string>,
  coherencePass: Annotation<boolean>,
  coherenceFeedback: Annotation<string>,
  retryCount: Annotation<number>,

  // Layer 5
  finalDocument: Annotation<string>,
  diff: Annotation<DiffInfo>,
  changeDescription: Annotation<string>,
});

export type WriterStateValue = typeof WriterState.State;
