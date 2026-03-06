# Expert Tester Memory — ContentWriterAgent

## Project Overview
- TypeScript + LangGraph project, ESM (`"type": "module"`)
- Runtime: `tsx` (no Jest/Vitest — tests are plain TS scripts run with tsx)
- Formatter: `prettier` (already installed as devDep, config in `.prettierrc.json`)
- Path alias: `@/*` maps to `src/*` (tsconfig `paths`)
- `yarn format` runs `prettier --write .`

## Test Infrastructure
- **Test runner**: `src/marker_writer/test-prompts.ts` — plain TS script, no test framework
- **Entry point**: CLI flags `--all`, `--category CATEGORY`, `--test "name or id"`
- **Invocation**: `tsx src/marker_writer/test-prompts.ts [flags]`
- Each test calls `createMarkerWriterGraph()` and invokes the full real graph (no mocks)
- `dotenv.config()` must be called before any LangGraph/LLM imports are used

## Marker Writer Graph
- Path: `src/marker_writer/`
- Graph: `START → input_parser → intent_analyzer → style_analyzer → planner → writer → stitcher → END`
- `inputParserNode` and `stitcherNode` are pure/deterministic — position and operation can be asserted exactly
- LLM nodes (intent, style, planner, writer) produce non-deterministic output — validate loosely (non-empty, regex topic checks)
- Each graph invocation needs a unique `thread_id` in `configurable` (MemorySaver checkpointer)

## Key Types
- `MarkerPosition`: `END_OF_TEXT | START_OF_TEXT | BETWEEN_BLOCKS | MID_PARAGRAPH | MID_SENTENCE | AFTER_HEADING | BEFORE_HEADING | INLINE_END | EMPTY_DOCUMENT | BETWEEN_LINES | REGION_SELECTED | AMBIGUOUS`
- `OperationType`: `CONTINUE | BRIDGE | PREPEND | GENERATE | FILL_SECTION | REWRITE_REGION | ENHANCE_REGION | DELETE_REGION`
- Marker chars: `\uE000` (CONTINUE), `\uE001` (REWRITE_START), `\uE002` (REWRITE_END), `\uE003` (ENHANCE_START), `\uE004` (ENHANCE_END)

## Test Categories & Script Names
| yarn script            | category flag       | count |
|------------------------|---------------------|-------|
| test:basic_position    | BASIC_POSITION      | 4     |
| test:mid_sentence      | MID_SENTENCE        | 5     |
| test:between_sections  | BETWEEN_SECTIONS    | 4     |
| test:mid_paragraph     | MID_PARAGRAPH       | 2     |
| test:multi_language    | MULTI_LANGUAGE      | 4     |
| test:content_type      | CONTENT_TYPE        | 5     |
| test:paired_markers    | PAIRED_MARKERS      | 2     |
| test:edge_case         | EDGE_CASE           | 9     |
| test:voice_matching    | VOICE_MATCHING      | 4     |
| test:marker-writer     | (all)               | 39    |
| test:single            | (--test "name/id")  | 1     |

## Patterns Confirmed
- prettier was already configured and installed — no need to add it
- `git add` then `git status` before committing to verify staged files; linter/prettier auto-runs as a pre-commit hook in this repo and may reformat files
- Test file was reformatted by prettier on commit (single quotes, trailing commas) — this is expected
- `tsc --noEmit` (yarn type-check) is the fastest way to validate new TS files before committing
- File naming: test files for `.ts` source use kebab-case (e.g., `test-prompts.ts`)

## Validation Strategy for LLM-Output Tests
- Position/operation fields: exact equality (deterministic parser)
- Generated text content: regex topic checks (loose)
- Length: word count comparisons (`split(/\s+/).length`)
- Language: regex on diacritics + common words for multi-language tests
- Context preservation: `finalDocument.includes(originalSnippet)` assertions
- Ordering: index comparison in finalDocument for prepend/bridge tests

See `patterns.md` for detailed notes.
