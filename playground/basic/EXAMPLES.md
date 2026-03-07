# Basic LLM Examples

Single LLM call with configurable options.

## Default

```bash
npx tsx playground/basic/run.ts
```

## Custom prompt

```bash
npx tsx playground/basic/run.ts --prompt "Write one sentence about the ocean."
```

## With system prompt

```bash
npx tsx playground/basic/run.ts --prompt "Tell me about the weather today." --system "You are a pirate. Respond in pirate speak."
```

## Custom temperature

```bash
npx tsx playground/basic/run.ts --prompt "Write one sentence about the ocean." --temperature 0
npx tsx playground/basic/run.ts --prompt "Write one sentence about the ocean." --temperature 1
```

## Custom model

```bash
npx tsx playground/basic/run.ts --model gpt-4o-mini --prompt "Say hello."
```
