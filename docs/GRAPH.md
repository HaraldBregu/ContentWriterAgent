# Agent Graph Architecture

Atlas contains two LangGraph state graphs: the **Writing Graph** (main continuation agent) and the **Marker Writer Graph** (marker-based writing agent).

---

## Writing Graph

A write–evaluate–rewrite loop that generates text continuations and iteratively improves them based on evaluator feedback.

```
START
  │
  ▼
writer ──────► evaluator
  ▲                │
  │            (conditional)
  │               / \
  │     failed   /   \  passed OR
  │     ────────┘     │ max iterations
  │                   ▼
  │               formatter
  │                   │
  │                   ▼
  │                  END
  │
  └── retry loop (up to maxIterations)
```

### Nodes

| Node          | File                     | Description                                                                                                                                                        |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **writer**    | `src/nodes/writer.ts`    | Generates a 200–400 word continuation of the input text using an LLM. On retries, incorporates evaluator feedback to revise the output.                            |
| **evaluator** | `src/nodes/evaluator.ts` | Scores the continuation on coherence, style consistency, quality, and flow (0–10). Returns a `passed` boolean based on the configured `passThreshold` (default 7). |
| **formatter** | `src/nodes/formatter.ts` | Lightly polishes the final continuation — fixes phrasing and flow without altering meaning.                                                                        |

### Routing

The **router** function (`src/graph.ts`) runs after the evaluator:

- If `passed === true` → route to **formatter**
- If `iteration >= maxIterations` → route to **formatter** with best attempt
- Otherwise → route back to **writer** for another revision

### State

Defined in `src/state.ts`:

| Field                   | Type              | Purpose                                      |
| ----------------------- | ----------------- | -------------------------------------------- |
| `inputText`             | `string`          | Original text to continue                    |
| `continuation`          | `string`          | Generated continuation                       |
| `formattedContinuation` | `string`          | Polished final output                        |
| `evaluationScore`       | `number`          | Score from evaluator (0–10)                  |
| `evaluationFeedback`    | `string`          | Feedback for revision                        |
| `passed`                | `boolean`         | Whether the continuation passed evaluation   |
| `iteration`             | `number`          | Current iteration (auto-increments)          |
| `maxIterations`         | `number`          | Maximum allowed iterations (default 3)       |
| `history`               | `AttemptRecord[]` | Log of all attempts with scores and feedback |

---

## Marker Writer Graph

A pipeline that takes a document with a Unicode marker at the cursor position, analyzes the context, plans the writing, generates text, evaluates quality, and stitches the result back into the document.

The graph uses **conditional routing** to pick the optimal path based on the input:

- **Fast path** — for simple continuations on documents with enough context (≥ 50 words, no user instruction). Skips all LLM analysis nodes and uses deterministic heuristics instead. Result: 1 LLM call instead of 4.
- **Full path** — for complex operations (bridge, prepend, generate, fill section, rewrite) or when user instructions are provided. Runs the full analysis pipeline.

Both paths include an **evaluator loop** that checks seam coherence, voice matching, and repetition, retrying the writer up to 2 times if quality fails.

### How It Works

The frontend inserts an invisible Unicode marker at the user's cursor position and sends the full text to the agent:

```ts
// User clicks in the middle of their text → frontend inserts marker
const textWithMarker = textBefore + '\uE000' + textAfter;
// Send to agent
agent.invoke({ rawInput: textWithMarker });
```

### Every Pattern It Handles

```
PATTERN                           DETECTED AS           OPERATION
──────────────────────────────────────────────────────────────────
text text text█                   END_OF_TEXT            CONTINUE
█text text text                   START_OF_TEXT          PREPEND
text\n\n█\n\ntext                 BETWEEN_BLOCKS         BRIDGE
text.\n█\n\ntext                  BETWEEN_BLOCKS         BRIDGE
text. █Text. text                 MID_PARAGRAPH          BRIDGE
text word█ word text              MID_SENTENCE           BRIDGE
## Heading\n█                     AFTER_HEADING          FILL_SECTION
text\n█\n## Heading               BEFORE_HEADING         BRIDGE
text text█\nmore text             INLINE_END             BRIDGE
█                                 EMPTY_DOCUMENT         GENERATE
text⟨START⟩region⟨END⟩text       REGION_SELECTED        REWRITE_REGION
```

