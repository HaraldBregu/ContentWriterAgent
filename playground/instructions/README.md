# Instruction-based LLM Examples

LLM call with input text, a system role, and an assistant instruction.

## Folders

- `system/` — system prompts that define the LLM's role
- `assistant/` — task instructions that tell the LLM what to do

### System files

- `writing-assistant.md` (default)
- `copywriter.md`
- `editor.md`
- `translator.md`

### Assistant files

- `expand.md`
- `rewrite-professional.md`
- `summarize.md`
- `continue.md`
- `simplify.md`
- `fix-grammar.md`

## Usage

```bash
npx tsx playground/instructions/index.ts --input "Coffee originated in Ethiopia." --file expand
npx tsx playground/instructions/index.ts --input "The meeting went okay I guess." --file rewrite-professional
npx tsx playground/instructions/index.ts --input "The ship had been drifting for three days." --file continue
npx tsx playground/instructions/index.ts --input "AI is very complecated." --file fix-grammar
```

## With a different system role

```bash
npx tsx playground/instructions/index.ts --system-file copywriter --input "We sell shoes." --file expand
npx tsx playground/instructions/index.ts --system-file editor --input "The meeting went okay I guess." --file rewrite-professional
npx tsx playground/instructions/index.ts --system-file translator --input "Good morning, how are you?" --instruction "translate to Italian"
```

## Inline system and instruction

```bash
npx tsx playground/instructions/index.ts --system "You are a poet." --input "The ocean is vast." --instruction "rewrite as a haiku"
```

## Stream response

```bash
npx tsx playground/instructions/index.ts --stream --input "Coffee originated in Ethiopia." --file expand
```

## Limit output tokens

```bash
npx tsx playground/instructions/index.ts --input "Coffee originated in Ethiopia." --file expand --max-tokens 100
```
