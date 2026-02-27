import { StateGraph, START, END } from "@langchain/langgraph";
import { WritingState, WritingStateValue } from "@/state";
import { writerNode } from "@/nodes/writer";
import { evaluatorNode } from "@/nodes/evaluator";
import { formatterNode } from "@/nodes/formatter";

function router(state: WritingStateValue): string {
  const { passed, iteration, maxIterations } = state;

  if (passed) {
    console.log("[router] Evaluation passed, routing to formatter");
    return "end";
  }

  if (iteration >= maxIterations) {
    console.log(
      `[router] Max iterations (${maxIterations}) reached, routing to formatter with best attempt`
    );
    return "end";
  }

  console.log("[router] Evaluation failed, routing back to writer");
  return "writer";
}

export function createWritingGraph() {
  const graph = new StateGraph(WritingState as any);

  // Add nodes
  graph.addNode("writer", writerNode);
  graph.addNode("evaluator", evaluatorNode);
  graph.addNode("formatter", formatterNode);

  // Add edges
  graph.addEdge(START as any, "writer" as any);
  graph.addEdge("writer" as any, "evaluator" as any);
  graph.addConditionalEdges("evaluator" as any, router, {
    writer: "writer",
    end: "formatter",
  } as any);
  graph.addEdge("formatter" as any, END);

  return graph.compile();
}

export type WritingGraph = ReturnType<typeof createWritingGraph>;
