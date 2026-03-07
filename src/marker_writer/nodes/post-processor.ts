import type { WriterStateValue } from '@/marker_writer/state';
import { countWords } from '@/marker_writer/helpers';

function removeRepetitions(text: string, contextBefore: string): string {
  const beforeSentences = contextBefore
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.trim().length > 10);
  let cleaned = text;
  for (const sentence of beforeSentences.slice(-5)) {
    const normalized = sentence.trim().replace(/[.!?]$/, '');
    if (normalized.length > 20 && cleaned.includes(normalized)) {
      cleaned = cleaned
        .replace(normalized, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    }
  }
  return cleaned;
}

function enforceLength(text: string, target: number): string {
  if (target <= 0) return text;
  const words = text.split(/\s+/).filter(Boolean);
  const max = Math.ceil(target * 1.3);
  if (words.length <= max) return text;

  // Trim to nearest sentence boundary within limit
  const trimmed = words.slice(0, max).join(' ');
  const lastPeriod = trimmed.lastIndexOf('.');
  if (lastPeriod > trimmed.length * 0.5) {
    return trimmed.slice(0, lastPeriod + 1);
  }
  return trimmed + '.';
}

function smoothSeams(
  text: string,
  before: string,
  after: string,
  isInsideSentence: boolean,
): string {
  let result = text.trim();

  // Remove leading connector if it duplicates the end of textBefore
  if (before.trimEnd().endsWith('.') && result.startsWith('. ')) {
    result = result.slice(2);
  }

  // Ensure proper spacing
  if (isInsideSentence && /^[A-Z]/.test(result)) {
    result = result.charAt(0).toLowerCase() + result.slice(1);
  }

  return result;
}

export async function postProcessorNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { generatedText, context, targetLength } = state;

  if (state.intent.type === 'delete') {
    return { processedText: '' };
  }

  let text = generatedText;

  text = removeRepetitions(text, context.immediateBefore);
  text = enforceLength(text, targetLength);
  text = smoothSeams(
    text,
    context.immediateBefore,
    context.immediateAfter,
    context.isInsideSentence,
  );

  return { processedText: text };
}
