import { Annotation } from '@langchain/langgraph';
import type { ParsedInput } from '@/marker_writer/types';

export const WriterState = Annotation.Root({
  // Raw input
  rawInput: Annotation<string>,
  userInstruction: Annotation<string>,
  knowledgeBasePath: Annotation<string>,

  // Parsed (from Input Parser)
  parsedInput: Annotation<ParsedInput>,

  // Intent (from Intent Analyzer)
  intentAnalysis: Annotation<{
    contentType: string;
    writingIntent: string;
    topic: string;
    audience: string;
    desiredTone: string;
    desiredLength: string;
    keyMessage: string;
    constraints: string[];
  }>,

  // Style (from Style Analyzer)
  styleProfile: Annotation<{
    tone: string;
    avgSentenceLength: number;
    paragraphStyle: string;
    vocabulary: string;
    pointOfView: string;
    tense: string;
    notablePatterns: string[];
  }>,

  // Writing plan (from Planner)
  writingPlan: Annotation<{
    approach: string;
    topics: string[];
    transitionIn: string;
    transitionOut: string;
    constraints: string[];
    targetWords: number;
  }>,

  // Output
  generatedText: Annotation<string>,
  finalDocument: Annotation<string>,
  changeDescription: Annotation<string>,

  // Memory
  userPreferences: Annotation<Record<string, string>>({
    reducer: (a, b) => ({ ...a, ...b }),
  }),
  conversationHistory: Annotation<Array<{ role: string; content: string }>>({
    reducer: (a, b) => [...a, ...b],
  }),
});

export type WriterStateValue = typeof WriterState.State;
