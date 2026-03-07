# Writer Graph Examples

Tests the LangGraph writing graph (`src/graph.ts`) with a single writer node.

## Continue writing

```bash
npx tsx playground/writer/index.ts --input "The ship had been drifting for three days. Supplies were low."
```

## With instruction

```bash
npx tsx playground/writer/index.ts --input "Coffee originated in Ethiopia." --instruction "expand this into a full paragraph"
```

## Custom thread ID

```bash
npx tsx playground/writer/index.ts --input "The sun was setting." --thread story-1
```
