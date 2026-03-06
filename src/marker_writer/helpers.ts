import { MARKERS } from '@/marker_writer/markers';

export function stripAllMarkers(text: string): string {
  let clean = text;
  for (const char of Object.values(MARKERS)) {
    clean = clean.replaceAll(char, '');
  }
  return clean;
}

// Get the index in clean text corresponding to an index in marked text
export function getCleanIndex(markedText: string, markedIndex: number): number {
  const markerChars = new Set<string>(Object.values(MARKERS));
  let cleanIdx = 0;
  for (let i = 0; i < markedIndex; i++) {
    if (!markerChars.has(markedText[i])) {
      cleanIdx++;
    }
  }
  return cleanIdx;
}

export function extractLastSentence(text: string): string {
  const trimmed = text.trimEnd();
  if (!trimmed) return '';
  const sentences = trimmed.split(/(?<=[.!?])\s+/);
  return sentences[sentences.length - 1] || '';
}

export function extractFirstSentence(text: string): string {
  const trimmed = text.trimStart();
  if (!trimmed) return '';
  const match = trimmed.match(/^[^.!?]+[.!?]/);
  return match ? match[0] : trimmed.slice(0, 200);
}

export function findCurrentHeading(textBefore: string): string {
  const headings = textBefore.match(/^#{1,6}\s+.+$/gm);
  return headings ? headings[headings.length - 1].replace(/^#+\s+/, '') : '';
}

export function findPreviousHeading(textBefore: string): string {
  const headings = textBefore.match(/^#{1,6}\s+.+$/gm);
  if (!headings || headings.length < 2) return '';
  return headings[headings.length - 2].replace(/^#+\s+/, '');
}

export function findNextHeading(textAfter: string): string {
  const match = textAfter.match(/^#{1,6}\s+.+$/m);
  return match ? match[0].replace(/^#+\s+/, '') : '';
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function getLineNumber(text: string, charIndex: number): number {
  return text.slice(0, charIndex).split('\n').length;
}

export function getColumnNumber(text: string, charIndex: number): number {
  const lastNewline = text.lastIndexOf('\n', charIndex - 1);
  return charIndex - lastNewline;
}
