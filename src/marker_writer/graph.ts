import { StateGraph, MemorySaver } from '@langchain/langgraph';
import { WriterState } from '@/marker_writer/state';
import { inputParserNode } from '@/marker_writer/nodes/input-parser';
import { writerNode } from '@/marker_writer/nodes/writer';
import { stitcherNode } from '@/marker_writer/nodes/stitcher';

export function createMarkerWriterGraph() {
  const graph = new StateGraph(WriterState)
    .addNode('input_parser', inputParserNode)
    .addNode('writer', writerNode)
    .addNode('stitcher', stitcherNode)
    .addEdge('__start__', 'input_parser')
    .addEdge('input_parser', 'writer')
    .addEdge('writer', 'stitcher')
    .addEdge('stitcher', '__end__');

  return graph.compile({ checkpointer: new MemorySaver() });
}
