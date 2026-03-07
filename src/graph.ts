import { StateGraph } from "@langchain/langgraph";
import { WritingState } from "@/state";
import { writerNode } from "@/nodes/writer";
import { evaluatorNode } from "@/nodes/evaluator";

function shouldContinue(state: typeof WritingState.State): string {
  if (state.passed || state.iteration >= state.maxIterations) return "__end__";
  return "writer";
}

export function createWritingGraph() {
  const graph = new StateGraph(WritingState)
    .addNode("writer", writerNode)
    .addNode("evaluator", evaluatorNode)
    .addEdge("__start__", "writer")
    .addEdge("writer", "evaluator")
    .addConditionalEdges("evaluator", shouldContinue);

  return graph.compile();
}
