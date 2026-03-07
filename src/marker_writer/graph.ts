import { StateGraph, START, END } from '@langchain/langgraph';
import { MemorySaver } from '@langchain/langgraph';
import { WriterState, WriterStateValue } from '@/marker_writer/state';
import { cursorDetectorNode } from '@/marker_writer/nodes/cursor-detector';
import { intentRouterNode } from '@/marker_writer/nodes/intent-router';
import { documentStateManagerNode } from '@/marker_writer/nodes/document-state-manager';
import { contextExtractorNode } from '@/marker_writer/nodes/context-extractor';
import { styleProfilerNode } from '@/marker_writer/nodes/style-profiler';
import { structureAnalyzerNode } from '@/marker_writer/nodes/structure-analyzer';
import { lengthParserNode } from '@/marker_writer/nodes/length-parser';
import { promptAssemblerNode } from '@/marker_writer/nodes/prompt-assembler';
import { llmNode } from '@/marker_writer/nodes/llm-node';
import { postProcessorNode } from '@/marker_writer/nodes/post-processor';
import { coherenceValidatorNode } from '@/marker_writer/nodes/coherence-validator';
import { stitcherNode } from '@/marker_writer/nodes/stitcher';

//  ┌─────────── LAYER 1 ──────────────────────────────┐
//  │                                                   │
//  │  START ──┬──► cursor_detector ──┐                 │
//  │          └──► intent_router ────┤                 │
//  │                                 ▼                 │
//  │                    document_state_manager         │
//  │                                                   │
//  └─────────────────────┬────────────────────────────┘
//                        │
//  ┌─────────── LAYER 2 ─┴───────────────────────────┐
//  │                                                   │
//  │  ┬──► context_extractor ──┐                       │
//  │  ├──► style_profiler ─────┤                       │
//  │  └──► structure_analyzer ─┤                       │
//  │                           ▼                       │
//  │                     length_parser                 │
//  │                                                   │
//  └─────────────────────┬────────────────────────────┘
//                        │
//  ┌─────────── LAYER 3 ─┴───────────────────────────┐
//  │                                                   │
//  │  prompt_assembler ──► llm_node                    │
//  │                                                   │
//  └─────────────────────┬────────────────────────────┘
//                        │
//  ┌─────────── LAYER 4 ─┴───────────────────────────┐
//  │                                                   │
//  │  post_processor ──► coherence_validator           │
//  │                      │         │                  │
//  │               [pass] │  [retry]│                  │
//  │                      ▼         └──► prompt_       │
//  │                   stitcher       assembler (L3)   │
//  │                                                   │
//  └─────────────────────┬────────────────────────────┘
//                        │
//  ┌─────────── LAYER 5 ─┴───────────────────────────┐
//  │                                                   │
//  │  stitcher ──► END                                 │
//  │  (text stitcher + diff highlighter +              │
//  │   document state updater)                         │
//  │                                                   │
//  └──────────────────────────────────────────────────┘

const VALIDATABLE_INTENTS = new Set(['continue', 'insert', 'expand']);

function routeAfterValidation(state: WriterStateValue): string {
  if (state.coherencePass) return 'pass';
  if ((state.retryCount ?? 0) >= 2) return 'pass';
  return 'retry';
}

function routeAfterPostProcess(state: WriterStateValue): string {
  if (VALIDATABLE_INTENTS.has(state.intent.type)) return 'validate';
  return 'skip';
}

export function createMarkerWriterGraph() {
  const memory = new MemorySaver();

  const graph = new StateGraph(WriterState)
    // Layer 1
    .addNode('cursor_detector', cursorDetectorNode)
    .addNode('intent_router', intentRouterNode)
    .addNode('document_state_manager', documentStateManagerNode)
    // Layer 2
    .addNode('context_extractor', contextExtractorNode)
    .addNode('style_profiler', styleProfilerNode)
    .addNode('structure_analyzer', structureAnalyzerNode)
    .addNode('length_parser', lengthParserNode)
    // Layer 3
    .addNode('prompt_assembler', promptAssemblerNode)
    .addNode('llm_node', llmNode)
    // Layer 4
    .addNode('post_processor', postProcessorNode)
    .addNode('coherence_validator', coherenceValidatorNode)
    // Layer 5
    .addNode('stitcher', stitcherNode)

    // ─── Layer 1 edges ───
    .addEdge(START, 'cursor_detector')
    .addEdge('cursor_detector', 'intent_router')
    .addEdge('intent_router', 'document_state_manager')

    // ─── Layer 2 edges (fan-out → fan-in) ───
    .addEdge('document_state_manager', 'context_extractor')
    .addEdge('document_state_manager', 'style_profiler')
    .addEdge('document_state_manager', 'structure_analyzer')
    .addEdge('context_extractor', 'length_parser')
    .addEdge('style_profiler', 'length_parser')
    .addEdge('structure_analyzer', 'length_parser')

    // ─── Layer 3 edges ───
    .addEdge('length_parser', 'prompt_assembler')
    .addEdge('prompt_assembler', 'llm_node')

    // ─── Layer 4 edges ───
    .addEdge('llm_node', 'post_processor')
    .addConditionalEdges('post_processor', routeAfterPostProcess, {
      validate: 'coherence_validator',
      skip: 'stitcher',
    })
    .addConditionalEdges('coherence_validator', routeAfterValidation, {
      pass: 'stitcher',
      retry: 'prompt_assembler',
    })

    // ─── Layer 5 edges ───
    .addEdge('stitcher', END);

  return graph.compile({ checkpointer: memory });
}
