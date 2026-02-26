import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentState } from "../types/state";
import { workerNode } from "../agents/workerAgent";
import { evaluatorNode } from "../agents/evaluatorAgent";

// Define routing functions
function workerRouter(state: AgentState): string {
  // In this simplified version, we always route to evaluator
  // In a more complex version with tools, we'd check if tool_calls exist
  return "evaluator";
}

function evaluationRouter(state: AgentState): string {
  if (state.successCriteriaMet || state.userInputNeeded) {
    return "end";
  }
  return "worker";
}

export function createSidekickGraph() {
  const graph = new StateGraph({} as any);

  // Add nodes
  graph.addNode("worker", workerNode);
  graph.addNode("evaluator", evaluatorNode);

  // Add edges
  graph.addConditionalEdges("worker" as any, workerRouter, {
    evaluator: "evaluator",
  } as any);

  graph.addConditionalEdges("evaluator" as any, evaluationRouter, {
    worker: "worker",
    end: END,
  } as any);

  graph.addEdge(START, "worker" as any);

  return graph.compile();
}

export type CompiledGraph = ReturnType<typeof createSidekickGraph>;
