# Basic LLM Examples

Single LLM call with configurable options.

## Default

```bash
npx tsx playground/basic/index.ts
```

## Custom prompt

```bash
npx tsx playground/basic/index.ts --prompt "Write one sentence about the ocean."
```

## With system prompt

```bash
npx tsx playground/basic/index.ts --prompt "Tell me about the weather today." --system "You are a pirate. Respond in pirate speak."
```

## Custom temperature

```bash
npx tsx playground/basic/index.ts --prompt "Write one sentence about the ocean." --temperature 0
npx tsx playground/basic/index.ts --prompt "Write one sentence about the ocean." --temperature 1
```

## Stream response

```bash
npx tsx playground/basic/index.ts --stream --prompt "Write a short paragraph about the moon."
```

## Custom model

```bash
npx tsx playground/basic/index.ts --model gpt-4o-mini --prompt "Say hello."
```

```bash
npx tsx playground/basic/index.ts --model gpt-4o-mini --prompt "Tell me about the weather today." --system "You are a pirate. Respond in pirate speak."
```
