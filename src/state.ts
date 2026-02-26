import { Annotation } from "@langchain/langgraph";

export interface AttemptRecord {
  continuation: string;
  score: number;
  feedback: string;
}

export const WritingState = Annotation.Root({
  inputText: Annotation<string>({
    reducer: (a, b) => b ?? a,
    default: () => "",
  }),
  continuation: Annotation<string>({
    reducer: (a, b) => b ?? a,
    default: () => "",
  }),
  evaluationScore: Annotation<number>({
    reducer: (a, b) => b ?? a,
    default: () => 0,
  }),
  evaluationFeedback: Annotation<string>({
    reducer: (a, b) => b ?? a,
    default: () => "",
  }),
  passed: Annotation<boolean>({
    reducer: (a, b) => b ?? a,
    default: () => false,
  }),
  iteration: Annotation<number>({
    reducer: (a, b) => (b ?? a) + 1,
    default: () => 0,
  }),
  maxIterations: Annotation<number>({
    reducer: (a, b) => b ?? a,
    default: () => 3,
  }),
  history: Annotation<AttemptRecord[]>({
    reducer: (a, b) => [...(a ?? []), ...(b ?? [])],
    default: () => [],
  }),
});

export type WritingStateValue = typeof WritingState.State;
