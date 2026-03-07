import { StateGraph, MemorySaver } from '@langchain/langgraph';
import { WriterState } from '@/marker_writer/state';
import { writerNode } from '@/marker_writer/nodes/writer';

export function createMarkerWriterGraph() {
  const graph = new StateGraph(WriterState)
    .addNode('writer', writerNode)
    .addEdge('__start__', 'writer')
    .addEdge('writer', '__end__');

  return graph.compile({ checkpointer: new MemorySaver() });
}
