import type { WriterStateValue } from '@/marker_writer/state';
import type { IntentType, MarkerPosition } from '@/marker_writer/types';

const POSITION_INSTRUCTIONS: Record<MarkerPosition, string> = {
  END_OF_TEXT: 'Continue from the end of the text. Write naturally forward.',
  START_OF_TEXT: `Write content that LEADS INTO the existing text.
Your content must end with a sentence that makes the existing text feel like a natural continuation.`,
  BETWEEN_BLOCKS: `Write content that BRIDGES two sections.
Your content must flow FROM the first and INTO the second seamlessly.`,
  MID_PARAGRAPH: `Insert new sentences INSIDE a paragraph.
Your sentences must fit between the preceding and following sentences naturally.`,
  MID_SENTENCE: `The text stops mid-sentence. FIRST: complete the sentence naturally. THEN: continue with new content.`,
  AFTER_HEADING: `Write the section content for the heading above.
Match the depth and length of other sections in the document.`,
  BEFORE_HEADING: `Write content that concludes the current section and transitions toward the next section.`,
  INLINE_END: `Continue from the end of this line and connect to the next line naturally.`,
  BETWEEN_LINES: `Insert content between the two lines.`,
  EMPTY_DOCUMENT: `This is a blank document. Write from scratch based on the user's instruction.`,
  REGION_SELECTED: `Operate on the selected region while maintaining connections to surrounding text.`,
};

function buildIntentBlock(state: WriterStateValue): string {
  const { intent, context, structure } = state;

  switch (intent.type) {
    case 'rewrite':
      return `REWRITE the selected region: "${state.cursorInfo.selectedRegion.slice(0, 200)}"
${intent.instruction ? `Instruction: ${intent.instruction}` : 'Improve clarity and quality.'}`;

    case 'expand':
      return `EXPAND the selected region: "${state.cursorInfo.selectedRegion.slice(0, 200)}"
${intent.instruction ? `Instruction: ${intent.instruction}` : 'Add detail and depth.'}`;

    case 'delete':
      return 'DELETE the selected region. Return empty string.';

    case 'insert':
      return `INSERT text between existing content.
Before: "${context.lastSentenceBefore}"
After: "${context.firstSentenceAfter}"
${intent.instruction ? `Instruction: ${intent.instruction}` : ''}
CRITICAL: Your final sentence must connect naturally to the text after.`;

    case 'generate':
      return `GENERATE new content from scratch.
${intent.instruction ? `Instruction: ${intent.instruction}` : ''}`;

    case 'continue':
    default:
      return `CONTINUE the text naturally.
${context.isInsideSentence ? `Complete the sentence first: "${context.lastSentenceBefore}"` : ''}
${structure.nextHeading ? `Do not overlap with next section: "${structure.nextHeading}"` : ''}
${intent.instruction ? `Instruction: ${intent.instruction}` : ''}`;
  }
}

export async function promptAssemblerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { documentState, styleProfile, context, structure, targetLength } =
    state;

  const system = `You are writing text to insert at a precise position in a document.

═══ POSITION ═══
${POSITION_INSTRUCTIONS[documentState.position]}

═══ INTENT ═══
${buildIntentBlock(state)}

═══ VOICE (match EXACTLY) ═══
Tone: ${styleProfile.tone}
Sentence length: avg ${styleProfile.avgSentenceLength} words
Paragraph style: ${styleProfile.paragraphStyle}
Vocabulary: ${styleProfile.vocabulary}
Point of view: ${styleProfile.pointOfView}
Tense: ${styleProfile.tense}
${styleProfile.notablePatterns.length > 0 ? `Patterns: ${styleProfile.notablePatterns.join(', ')}` : ''}

═══ STRUCTURE ═══
${structure.currentHeading ? `Current section: "${structure.currentHeading}"` : ''}
${structure.nextHeading ? `Next section: "${structure.nextHeading}"` : ''}

═══ RULES ═══
1. Write ONLY the insertion text — nothing else
2. No meta-commentary, no "here's the continuation"
3. A reader must NOT be able to tell where the original ends and your writing begins
4. Match the exact voice
5. Target: ~${targetLength} words (±20%)${state.coherenceFeedback ? `\n\n═══ REVISION REQUIRED ═══\n${state.coherenceFeedback}` : ''}`;

  const isBridge =
    state.intent.type === 'insert' ||
    documentState.position === 'START_OF_TEXT';
  const afterBlock = isBridge
    ? `\n\nTEXT AFTER MARKER (you MUST flow into this):\n${context.immediateAfter}\n\nCRITICAL: Your final sentence must connect naturally to the text after.`
    : `\n\nTEXT AFTER MARKER:\n${context.immediateAfter || '(end of document)'}`;

  const user =
    `TEXT BEFORE MARKER:\n${context.immediateBefore}\n\n---WRITE HERE---` +
    afterBlock;

  return { assembledPrompt: { system, user } };
}
