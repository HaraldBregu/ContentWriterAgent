import { createWriterModel } from '@/marker_writer/models';
import type { WriterStateValue } from '@/marker_writer/state';
import type { Intent, StyleProfile } from '@/marker_writer/types';

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

function buildPrompt(
  text: string,
  intent: Intent,
  styleProfile: StyleProfile,
  targetLength: number,
  instruction: string,
): { system: string; user: string } {
  let systemRules: string;

  switch (intent.type) {
    case 'continue':
      systemRules =
        `You are a skilled writer. Generate text that seamlessly continues the given text.\n` +
        `Rules:\n` +
        `- Match the tone, style, and vocabulary of the existing text\n` +
        `- Output ONLY the new continuation, do NOT repeat or include the original text\n` +
        `- No explanations or meta-commentary\n` +
        `- Target approximately ${targetLength} words`;
      break;
    case 'expand':
      systemRules =
        `You are a skilled writer. Expand the given text with more detail and depth.\n` +
        `Rules:\n` +
        `- Keep all existing content and meaning intact\n` +
        `- Add detail, examples, descriptions, or elaboration\n` +
        `- Match the tone, style, and vocabulary of the existing text\n` +
        `- Output ONLY the expanded version of the full text, no explanations or meta-commentary\n` +
        `- Target approximately ${targetLength} words total`;
      break;
    case 'rewrite':
      systemRules =
        `You are a skilled writer. Rewrite the given text according to the user's instruction.\n` +
        `Rules:\n` +
        `- Preserve the core meaning and information\n` +
        `- Apply the requested changes in tone, style, or structure\n` +
        `- Output ONLY the rewritten text, no explanations or meta-commentary\n` +
        `- Keep approximately the same length as the original`;
      break;
  }

  let user = `## Inputs\n\n`;

  user += `### TEXT\n<text>\n${text}\n</text>\n\n`;

  const styleNotes = formatStyleNotes(styleProfile);
  if (styleNotes) {
    user += `### STYLE_NOTES\n<style_notes>\n${styleNotes}\n</style_notes>\n\n`;
  }

  user += `### GENERATION TARGET\n`;
  user += `- Requested length: ${targetLength} words\n`;
  user += `- Action type: ${intent.type.toUpperCase()}\n\n`;

  switch (intent.type) {
    case 'continue':
      user += `Continue naturally from where the TEXT left off.`;
      break;
    case 'expand':
      user += `Expand the TEXT with more detail and depth.`;
      break;
    case 'rewrite':
      user += `Rewrite the TEXT.`;
      break;
  }

  if (instruction) {
    user += `\n\nAdditional instruction: ${instruction}`;
  }

  return { system: systemRules, user };
}

export async function generatorNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { rawInput, userInstruction, intent, styleProfile, targetLength } =
    state;

  const prompt = buildPrompt(
    rawInput,
    intent,
    styleProfile,
    targetLength,
    userInstruction,
  );

  const model = createWriterModel();
  const response = await model.invoke([
    { role: 'system', content: prompt.system },
    { role: 'user', content: prompt.user },
  ]);

  const generatedText =
    typeof response.content === 'string' ? response.content.trim() : '';

  const finalDocument =
    intent.type === 'continue' ? rawInput + generatedText : generatedText;

  return {
    assembledPrompt: prompt,
    generatedText,
    finalDocument,
  };
}
