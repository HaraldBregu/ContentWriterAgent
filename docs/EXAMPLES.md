# Examples

## Quick Start

Make sure you have an `OPENAI_API_KEY` in your `.env` file, then:

```bash
yarn marker-writer
```

This runs all three intent examples (continue, expand, rewrite).

## CLI Usage

```bash
yarn marker-writer:cli --text "<your text>" [--instruction "<instruction>"]
```

## Intent Examples

### Continue — "keep writing"

No instruction or instructions like "keep writing", "continue the story", "write the next paragraph":

```bash
# Default (no instruction = continue)
yarn marker-writer:cli \
  --text "The village sat at the edge of a vast forest that no one dared enter after dark."

# Explicit continue
yarn marker-writer:cli \
  --text "The village sat at the edge of a vast forest that no one dared enter after dark." \
  --instruction "keep writing"
```

### Expand — "make this paragraph longer"

Instructions like "make this longer", "add more detail", "elaborate on this":

```bash
yarn marker-writer:cli \
  --text "Coffee originated in Ethiopia. A herder noticed his goats became energetic after eating certain berries. The practice of brewing the beans spread across the Arabian Peninsula." \
  --instruction "make this paragraph longer"
```

### Rewrite — "rewrite this to sound more professional"

Instructions like "rewrite this", "make it more professional", "change the tone":

```bash
yarn marker-writer:cli \
  --text "So basically AI is like super cool and it's changing everything. Companies are using it for all sorts of stuff and it's gonna be huge in the future." \
  --instruction "rewrite this section to sound more professional"
```

## Graph Architecture

```
__start__ → analyzer → generator → __end__
```

| Node        | Role                                                           |
| ----------- | -------------------------------------------------------------- |
| `analyzer`  | Classifies intent (continue/expand/rewrite) + extracts style   |
| `generator` | Builds prompt from intent + style, calls LLM, assembles output |

yarn marker-writer:cli --text "Artificial Intelligence is no longer a futuristic whisper from science fiction novels. It is an active force shaping how we work, create, decide, and imagine. From recommendation engines that curate what we watch to algorithms that help doctors detect disease earlier, AI has become a structural beam in the architecture of modern society." --instruction "keep writing"

Artificial Intelligence is no longer a futuristic whisper from science fiction novels. It is an active force shaping how we work, create, decide, and imagine. From recommendation engines that curate what we watch to algorithms that help doctors detect disease earlier, AI has become a structural beam in the architecture of modern society. Its influence extends across diverse domains, acting as both a catalyst for innovation and a guardian of efficiency. In the realm of education, AI personalizes learning experiences, adapting to individual student needs and unlocking potential previously constrained by traditional methods. Meanwhile, in the environmental sector, AI-driven analytics empower researchers to track climate changes with unprecedented precision, offering insights that inform global conservation strategies. Furthermore, in the world of finance, AI's predictive capabilities enhance risk assessment, safeguarding investments and fostering economic stability. As AI continues to evolve, it promises to redefine boundaries, ushering in a new era of possibility and progress.

yarn marker-writer:cli --text "Artificial Intelligence is no longer a futuristic whisper from science fiction novels. It is an active force shaping" --instruction "keep writing"

Artificial Intelligence is no longer a futuristic whisper from science fiction novels. It is an active force shapingthe very fabric of modern society. From autonomous vehicles navigating bustling streets to algorithms predicting market trends, AI permeates every sector. It revolutionizes healthcare with precision diagnostics and powers smart cities with efficient resource management. As its capabilities expand, ethical considerations and regulatory frameworks become imperative to guide its integration.

yarn marker-writer:cli --text "Artificial Intelligence is no longer a futuristic" --instruction "make this paragraph longer"

Artificial Intelligence is no longer a futuristic concept relegated to the realms of science fiction and speculative theories. It is now an integral part of contemporary technological advancements and societal transformations. With the rapid development of machine learning algorithms, neural networks, and natural language processing, AI systems are actively revolutionizing industries ranging from healthcare to transportation. For instance, in healthcare, AI algorithms can analyze vast datasets to predict disease outbreaks and personalize treatment plans with unprecedented accuracy. Similarly, in transportation, autonomous vehicles are becoming increasingly sophisticated, reshaping urban landscapes and redefining mobility. As AI continues to evolve, its potential to impact every facet of human life grows exponentially, underscoring its significance in shaping the future.

yarn marker-writer:cli --text "Artificial Intelligence is no longer a futuristic whisper from science fiction novels. It is an active force shapingthe very fabric of modern society. From autonomous vehicles navigating bustling streets to algorithms predicting market trends, AI permeates every sector. It revolutionizes healthcare with precision diagnostics and powers smart cities with efficient resource management. As its capabilities expand, ethical considerations and regulatory frameworks become imperative to guide its integration." --instruction "rewrite this to sound more professional"

Artificial Intelligence is no longer a speculative concept confined to science fiction; it is an influential force shaping the structure of contemporary society. From autonomous vehicles navigating complex urban environments to algorithms forecasting market dynamics, AI infiltrates every industry. It transforms healthcare through precision diagnostics and enhances smart cities with optimized resource management. As its capabilities grow, ethical considerations and regulatory frameworks become essential to guide its integration.