import dotenv from "dotenv";
dotenv.config();

import { createMarkerWriterGraph } from "@/marker_writer/graph";
import { CONTINUE_MARKER, MARKERS } from "@/marker_writer/markers";

async function main() {
  const app = createMarkerWriterGraph();
  const M = CONTINUE_MARKER;

  // ─────────────────────────────────────────────
  // Pattern 1: text text text█
  // Marker at end of document
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 1: End of document ===");
  const r1 = await app.invoke(
    {
      rawInput: `The history of coffee begins in Ethiopia, where legend says a goat herder named Kaldi noticed his goats dancing after eating berries from a certain tree. He tried them himself and felt a surge of energy.${M}`,
      userInstruction: "",
    },
    { configurable: { thread_id: "p1" } },
  );
  console.log("Position:", r1.parsedInput.markerPosition);
  console.log("Operation:", r1.parsedInput.operationType);
  console.log("Generated:", r1.generatedText.slice(0, 200) + "...");

  // ─────────────────────────────────────────────
  // Pattern 2: █text text text
  // Marker at start — prepend
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 2: Start of document ===");
  const r2 = await app.invoke(
    {
      rawInput: `${M}The three main challenges facing remote teams are communication overhead, timezone coordination, and maintaining culture. Each requires a different approach.`,
      userInstruction: "write an engaging introduction",
    },
    { configurable: { thread_id: "p2" } },
  );
  console.log("Position:", r2.parsedInput.markerPosition);
  console.log("Operation:", r2.parsedInput.operationType);

  // ─────────────────────────────────────────────
  // Pattern 3: text\n\n█\n\ntext
  // Marker between sections
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 3: Between sections ===");
  const r3 = await app.invoke(
    {
      rawInput: `## Introduction

Artificial intelligence has transformed how we process information. The speed of advancement is unprecedented.

${M}

## Conclusion

The future of AI depends on responsible development and thoughtful regulation.`,
      userInstruction: "write the main body",
    },
    { configurable: { thread_id: "p3" } },
  );
  console.log("Position:", r3.parsedInput.markerPosition);
  console.log("Operation:", r3.parsedInput.operationType);
  console.log("Current heading:", r3.parsedInput.currentHeading);
  console.log("Next heading:", r3.parsedInput.nextHeading);

  // ─────────────────────────────────────────────
  // Pattern 4: text text█ text text (mid-sentence)
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 4: Mid-sentence ===");
  const r4 = await app.invoke(
    {
      rawInput: `The three most important factors in building a successful startup are${M} which together determine whether a company can survive its first two years.`,
      userInstruction: "",
    },
    { configurable: { thread_id: "p4" } },
  );
  console.log("Position:", r4.parsedInput.markerPosition);
  console.log("Is inside sentence:", r4.parsedInput.isInsideSentence);
  console.log("Last sentence before:", r4.parsedInput.lastSentenceBefore);

  // ─────────────────────────────────────────────
  // Pattern 5: text. █text. text (mid-paragraph)
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 5: Mid-paragraph ===");
  const r5 = await app.invoke(
    {
      rawInput: `Coffee consumption has risen steadily over the past decade. ${M}Today, the average American drinks over three cups per day.`,
      userInstruction: "add a sentence about why consumption increased",
    },
    { configurable: { thread_id: "p5" } },
  );
  console.log("Position:", r5.parsedInput.markerPosition);
  console.log("Operation:", r5.parsedInput.operationType);

  // ─────────────────────────────────────────────
  // Pattern 6: ## Heading\n█
  // Marker after a heading
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 6: After heading ===");
  const r6 = await app.invoke(
    {
      rawInput: `## History of Jazz

Jazz originated in the early 20th century in New Orleans, blending African American musical traditions with blues and ragtime.

## The Bebop Revolution

${M}

## Cool Jazz and Beyond

In reaction to bebop's intensity, cool jazz emerged in the late 1940s.`,
      userInstruction: "",
    },
    { configurable: { thread_id: "p6" } },
  );
  console.log("Position:", r6.parsedInput.markerPosition);
  console.log("Current heading:", r6.parsedInput.currentHeading);
  console.log("Next heading:", r6.parsedInput.nextHeading);

  // ─────────────────────────────────────────────
  // Pattern 7: █ (empty document)
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 7: Empty document ===");
  const r7 = await app.invoke(
    {
      rawInput: `${M}`,
      userInstruction: "write a blog post about sustainable urban farming",
    },
    { configurable: { thread_id: "p7" } },
  );
  console.log("Position:", r7.parsedInput.markerPosition);
  console.log("Operation:", r7.parsedInput.operationType);

  // ─────────────────────────────────────────────
  // Pattern 8: Paired markers (rewrite region)
  // ─────────────────────────────────────────────
  console.log("\n=== PATTERN 8: Rewrite region ===");
  const r8 = await app.invoke(
    {
      rawInput: `The conference was great. ${MARKERS.REWRITE_START}It was really good and had many nice speakers who talked about interesting things.${MARKERS.REWRITE_END} I look forward to next year.`,
      userInstruction: "make the highlighted part more vivid and specific",
    },
    { configurable: { thread_id: "p8" } },
  );
  console.log("Position:", r8.parsedInput.markerPosition);
  console.log("Operation:", r8.parsedInput.operationType);
  console.log("Selected region:", r8.parsedInput.selectedRegion);

  // ─────────────────────────────────────────────
  // Summary
  // ─────────────────────────────────────────────
  console.log("\n" + "=".repeat(60));
  console.log("ALL MARKER CHARACTERS:");
  console.log("=".repeat(60));
  for (const [name, char] of Object.entries(MARKERS)) {
    console.log(
      `  ${name}: U+${char.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")} (${char.length} byte)`,
    );
  }
}

main().catch(console.error);