### The Graph

```
START
  │
  ▼
┌──────────────┐
│ INPUT PARSER  │  ← NO LLM. Pure string parsing. Instant. Free.
│               │     Finds markers, classifies pattern, extracts all context.
└──────┬───────┘
       │
  routeAfterParse
       │
       ├──── [fast] ──────────────────┐
       │  CONTINUE, ≥50 words,        │
       │  no user instruction          │
       │                               ▼
       │                    ┌────────────────────┐
       │                    │ FAST CONTEXT        │  ← NO LLM. Deterministic.
       │                    │ BUILDER             │     Builds intent, style,
       │                    │                     │     and plan from parsed signals.
       │                    └─────────┬──────────┘
       │                              │
       ├──── [full] ──────┐           │
       │                  ▼           │
       │       ┌──────────────┐       │
       │       │ INTENT       │       │
       │       │ ANALYZER     │       │
       │       └──────┬───────┘       │
       │              │               │
       │              ▼               │
       │       ┌──────────────┐       │
       │       │ STYLE        │       │
       │       │ ANALYZER     │       │
       │       └──────┬───────┘       │
       │              │               │
       │              ▼               │
       │       ┌──────────────┐       │
       │       │ PLANNER      │       │
       │       └──────┬───────┘       │
       │              │               │
       │              └───────────────┤
       │                              │
       │                              ▼
       │                    ┌──────────────┐
       │                    │ WRITER       │ ◄──── retry (max 2)
       │                    └──────┬───────┘        │
       │                           │                │
       │                     routeEvaluator          │
       │                      ┌────┤                │
       │                      │    │                │
       │               [skip] │    │ [check]        │
       │                      │    ▼                │
       │                      │  ┌──────────────┐   │
       │                      │  │ EVALUATOR    │   │
       │                      │  └──────┬───────┘   │
       │                      │         │           │
       │                      │   routeAfterEval    │
       │                      │    ┌────┤           │
       │                      │    │    │           │
       │               [pass] │    │    │ [retry]   │
       │                      ▼    ▼    └───────────┘
       │                    ┌──────────────┐
       │                    │ STITCHER     │
       │                    └──────┬───────┘
       │                           │
       │                           ▼
       │                          END
```

### Routing Functions

| Router              | Location   | Logic                                                                                                      |
| ------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| **routeAfterParse** | `graph.ts` | `CONTINUE` + `documentWordCount ≥ 50` + no `userInstruction` → **fast**; everything else → **full**        |
| **routeEvaluator**  | `graph.ts` | `CONTINUE`, `BRIDGE`, `PREPEND`, `FILL_SECTION` → **check** (run evaluator); all other ops → **skip**      |
| **routeAfterEval**  | `graph.ts` | No feedback or `retryCount ≥ 2` → **pass** (go to stitcher); feedback present and retries left → **retry** |

### Nodes

