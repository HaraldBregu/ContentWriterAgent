# Writing Continuation Agent

An intelligent AI agent that continues text with evaluator feedback loops. Built with LangChain, LangGraph, and OpenAI's GPT-4o model.

## Features

- **Intelligent Continuation**: Uses GPT-4o to generate seamless text continuations that match the original's tone, style, and voice
- **Evaluator Feedback Loop**: Automatically evaluates continuations on coherence, style consistency, quality, and flow
- **Iterative Refinement**: Re-runs the writer with evaluator feedback until quality threshold is met (default score ≥ 7.0)
- **Configurable Iterations**: Set max iterations to prevent infinite loops (default: 3)
- **Structured Outputs**: Uses Zod schemas for type-safe, validated LLM responses
- **Full TypeScript**: Complete type safety throughout the codebase
- **CLI Interface**: Multiple input methods (direct text, file, interactive mode)
- **Detailed Logging**: Trace each iteration with prefixed console output

## Architecture

### Graph Flow

```
START → writer → evaluator → router
                                ├─ passed=true → END
                                ├─ iterations < max → writer (loop)
                                └─ iterations >= max → END (best attempt)
```

### State Management

The system maintains full state through the graph:

- `inputText`: Original user text
- `continuation`: Latest generated continuation
- `evaluationScore`: Quality score (0-10)
- `evaluationFeedback`: Improvement suggestions
- `passed`: Whether evaluation threshold met
- `iteration`: Current iteration count
- `history`: Record of all attempts

### Nodes

#### Writer Node
- Receives original text and evaluator feedback
- Generates natural continuation matching style/tone/voice
- Uses GPT-4o with temperature 0.7 for creativity
- Produces ~200-400 words (configurable)

#### Evaluator Node
- Assesses continuation on 4 criteria:
  - **Coherence**: Logical flow and narrative consistency
  - **Style Consistency**: Tone and voice match
  - **Quality**: Engaging, well-crafted writing
  - **Flow**: Seamless transition from input
- Uses GPT-4o with temperature 0 for consistency
- Returns structured output: `{ score, passed, feedback }`

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
OPENAI_API_KEY=sk-...
```

### 3. Build (Optional)

```bash
npm run build
```

## Usage

### Basic Usage

```bash
npx tsx src/index.ts --input "Your text here..."
```

### From File

```bash
npx tsx src/index.ts --file input.txt
```

### Interactive Mode

```bash
npx tsx src/index.ts --interactive
```

### With Options

```bash
npx tsx src/index.ts \
  --input "Your text..." \
  --max-iterations 5 \
  --verbose
```

### Run Example

```bash
npm run example
```

## Examples

### Example 1: Suspenseful Fiction

**Input:**
```
The old lighthouse keeper climbed the spiral staircase as he had done every evening for thirty years. Tonight, however, something was different. The light at the top flickered in a pattern he had never seen before.
```

**Expected Output:**
The system will generate a continuation that:
- Maintains the atmospheric, suspenseful tone
- Continues the narrative coherently
- Preserves the descriptive, introspective style
- May iterate if first attempt scores below 7.0

### Example 2: Technical Documentation

**Input:**
```
The REST API provides endpoints for managing user resources. To create a new user, send a POST request to /api/users with the following JSON payload:
```

**Expected Output:**
Continuation will:
- Match the technical, instructional tone
- Follow proper documentation conventions
- Provide coherent, relevant technical details

### Example 3: Creative Writing

**Input:**
```
She opened the ancient book with trembling hands. The pages were yellowed and brittle, and the scent of forgotten centuries rose like incense.
```

**Expected Output:**
Continuation will:
- Match the lyrical, poetic tone
- Maintain narrative immersion
- Continue the evocative sensory descriptions

## Configuration

Edit `src/config.ts` to customize:

```typescript
export const config = {
  model: "gpt-4o",              // LLM model
  writerTemperature: 0.7,       // Creativity (0-1)
  evaluatorTemperature: 0,      // Determinism (0-1)
  passThreshold: 7.0,           // Passing score
  maxIterations: 3,             // Max attempts
  continuationLength: "200-400 words",
};
```

## Output Example

```
============================================================
Writing Continuation Agent
============================================================

[system] Input text length: 156 characters
[system] Max iterations: 3
[system] Starting writing and evaluation loop...

[writer] Iteration 1: Generating continuation...
[writer] Generated 387 characters of continuation
[evaluator] Evaluating continuation...
[evaluator] Score: 8.2/10 | Passed: true

============================================================
Final Result
============================================================

ORIGINAL TEXT:

The old lighthouse keeper climbed the spiral staircase...

------------------------------------------------------------

GENERATED CONTINUATION:

He hesitated at the threshold, his weathered hand gripping...

============================================================
Summary
============================================================
Total iterations: 1
Final evaluation score: 8.2/10
Evaluation passed: ✓ Yes

============================================================
```

## Development

### Run with Hot Reload

```bash
npm run dev
```

### Type Check

```bash
npm run type-check
```

### Build

```bash
npm run build
```

### Run Compiled

```bash
npm start -- --input "Your text..."
```

## Error Handling

The system handles:
- API failures with informative error messages
- Rate limiting (respects OpenAI backoff)
- Malformed LLM responses with Zod validation
- File read errors
- Invalid iteration counts

## Project Structure

```
src/
├── index.ts          # Entry point, CLI interface
├── graph.ts          # LangGraph definition and compilation
├── state.ts          # State schema definition
├── config.ts         # Configuration constants
└── nodes/
    ├── writer.ts     # Writer node implementation
    └── evaluator.ts  # Evaluator node implementation
```

## Dependencies

- `@langchain/openai`: OpenAI LLM integration
- `@langchain/core`: Core LangChain types and utilities
- `@langchain/langgraph`: Graph-based agent orchestration
- `zod`: Type-safe schema validation
- `dotenv`: Environment variable management
- `commander`: CLI argument parsing
- `typescript`: Type safety

## Requirements

- Node.js 18+
- OpenAI API key (for GPT-4o access)

## License

MIT

## Support

For issues or questions:
1. Check the error message and console logs ([writer], [evaluator], [router] prefixes)
2. Ensure your OpenAI API key is valid
3. Verify you have access to GPT-4o model
4. Check your rate limits haven't been exceeded

## Future Enhancements

- [ ] Web UI interface
- [ ] Streaming output for real-time feedback
- [ ] Multiple continuation strategies
- [ ] Custom evaluation criteria
- [ ] Output formatting (Markdown, HTML)
- [ ] Batch processing of multiple texts
