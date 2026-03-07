import { createWriterModel } from '@/marker_writer/models';
import type { WriterStateValue } from '@/marker_writer/state';
import type { AssembledPrompt, StyleProfile } from '@/marker_writer/types';

function formatStyleNotes(style: StyleProfile): string {
  const lines = [];
  if (style.tense) lines.push(`- Tense: ${style.tense}`);
  if (style.pointOfView) lines.push(`- POV: ${style.pointOfView}`);
  if (style.tone) lines.push(`- Tone: ${style.tone}`);
  if (style.formality) lines.push(`- Formality: ${style.formality}`);
  if (style.genre) lines.push(`- Genre: ${style.genre}`);
  if (style.notablePatterns.length > 0) {
    lines.push(`- Patterns: ${style.notablePatterns.join(', ')}`);
  }
  return lines.join('\n');
}

function buildPrompt(state: WriterStateValue): AssembledPrompt {
  const {
    intent,
    context,
    structure,
    styleProfile,
    targetLength,
    cursorInfo,
  } = state;

  const system =
    `You are a skilled writer. Generate text that seamlessly fits the surrounding context.\n` +
    `Rules:\n` +
    `- Match the tone, style, and vocabulary of the existing text\n` +
    `- Output ONLY the generated text, no explanations or meta-commentary\n` +
    `- Target approximately ${targetLength} words`;

  let user = `## Inputs\n\n`;

  user += `### BEFORE_TEXT\n<before_text>\n${context.beforeParagraph || context.immediateBefore}\n</before_text>\n\n`;
  user += `### AFTER_TEXT\n<after_text>\n${context.afterParagraph || context.immediateAfter}\n</after_text>\n\n`;

  const styleNotes = formatStyleNotes(styleProfile);
  if (styleNotes) {
    user += `### STYLE_NOTES\n<style_notes>\n${styleNotes}\n</style_notes>\n\n`;
  }

  user += `### GENERATION TARGET\n`;
  user += `- Requested length: ${targetLength} words\n`;
  user += `- Action type: ${intent.type.toUpperCase()}\n\n`;

  switch (intent.type) {
    case 'continue':
      user += `Continue naturally from where the BEFORE_TEXT left off.`;
      if (context.immediateAfter) {
        user += ` The text must flow into the AFTER_TEXT.`;
      }
      break;

    case 'insert':
      user += `Write text that bridges between BEFORE_TEXT and AFTER_TEXT naturally.`;
      if (structure.currentHeading) {
        user += `\nCurrent section: "${structure.currentHeading}"`;
      }
      break;

    case 'rewrite':
      user += `Rewrite the following selected text while preserving its meaning:\n\n"${cursorInfo.selectedRegion}"`;
      break;

    case 'expand':
      user += `Expand the following selected text with more detail:\n\n"${cursorInfo.selectedRegion}"`;
      break;

    case 'delete':
      return { system: '', user: '' };

    case 'generate':
      user += `Generate a complete, well-structured piece of writing.`;
      break;
  }

  if (intent.instruction) {
    user += `\n\nAdditional instruction: ${intent.instruction}`;
  }

  return { system, user };
}

export async function writerNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  if (state.intent.type === 'delete') {
    return {
      assembledPrompt: { system: '', user: '' },
      generatedText: '',
      processedText: '',
    };
  }

  const prompt = buildPrompt(state);
  const model = createWriterModel();

  const response = await model.invoke([
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ]);

  const generated =
    typeof response.content === 'string' ? response.content : '';

  return {
    assembledPrompt: prompt,
    generatedText: generated,
    processedText: generated.trim(),
  };
}
