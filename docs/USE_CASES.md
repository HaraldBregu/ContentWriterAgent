# Use Cases

Atlas supports two writing modes: the **Writing Graph** for standalone text generation with iterative refinement, and the **Marker Writer** for cursor-aware insertions inside existing documents. Below are practical examples for each.

---

## Writing Graph

The Writing Graph generates a continuation of the given text and refines it through an evaluate-rewrite loop until quality passes.

### Text Completion

Continue a piece of text that trails off or ends abruptly.

```ts
const result = await graph.invoke({
  inputText:
    'The discovery of penicillin in 1928 changed the course of modern medicine. Before antibiotics,',
});
// → generates a 200-400 word continuation about the pre-antibiotic era and the impact of the discovery
```

### Text Continuation

Extend a fully-formed passage with new content that follows naturally.

```ts
const result = await graph.invoke({
  inputText:
    'Remote work became the default for millions during the pandemic. Companies scrambled to adopt collaboration tools, and employees adjusted to blurred boundaries between home and office.',
});
// → continues with the longer-term effects, return-to-office debates, hybrid models, etc.
```

---

## Marker Writer

The Marker Writer uses invisible Unicode markers (`U+E000`–`U+E007`) inserted at the cursor position to determine exactly where and how to write. The frontend inserts the marker; the agent handles the rest.

```ts
import { CONTINUE_MARKER, MARKERS } from '@/marker_writer/markers';

const app = createMarkerWriterGraph();
const M = CONTINUE_MARKER;
```

### Continue at End of Document

Cursor is at the very end. The agent appends new content.

```ts
const result = await app.invoke({
  rawInput: `The history of coffee begins in Ethiopia, where legend says a goat herder named Kaldi noticed his goats dancing after eating berries from a certain tree.${M}`,
  userInstruction: '',
});
// position: END_OF_TEXT | operation: CONTINUE
```

### Prepend at Start of Document

Cursor is at the very beginning. The agent writes an introduction before the existing text.

```ts
const result = await app.invoke({
  rawInput: `${M}The three main challenges facing remote teams are communication overhead, timezone coordination, and maintaining culture.`,
  userInstruction: 'write an engaging introduction',
});
// position: START_OF_TEXT | operation: PREPEND
```

### Bridge Between Sections

Cursor sits between two sections. The agent writes content that connects them.

```ts
const result = await app.invoke({
  rawInput: `## Introduction

Artificial intelligence has transformed how we process information.

${M}

## Conclusion

The future of AI depends on responsible development and thoughtful regulation.`,
  userInstruction: 'write the main body',
});
// position: BETWEEN_BLOCKS | operation: BRIDGE
```

### Mid-Sentence Completion

Cursor is inside an incomplete sentence. The agent finishes the sentence and connects to the text that follows.

```ts
const result = await app.invoke({
  rawInput: `The three most important factors in building a successful startup are${M} which together determine whether a company can survive its first two years.`,
  userInstruction: '',
});
// position: MID_SENTENCE | operation: BRIDGE
```

### Mid-Paragraph Insertion

Cursor is between two sentences in the same paragraph. The agent adds sentences that flow naturally on both sides.

```ts
const result = await app.invoke({
  rawInput: `Coffee consumption has risen steadily over the past decade. ${M}Today, the average American drinks over three cups per day.`,
  userInstruction: 'add a sentence about why consumption increased',
});
// position: MID_PARAGRAPH | operation: BRIDGE
```

### Fill a Section After a Heading

Cursor is right after a heading with no body yet. The agent generates content for that section.

```ts
const result = await app.invoke({
  rawInput: `## The Bebop Revolution

${M}

## Cool Jazz and Beyond

In reaction to bebop's intensity, cool jazz emerged in the late 1940s.`,
  userInstruction: '',
});
// position: AFTER_HEADING | operation: FILL_SECTION
```

### Generate from Empty Document

Cursor is placed in a blank document. The agent generates an entire piece from scratch, guided by the instruction.

```ts
const result = await app.invoke({
  rawInput: `${M}`,
  userInstruction: 'write a blog post about sustainable urban farming',
});
// position: EMPTY_DOCUMENT | operation: GENERATE
```

### Inline Instruction (Paired CONTINUE Markers)

Two `CONTINUE` markers can wrap an inline instruction. The agent extracts the instruction, strips it from the document, and uses it to guide generation at that position.

```ts
// Complete sentence — instruction tells the agent what to add
const result = await app.invoke({
  rawInput: `The history of coffee begins in Ethiopia.${M} add a sentence about trade routes ${M}`,
  userInstruction: '',
});
// → extracts "add a sentence about trade routes" as the instruction
// position: END_OF_TEXT | operation: CONTINUE
```

```ts
// Mid-sentence — instruction tells the agent how to finish
const result = await app.invoke({
  rawInput: `The three most important factors are${M} finish the sentence ${M}`,
  userInstruction: '',
});
// → extracts "finish the sentence" as the instruction
// position: MID_SENTENCE | operation: CONTINUE
```

### Rewrite a Selected Region

A region of text is wrapped with paired markers. The agent rewrites just that region while keeping the surrounding text intact.

```ts
const result = await app.invoke({
  rawInput: `The conference was great. ${MARKERS.REWRITE_START}It was really good and had many nice speakers who talked about interesting things.${MARKERS.REWRITE_END} I look forward to next year.`,
  userInstruction: 'make the highlighted part more vivid and specific',
});
// position: REGION_SELECTED | operation: REWRITE_REGION
```

---

## Markers Reference

| Marker                          | Code Point          | Purpose                            |
| ------------------------------- | ------------------- | ---------------------------------- |
| `CONTINUE`                      | `U+E000`            | Write new content at this position |
| `REWRITE_START` / `REWRITE_END` | `U+E001` / `U+E002` | Mark region to rewrite             |
| `ENHANCE_START` / `ENHANCE_END` | `U+E003` / `U+E004` | Mark region to enhance             |
| `DELETE_START` / `DELETE_END`   | `U+E005` / `U+E006` | Mark region to delete              |
| `COMMENT`                       | `U+E007`            | Inline comment/instruction         |

---

## Graph Routing

The Marker Writer uses conditional routing to optimize performance based on the input.

### Fast Path

When the marker is a simple `CONTINUE` on a document with ≥ 50 words and no user instruction, the graph skips all LLM-based analysis and uses deterministic heuristics to build intent, style, and plan. This reduces the pipeline from 4 LLM calls to 1.

```ts
// Fast path — only the writer LLM runs
const result = await app.invoke({
  rawInput: `Long existing document with many paragraphs of content...${M}`,
  userInstruction: '', // no instruction → fast path
});
```

### Full Path

For complex operations — bridging, prepending, generating, rewriting — or when user instructions are provided, the graph runs the full analysis pipeline with intent analyzer, style analyzer, and planner.

```ts
// Full path — all analysis nodes run
const result = await app.invoke({
  rawInput: `Paragraph one.\n\n${M}\n\nParagraph two.`,
  userInstruction: 'write a transition paragraph',
});
```

### Evaluator Loop

After the writer generates text, an evaluator checks seam coherence, voice match, and repetition. If the output fails, the writer retries with specific feedback (up to 2 retries).

The evaluator runs for `CONTINUE`, `BRIDGE`, `PREPEND`, and `FILL_SECTION` operations. It is skipped for `REWRITE_REGION`, `ENHANCE_REGION`, `DELETE_REGION`, and `GENERATE`.

For full architecture details, see [GRAPH.md](./GRAPH.md).
