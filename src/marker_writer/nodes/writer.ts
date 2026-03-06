import type { MarkerPosition } from "@/marker_writer/types";
import type { WriterStateValue } from "@/marker_writer/state";
import { createWriterModel } from "@/marker_writer/models";

export async function writerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const p = state.parsedInput;
  const plan = state.writingPlan;
  const style = state.styleProfile;

  const positionInstructions: Record<MarkerPosition, string> = {
    END_OF_TEXT: `Continue from the end of the text. Write naturally forward.`,

    START_OF_TEXT: `Write content that LEADS INTO the existing text.
      The existing text begins: "${p.immediateAfter.slice(0, 200)}"
      Your content must end with a sentence that makes the existing text
      feel like a natural continuation.`,

    BETWEEN_BLOCKS: `Write content that BRIDGES two sections.
      Section before ends with: "${p.immediateBefore.slice(-200)}"
      Section after starts with: "${p.immediateAfter.slice(0, 200)}"
      Your content must flow FROM the first and INTO the second seamlessly.`,

    MID_PARAGRAPH: `Insert new sentences INSIDE a paragraph.
      Sentence before: "${p.lastSentenceBefore}"
      Sentence after: "${p.firstSentenceAfter}"
      Your sentences must fit between these two naturally.`,

    MID_SENTENCE: `The text stops mid-sentence: "${p.lastSentenceBefore}"
      FIRST: Complete this sentence naturally.
      THEN: Continue with new content.
      ${p.textAfter ? `END by connecting to: "${p.firstSentenceAfter}"` : ""}`,

    AFTER_HEADING: `Write the section content for: "${p.currentHeading}"
      ${p.nextHeading ? `The next section is "${p.nextHeading}" — don't overlap with it.` : ""}
      Match the depth and length of other sections in the document.`,

    BEFORE_HEADING: `Write content that concludes the current section
      and transitions toward the next section: "${p.nextHeading}"
      End in a way that makes the next heading feel expected.`,

    INLINE_END: `Continue from the end of this line.
      The next line starts: "${p.immediateAfter.slice(0, 200)}"
      Connect to it naturally.`,

    BETWEEN_LINES: `Insert content between these two lines:
      Line above: "${p.lastSentenceBefore}"
      Line below: "${p.firstSentenceAfter}"`,

    EMPTY_DOCUMENT: `This is a blank document. Write from scratch based on
      the user's instruction: "${state.userInstruction}"`,

    REGION_SELECTED: `Rewrite the selected region while maintaining
      connections to surrounding text.`,

    AMBIGUOUS: `Write based on the planner's approach: ${plan.approach}`,
  };

  const model = createWriterModel();

  const response = await model.invoke([
    new SystemMessage(
      `You are writing text to insert at a precise position in a document.

       ═══════════════════════════════════════
       POSITION INSTRUCTIONS
       ═══════════════════════════════════════
       ${positionInstructions[p.markerPosition]}

       ═══════════════════════════════════════
       VOICE (match EXACTLY)
       ═══════════════════════════════════════
       Tone: ${style.tone}
       Sentence length: avg ${style.avgSentenceLength} words
       Paragraph style: ${style.paragraphStyle}
       Vocabulary: ${style.vocabulary}
       Point of view: ${style.pointOfView}
       Tense: ${style.tense}
       Patterns: ${style.notablePatterns.join(", ")}

       ═══════════════════════════════════════
       PLAN
       ═══════════════════════════════════════
       Approach: ${plan.approach}
       Topics: ${plan.topics.join(", ")}
       Transition in: ${plan.transitionIn}
       Transition out: ${plan.transitionOut}
       Target: ~${plan.targetWords} words
       Avoid: ${plan.constraints.join("; ")}

       ═══════════════════════════════════════
       RULES
       ═══════════════════════════════════════
       1. Write ONLY the insertion text — nothing else
       2. No meta-commentary, no "here's the continuation"
       3. A reader must NOT be able to tell where the original
          ends and your writing begins
       4. Match the exact voice — if the original uses contractions, use them
       5. Stay within ±20% of word target`,
    ),
    new HumanMessage(
      `TEXT BEFORE MARKER:\n${p.immediateBefore}\n\n` +
        `---WRITE HERE---\n\n` +
        `TEXT AFTER MARKER:\n${p.immediateAfter || "(end of document)"}`,
    ),
  ]);

  return { generatedText: response.content as string };
}
