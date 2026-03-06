import type { WriterStateValue } from '@/marker_writer/state';
import { countWords } from '@/marker_writer/helpers';

export async function stitcherNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const p = state.parsedInput;
  const generated = state.generatedText;

  let finalDocument: string;

  switch (p.operationType) {
    case 'CONTINUE':
    case 'FILL_SECTION': {
      let sep = '';
      if (p.isInsideSentence) sep = '';
      else if (p.markerPosition === 'AFTER_HEADING') sep = '\n\n';
      else if (
        p.markerPosition === 'END_OF_TEXT' &&
        p.textBefore.endsWith('\n\n')
      )
        sep = '';
      else if (/[.!?]\s*$/.test(p.textBefore.trimEnd())) sep = ' ';
      else sep = '';

      finalDocument = p.textBefore + sep + generated;
      break;
    }

    case 'BRIDGE': {
      let leftSep = '';
      let rightSep = '';

      if (p.markerPosition === 'BETWEEN_BLOCKS') {
        leftSep = '\n\n';
        rightSep = '\n\n';
      } else if (
        p.markerPosition === 'MID_PARAGRAPH' ||
        p.markerPosition === 'MID_SENTENCE'
      ) {
        leftSep = p.isInsideSentence ? '' : ' ';
        rightSep = ' ';
      } else if (p.markerPosition === 'BETWEEN_LINES') {
        leftSep = '\n';
        rightSep = '\n';
      } else {
        leftSep = ' ';
        rightSep = ' ';
      }

      finalDocument =
        p.textBefore + leftSep + generated + rightSep + p.textAfter;
      break;
    }

    case 'PREPEND': {
      finalDocument = generated + '\n\n' + p.textAfter;
      break;
    }

    case 'GENERATE': {
      finalDocument = generated;
      break;
    }

    default:
      finalDocument = p.textBefore + generated + p.textAfter;
  }

  return {
    finalDocument,
    changeDescription: [
      `Position: ${p.markerPosition}`,
      `Operation: ${p.operationType}`,
      `Line ${p.markerLineNumber}, Col ${p.markerColumnNumber}`,
      `Added ~${countWords(generated)} words`,
      p.isInsideSentence ? 'Completed mid-sentence' : '',
      p.operationType === 'BRIDGE' ? 'Bridged to existing text' : '',
    ]
      .filter(Boolean)
      .join(' | '),
  };
}
