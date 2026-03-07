# Writer Graph Examples

Tests the LangGraph writing graph (`src/graph.ts`) with a single writer node.

## System files

- `writing-assistant.md`
- `copywriter.md`
- `editor.md`
- `storyteller.md`

## Continue writing

```bash
npx tsx playground/writer/index.ts --input "The ship had been drifting for three days. Supplies were low."
```

## With instruction

```bash
npx tsx playground/writer/index.ts --input "Coffee originated in Ethiopia." --instruction "expand this into a full paragraph"
```

## With system file

```bash
npx tsx playground/writer/index.ts --input "We sell shoes." --instruction "write a tagline" --system-file copywriter
npx tsx playground/writer/index.ts --input "The door creaked open." --system-file storyteller
npx tsx playground/writer/index.ts --input "The meeting went okay I guess." --instruction "improve this" --system-file editor
```

## Custom thread ID

```bash
npx tsx playground/writer/index.ts --input "The sun was setting." --thread story-1
```
