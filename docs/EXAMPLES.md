# Examples

## Quick Start

Make sure you have an `OPENAI_API_KEY` in your `.env` file.

### Main graph

```bash
npx tsx src/index.ts --input "The village sat at the edge of a vast forest that no one dared enter after dark."
```

### Marker writer graph

```bash
yarn marker-writer
```

## Graph Architecture

### Main graph (`src/graph.ts`)

```
__start__ → writer → __end__
```

Takes `inputText`, generates a continuation.

### Marker writer graph (`src/marker_writer/graph.ts`)

```
__start__ → writer → __end__
```

Takes `inputText` + optional `instruction`, generates text.

## Usage

### Continue from text

```bash
npx tsx src/index.ts --input "The ship had been drifting for three days. Supplies were low, and the crew had stopped speaking to one another."
```

### Read from file

```bash
npx tsx src/index.ts --file input.txt
```

yarn marker-writer --text "" --instruction "write a short paragraph about the moon"

Whispers of ancient spirits and untold mysteries swirled around the towering trees, casting long shadows that danced under the pale moonlight. The villagers spoke in hushed tones of the eerie glow that sometimes flickered between the branches, and the haunting melodies that drifted on the night air. Only the bravest—or the most foolish—ventured near the forest’s edge after sundown, driven by curiosity or the lure of forgotten treasures hidden beneath the canopy.

Whispers of ancient spirits and tales of mysterious creatures kept the villagers close to their hearths as the sun dipped below the horizon. By day, the forest was a tapestry of vibrant greens and the air was filled with birdsong, but by night, it transformed into a shadowy labyrinth, where even the bravest souls hesitated to tread.

One evening, as the sky blazed with the colors of dusk, a young girl named Elara stood at the forest's edge, her heart pounding with a mix of fear and curiosity. She had heard the stories all her life, yet something about the forest called to her, a silent promise of secrets waiting to be uncovered. Clutching a small lantern, she took a deep breath and stepped forward, the soft glow of her light swallowed by the encroaching darkness.

As she ventured deeper, the familiar sounds of the village faded away, replaced by the rustling of leaves and the distant hoot of an owl. Shadows danced around her, and the path seemed to twist and turn of its own accord. Elara's resolve wavered, but she pressed on, driven by an inexplicable pull.

Suddenly, a soft, ethereal light appeared ahead, flickering like a beacon. Intrigued, Elara quickened her pace, her footsteps barely making a sound on the forest floor. As she approached, she realized the light emanated from a clearing, where a circle of ancient stones stood, bathed in a silvery glow. In the center, a figure cloaked in mist beckoned to her, its voice a gentle whisper on the wind.

"Welcome, seeker of truths," it said, its words weaving through the night like a melody. "You have come far, and your courage shall be rewarded."

Elara hesitated, her mind racing with questions. But as she stepped into the circle, a sense of calm washed over her, and she knew she had found the beginning of a journey that would change everything.
