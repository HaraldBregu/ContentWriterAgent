# Writer Graph Examples

Tests the LangGraph writing graph (`src/graph.ts`) with instruction files from `playground/instructions/`.

## Continue writing

```bash
npx tsx playground/writer/index.ts --input "The ship had been drifting for three days. Supplies were low."
```

## With inline instruction

```bash
npx tsx playground/writer/index.ts --input "Coffee originated in Ethiopia." --instruction "expand this into a full paragraph"
```

## With instruction file

```bash
npx tsx playground/writer/index.ts --input "Coffee originated in Ethiopia." --file expand
npx tsx playground/writer/index.ts --input "The meeting went okay I guess." --file rewrite-professional
npx tsx playground/writer/index.ts --input "AI is very complecated." --file fix-grammar
```

## With system file

```bash
npx tsx playground/writer/index.ts --input "We sell shoes." --file expand --system-file copywriter
npx tsx playground/writer/index.ts --input "Good morning, how are you?" --instruction "translate to Italian" --system-file translator
```

## Custom thread ID

```bash
npx tsx playground/writer/index.ts --input "The sun was setting." --thread story-1
```
