# Atlas

An intelligent AI writing agent built with LangChain, LangGraph, and GPT-4o. Atlas contains two graph-based pipelines: a **Writing Graph** for iterative text continuation with evaluator feedback, and a **Marker Writer Graph** for context-aware text insertion at any position in a document.

## Features

- **Iterative Writing Loop**: Generates text continuations, evaluates them on coherence/style/quality/flow, and revises until a quality threshold is met
- **Marker-Based Writing**: Insert a Unicode marker anywhere in a document and Atlas generates contextually appropriate text at that position
- **Position-Aware Generation**: Detects 12 marker positions (end of text, mid-sentence, between sections, etc.) and adapts the writing strategy accordingly
- **Style Matching**: Analyzes existing text for tone, rhythm, vocabulary, POV, and tense, then generates text that matches
- **Structured Outputs**: Zod schemas for type-safe, validated LLM responses
- **Full TypeScript**: Complete type safety with path aliases
- **CLI Interface**: Direct text, file input, and interactive mode

## Architecture

Atlas contains two LangGraph state graphs. See [`docs/GRAPH.md`](docs/GRAPH.md) for detailed node descriptions, state schemas, and routing logic.

### Writing Graph

A write–evaluate–rewrite loop that generates text continuations and iteratively improves them.

```
START → writer → evaluator → router
                                ├─ passed → formatter → END
                                ├─ iterations < max → writer (retry)
                                └─ iterations >= max → formatter → END
```

| Node          | Description                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **writer**    | Generates a 200–400 word continuation using GPT-4o. Incorporates evaluator feedback on retries. |
| **evaluator** | Scores the continuation (0–10) on coherence, style consistency, quality, and flow.              |
| **formatter** | Lightly polishes the final continuation without altering meaning.                               |

### Marker Writer Graph

A linear pipeline that takes a document with a Unicode marker at the cursor position, analyzes context, plans the writing, generates text, and stitches the result back.

```
START → input_parser → intent_analyzer → style_analyzer → planner → writer → stitcher → END
```

| Node                | Description                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------- |
| **input_parser**    | Pure logic (no LLM). Finds markers, classifies position, extracts surrounding context.                |
| **intent_analyzer** | Determines content type, topic, audience, tone, length. Heuristics for simple cases, LLM for complex. |
| **style_analyzer**  | Profiles the text's tone, rhythm, vocabulary, POV, tense, and patterns.                               |
| **planner**         | Creates a position-aware writing plan with approach, topics, transitions, and word count target.      |
| **writer**          | Generates the insertion text using style profile and writing plan.                                    |
| **stitcher**        | Pure logic (no LLM). Assembles the final document with appropriate spacing and separators.            |

#### Supported Marker Positions

```
PATTERN                           DETECTED AS           OPERATION
──────────────────────────────────────────────────────────────────
text text text█                   END_OF_TEXT            CONTINUE
█text text text                   START_OF_TEXT          PREPEND
text\n\n█\n\ntext                 BETWEEN_BLOCKS         BRIDGE
text. █Text. text                 MID_PARAGRAPH          BRIDGE
text word█ word text              MID_SENTENCE           BRIDGE
## Heading\n█                     AFTER_HEADING          FILL_SECTION
text\n█\n## Heading               BEFORE_HEADING         BRIDGE
█                                 EMPTY_DOCUMENT         GENERATE
text⟨START⟩region⟨END⟩text       REGION_SELECTED        REWRITE_REGION
```

## Setup

### 1. Install Dependencies

```bash
yarn install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Add your OpenAI API key
OPENAI_API_KEY=sk-...
```

### 3. Build (Optional)

```bash
yarn build
```

## Usage

### Writing Continuation

```bash
# Direct input
npx tsx src/index.ts --input "Your text here..."

# From file
npx tsx src/index.ts --file input.txt

# Interactive mode
npx tsx src/index.ts --interactive

# With options
npx tsx src/index.ts --input "Your text..." --max-iterations 5 --verbose
```

### Marker Writer

```bash
yarn marker-writer
```

### Run Tests

```bash
# All marker writer tests
yarn test:marker-writer

# By category
yarn test:basic_position
yarn test:mid_sentence
yarn test:between_sections
yarn test:voice_matching

# Single test
yarn test:single --test "test name or id"
```

## Configuration

Edit `src/config.ts`:

```typescript
export const config = {
  model: 'gpt-4o',
  writerTemperature: 0.7,
  evaluatorTemperature: 0,
  formatterTemperature: 0.2,
  passThreshold: 7.0,
  maxIterations: 3,
  continuationLength: '200-400 words',
};
```

## Project Structure

```
src/
├── index.ts                         # Entry point, CLI interface
├── graph.ts                         # Writing Graph definition
├── state.ts                         # Writing state schema
├── config.ts                        # Configuration constants
├── nodes/
│   ├── writer.ts                    # Writer node (continuation)
│   ├── evaluator.ts                 # Evaluator node (scoring)
│   └── formatter.ts                 # Formatter node (polishing)
└── marker_writer/
    ├── index.ts                     # Marker writer entry point
    ├── graph.ts                     # Marker Writer Graph definition
    ├── state.ts                     # Marker writer state schema
    ├── markers.ts                   # Unicode marker definitions
    ├── types.ts                     # Shared types
    ├── models.ts                    # LLM model config
    ├── helpers.ts                   # Utility functions
    └── nodes/
        ├── input-parser.ts          # Marker detection & context extraction
        ├── intent-analyzer.ts       # Content intent analysis
        ├── style-analyzer.ts        # Style profiling
        ├── planner.ts               # Writing plan generation
        ├── writer.ts                # Text generation
        └── stitcher.ts              # Document assembly
tests/
└── test-prompts.ts                  # Integration tests
docs/
└── GRAPH.md                         # Detailed graph architecture docs
```

## Dependencies

- `@langchain/openai`: OpenAI LLM integration
- `@langchain/anthropic`: Anthropic LLM integration
- `@langchain/core`: Core LangChain types and utilities
- `@langchain/langgraph`: Graph-based agent orchestration
- `zod`: Type-safe schema validation
- `dotenv`: Environment variable management
- `commander`: CLI argument parsing

## Requirements

- Node.js 18+
- OpenAI API key (for GPT-4o access)

## License

MIT
