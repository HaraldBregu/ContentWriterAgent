import { Annotation } from '@langchain/langgraph';

export const WriterState = Annotation.Root({
  inputText: Annotation<string>,
  instruction: Annotation<string>,
  generatedText: Annotation<string>,
});

export type WriterStateValue = typeof WriterState.State;
