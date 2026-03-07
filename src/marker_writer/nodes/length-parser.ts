import type { WriterStateValue } from '@/marker_writer/state';

export async function lengthParserNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { intent, documentState, structure } = state;
  const wc = documentState.wordCount;

  let targetLength: number;

  switch (intent.type) {
    case 'generate':
      targetLength = 300;
      break;

    case 'continue':
      targetLength = Math.min(300, Math.max(80, Math.round(wc * 0.15)));
      break;

    case 'insert': {
      const hasHeadings = structure.currentHeading || structure.nextHeading;
      targetLength = hasHeadings
        ? Math.min(400, Math.max(100, Math.round(wc * 0.2)))
        : Math.min(200, Math.max(50, Math.round(wc * 0.1)));
      break;
    }

    case 'rewrite':
    case 'expand': {
      const regionWords = state.cursorInfo.selectedRegion
        .split(/\s+/)
        .filter(Boolean).length;
      targetLength =
        intent.type === 'expand' ? Math.round(regionWords * 1.5) : regionWords;
      break;
    }

    case 'delete':
      targetLength = 0;
      break;

    default:
      targetLength = 200;
  }

  return { targetLength };
}
