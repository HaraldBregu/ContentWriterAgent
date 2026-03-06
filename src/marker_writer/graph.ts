import { StateGraph, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { WriterState } from '@/marker_writer/state';
import { inputParserNode } from '@/marker_writer/nodes/input-parser';
import { intentAnalyzerNode } from '@/marker_writer/nodes/intent-analyzer';
import { styleAnalyzerNode } from '@/marker_writer/nodes/style-analyzer';
import { plannerNode } from '@/marker_writer/nodes/planner';
import { writerNode } from '@/marker_writer/nodes/writer';
import { stitcherNode } from '@/marker_writer/nodes/stitcher';

//  ┌─────────────────────────────────────────────────────────────┐
//  │                                                             │
//  │  START → input_parser → intent_analyzer → style_analyzer    │
//  │                                                  │          │
//  │                                                  ▼          │
//  │                                              planner        │
//  │                                                  │          │
//  │                                                  ▼          │
//  │                                               writer        │
//  │                                                  │          │
//  │                                                  ▼          │
//  │                                              stitcher       │
//  │                                                  │          │
//  │                                                  ▼          │
//  │                                                 END         │
//  │                                                             │
//  └─────────────────────────────────────────────────────────────┘

export function createMarkerWriterGraph() {
  const memory = new MemorySaver();

  const graph = new StateGraph(WriterState)
    .addNode('input_parser', inputParserNode)
    .addNode('intent_analyzer', intentAnalyzerNode)
    .addNode('style_analyzer', styleAnalyzerNode)
    .addNode('planner', plannerNode)
    .addNode('writer', writerNode)
    .addNode('stitcher', stitcherNode)
    .addEdge(START, 'input_parser')
    .addEdge('input_parser', 'intent_analyzer')
    .addEdge('intent_analyzer', 'style_analyzer')
    .addEdge('style_analyzer', 'planner')
    .addEdge('planner', 'writer')
    .addEdge('writer', 'stitcher')
    .addEdge('stitcher', END);

  return graph.compile({ checkpointer: memory });
}
