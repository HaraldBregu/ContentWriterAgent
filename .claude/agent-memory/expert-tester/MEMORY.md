# Expert Tester Memory — Atlas

## Project Overview

- TypeScript + LangGraph 0.2.x project, ESM (`"type": "module"`)
- Runtime: `tsx` (no Jest/Vitest — integration tests are plain TS scripts)
- Test framework: **Vitest 4.x** (`yarn test` runs `vitest run`)
- Formatter: `prettier` (devDep, config in `.prettierrc.json`)
- Path alias: `@/*` maps to `src/*` (tsconfig `paths`)
- `yarn format` runs `prettier --write .`
- devDependencies must be installed (`yarn install`) before running tests

## Test Infrastructure

- **Unit tests**: `src/**/*.test.ts` — run with `yarn test` (vitest)
- **Integration tests**: `tests/test-prompts.ts` — plain TS script, calls real LLM
- `dotenv.config()` must be called before any LangGraph/LLM imports
- vitest config: `src/**/*.test.ts` pattern, `@` alias, node environment

## LangGraph 0.2.x API — CRITICAL

In LangGraph 0.2.74+, `Annotation.Root({...})` returns an `AnnotationRoot` where:

- `state.spec` IS the channels object directly (NOT `state.spec.channels`)
- Channels with custom reducers are `BinaryOperatorAggregate` instances:
  - `.operator` = the reducer function (was `.reducer` in older docs)
  - `.initialValueFactory` = the default factory (was `.default` in older docs)
- Channels without custom reducers are `LastValue` instances (no default/reducer)

## Vitest 4.x Mock Pattern — CRITICAL

`new SomeClass()` inside source code requires the mock to be a constructor.
Arrow functions in `vi.fn()` are NOT compatible with `new`. Always use:

```ts
vi.mock('@langchain/openai', () => ({
  ChatOpenAI: vi.fn(function (this: any, opts) {
    this.invoke = mockInvoke; // attach methods to `this`
    this.stream = mockStream;
  }),
}));
```

Never use `vi.fn().mockImplementation((opts) => ({...}))` — this breaks with `new`.
Also: `mockImplementationOnce(() => ({...}))` with arrow functions will fail with `new`.

## Marker Writer Graph

- Path: `src/marker_writer/`
- Graph: `START → input_parser → intent_analyzer → style_analyzer → planner → writer → stitcher → END`
- `inputParserNode` and `stitcherNode` are pure/deterministic — position/operation asserted exactly
- LLM nodes (intent, style, planner, writer) — mock `@langchain/openai` in unit tests
- Each graph invocation needs a unique `thread_id` in `configurable` (MemorySaver checkpointer)

## Key Types

- `MarkerPosition`: `END_OF_TEXT | START_OF_TEXT | BETWEEN_BLOCKS | MID_PARAGRAPH | MID_SENTENCE | AFTER_HEADING | BEFORE_HEADING | INLINE_END | EMPTY_DOCUMENT | BETWEEN_LINES | REGION_SELECTED | AMBIGUOUS`
- `OperationType`: `CONTINUE | BRIDGE | PREPEND | GENERATE | FILL_SECTION | REWRITE_REGION | ENHANCE_REGION | DELETE_REGION`
- Marker chars: `\uE000` (CONTINUE), `\uE001` (REWRITE_START), `\uE002` (REWRITE_END), `\uE003` (ENHANCE_START), `\uE004` (ENHANCE_END)

## Complete Test File Map

| Source file                                  | Test file                                         | Notes                    |
| -------------------------------------------- | ------------------------------------------------- | ------------------------ |
| `src/config.ts`                              | `src/config.test.ts`                              | config values            |
| `src/state.ts`                               | `src/state.test.ts`                               | LangGraph state channels |
| `src/graph.ts`                               | `src/graph.test.ts`                               | graph compilation        |
| `src/nodes/evaluator.ts`                     | `src/nodes/evaluator.test.ts`                     | mock LLM                 |
| `src/nodes/formatter.ts`                     | `src/nodes/formatter.test.ts`                     | mock stream              |
| `src/nodes/writer.ts`                        | `src/nodes/writer.test.ts`                        | mock stream              |
| `src/marker_writer/markers.ts`               | `src/marker_writer/markers.test.ts`               | pure                     |
| `src/marker_writer/helpers.ts`               | `src/marker_writer/helpers.test.ts`               | pure                     |
| `src/marker_writer/types.ts`                 | `src/marker_writer/types.test.ts`                 | type shapes              |
| `src/marker_writer/models.ts`                | `src/marker_writer/models.test.ts`                | mock LLM                 |
| `src/marker_writer/state.ts`                 | `src/marker_writer/state.test.ts`                 | LangGraph state          |
| `src/marker_writer/graph.ts`                 | `src/marker_writer/graph.test.ts`                 | graph compilation        |
| `src/marker_writer/index.ts`                 | `src/marker_writer/index.test.ts`                 | dependency test only     |
| `src/marker_writer/nodes/input-parser.ts`    | `src/marker_writer/nodes/input-parser.test.ts`    | pure, 24 tests           |
| `src/marker_writer/nodes/stitcher.ts`        | `src/marker_writer/nodes/stitcher.test.ts`        | pure, 16 tests           |
| `src/marker_writer/nodes/intent-analyzer.ts` | `src/marker_writer/nodes/intent-analyzer.test.ts` | mock LLM                 |
| `src/marker_writer/nodes/style-analyzer.ts`  | `src/marker_writer/nodes/style-analyzer.test.ts`  | mock LLM                 |
| `src/marker_writer/nodes/planner.ts`         | `src/marker_writer/nodes/planner.test.ts`         | mock LLM                 |
| `src/marker_writer/nodes/writer.ts`          | `src/marker_writer/nodes/writer.test.ts`          | mock LLM                 |

## Patterns Confirmed

- `yarn install` needed first — devDependencies (vitest, prettier) not pre-installed
- `git add` then `git status` before committing; prettier may reformat on commit
- File naming: test files for `.ts` source use kebab-case
- For fast-path logic in LLM nodes (e.g. `intentAnalyzerNode`, `styleAnalyzerNode`),
  assert that `ChatOpenAI` was NOT called to verify the fast path was taken