| Node                     | File                                              | LLM? | Description                                                                                                                                                                                                         |
| ------------------------ | ------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **input_parser**         | `src/marker_writer/nodes/input-parser.ts`         | No   | Pure logic. Finds Unicode markers in the raw input, classifies the marker position (e.g. `END_OF_TEXT`, `MID_SENTENCE`, `BETWEEN_BLOCKS`), determines the operation type, and extracts surrounding context.         |
| **fast_context_builder** | `src/marker_writer/nodes/fast-context-builder.ts` | No   | Pure logic. Builds `intentAnalysis`, `styleProfile`, and `writingPlan` from deterministic signals in `parsedInput` — detects POV, tense, sentence length, and content type without any LLM call.                    |
| **intent_analyzer**      | `src/marker_writer/nodes/intent-analyzer.ts`      | Yes  | Determines what the user wants written — content type, topic, audience, tone, length, and constraints. Always uses LLM on the full path.                                                                            |
| **style_analyzer**       | `src/marker_writer/nodes/style-analyzer.ts`       | Yes  | Analyzes the existing text's writing style — tone, sentence length, paragraph style, vocabulary, point of view, tense, and notable patterns. Returns defaults for short documents (<50 words).                      |
| **planner**              | `src/marker_writer/nodes/planner.ts`              | Yes  | Creates a writing plan: approach, topics to cover, transitions in/out, constraints, and target word count. Accounts for position-specific requirements (e.g. completing a mid-sentence, bridging to existing text). |
| **writer**               | `src/marker_writer/nodes/writer.ts`               | Yes  | Generates the text using position-specific instructions, the style profile, and the writing plan. On retries, incorporates evaluator feedback. Produces only the insertion text with no meta-commentary.            |
| **evaluator**            | `src/marker_writer/nodes/evaluator.ts`            | Yes  | Checks seam coherence (before and after), voice match against the style profile, and absence of repetition. Returns pass/fail with a specific retry instruction on failure.                                         |
| **stitcher**             | `src/marker_writer/nodes/stitcher.ts`             | No   | Pure logic. Assembles the final document by inserting the generated text at the marker position with appropriate separators based on the operation type.                                                            |

### Fast Path vs Full Path

| Aspect        | Fast Path                                  | Full Path                                         |
| ------------- | ------------------------------------------ | ------------------------------------------------- |
| **When**      | Simple CONTINUE, ≥50 words, no instruction | Everything else                                   |
| **LLM calls** | 1 (writer only) + evaluator                | 4 (intent + style + planner + writer) + evaluator |
| **Analysis**  | Deterministic heuristics                   | LLM-powered deep analysis                         |
| **Best for**  | Continuing a long document                 | Bridging, prepending, generating, rewriting       |

### Markers

Defined in `src/marker_writer/markers.ts`. Uses Unicode Private Use Area characters (invisible to users, machine-parseable):

| Marker                          | Code Point          | Purpose                            |
| ------------------------------- | ------------------- | ---------------------------------- |
| `CONTINUE`                      | `U+E000`            | Write new content at this position |
| `REWRITE_START` / `REWRITE_END` | `U+E001` / `U+E002` | Mark region to rewrite             |
| `ENHANCE_START` / `ENHANCE_END` | `U+E003` / `U+E004` | Mark region to enhance             |
| `DELETE_START` / `DELETE_END`   | `U+E005` / `U+E006` | Mark region to delete              |
| `COMMENT`                       | `U+E007`            | Inline comment/instruction         |

### State

Defined in `src/marker_writer/state.ts`:

| Field                 | Type                     | Set By                                  |
| --------------------- | ------------------------ | --------------------------------------- |
| `rawInput`            | `string`                 | Caller                                  |
| `userInstruction`     | `string`                 | Caller                                  |
| `knowledgeBasePath`   | `string`                 | Caller                                  |
| `parsedInput`         | `ParsedInput`            | input_parser                            |
| `intentAnalysis`      | `object`                 | fast_context_builder OR intent_analyzer |
| `styleProfile`        | `object`                 | fast_context_builder OR style_analyzer  |
| `writingPlan`         | `object`                 | fast_context_builder OR planner         |
| `generatedText`       | `string`                 | writer                                  |
| `finalDocument`       | `string`                 | stitcher                                |
| `changeDescription`   | `string`                 | stitcher                                |
| `evaluatorFeedback`   | `string`                 | evaluator                               |
| `retryCount`          | `number`                 | evaluator                               |
| `userPreferences`     | `Record<string, string>` | Memory (accumulates)                    |
| `conversationHistory` | `Array<{role, content}>` | Memory (accumulates)                    |
