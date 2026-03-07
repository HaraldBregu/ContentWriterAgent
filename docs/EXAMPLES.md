# Examples

## Quick Start

Make sure you have an `OPENAI_API_KEY` in your `.env` file.

```bash
npx tsx src/index.ts --input "The village sat at the edge of a vast forest that no one dared enter after dark."
```

## Usage

### Continue from text

```bash
npx tsx src/index.ts --input "The ship had been drifting for three days. Supplies were low, and the crew had stopped speaking to one another."
```

### With instruction

```bash
npx tsx src/index.ts --input "Coffee originated in Ethiopia." --instruction "keep writing"
```

### Read from file

```bash
npx tsx src/index.ts --file input.txt
```

## Graph Architecture

```
__start__ → writer → __end__
```

| Node     | Role                                      |
| -------- | ----------------------------------------- |
| `writer` | Takes input text, calls LLM, returns text |
