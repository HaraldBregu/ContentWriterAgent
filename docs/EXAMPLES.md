# Examples

## CLI Usage

Run the marker writer from the command line with any text. Use `$MARKER` to place the cursor where you want the AI to write.

```bash
yarn marker-writer:cli --text "<your text with $MARKER>" [--instruction "<optional instruction>"]
```

### Continue at end of text

```bash
yarn marker-writer:cli --text "The rise of electric vehicles has changed the automotive industry.$MARKER"
```

### Continue mid-sentence

```bash
yarn marker-writer:cli --text "The three most important factors are$MARKER"
```

### Insert between paragraphs

```bash
yarn marker-writer:cli \
  --text "## Introduction\n\nAI has transformed how we work.\n\n$MARKER\n\n## Conclusion\n\nThe future depends on us." \
  --instruction "write the main body"
```

### Insert mid-paragraph

```bash
yarn marker-writer:cli \
  --text "Coffee consumption has risen steadily. $MARKER Today, the average American drinks three cups." \
  --instruction "add a sentence about why"
```

### Inline instruction (paired markers)

Place the instruction between two `$MARKER` tokens:

```bash
yarn marker-writer:cli --text "The quick brown fox jumped over the lazy dog.$MARKER add a sentence about the cat $MARKER"
```

### Generate from empty document

```bash
yarn marker-writer:cli --text "$MARKER" --instruction "write a blog post about sustainable urban farming"
```

### Prepend to existing text

```bash
yarn marker-writer:cli \
  --text "$MARKER The main challenges are communication, timezone coordination, and culture." \
  --instruction "write an engaging introduction"
```

## Running preset examples

```bash
yarn example:list                # list all preset examples
yarn example:all                 # run all 16 examples
yarn example:continue            # run continue examples
yarn example:insert              # run insert examples
yarn example:rewrite             # run rewrite examples
yarn example:expand              # run expand examples
yarn example:delete              # run delete examples
yarn example:generate            # run generate examples
yarn example:inline              # run inline instruction examples
```

## Marker Reference

| Marker        | Code            | Usage                               |
| ------------- | --------------- | ----------------------------------- |
| `$MARKER`     | `U+E000`        | Cursor position / continue / insert |
| Two `$MARKER` | `U+E000…U+E000` | Inline instruction between markers  |

For rewrite, expand, and delete operations, use the paired markers defined in `src/marker_writer/markers.ts`.
