import type { WriterStateValue } from '@/marker_writer/state';
import type { DiffInfo } from '@/marker_writer/types';
import { countWords } from '@/marker_writer/helpers';

export async function stitcherNode(
  state: WriterStateValue,
): Promise<Partial<WriterStateValue>> {
  const { cursorInfo, documentState, intent, processedText, context } = state;
  const { textBefore, textAfter, selectedRegion } = cursorInfo;

  let finalDocument: string;
  let diffType: DiffInfo['type'];
  let removedText = '';

  switch (intent.type) {
    case 'delete': {
      finalDocument = textBefore + textAfter;
      diffType = 'delete';
      removedText = selectedRegion;
      break;
    }

    case 'rewrite':
    case 'expand': {
      finalDocument = textBefore + processedText + textAfter;
      diffType = 'replace';
      removedText = selectedRegion;
      break;
    }

    case 'generate': {
      finalDocument = processedText;
      diffType = 'generate';
      break;
    }

    case 'insert': {
      let leftSep = '';
      let rightSep = '';
      const pos = documentState.position;

      if (pos === 'BETWEEN_BLOCKS' || pos === 'BEFORE_HEADING') {
        leftSep = '\n\n';
        rightSep = '\n\n';
      } else if (pos === 'MID_PARAGRAPH' || pos === 'MID_SENTENCE') {
        leftSep = context.isInsideSentence ? '' : ' ';
        rightSep = ' ';
      } else if (pos === 'BETWEEN_LINES') {
        leftSep = '\n';
        rightSep = '\n';
      } else if (pos === 'AFTER_HEADING') {
        leftSep = '\n\n';
        rightSep = textAfter.trim() ? '\n\n' : '';
      } else if (pos === 'START_OF_TEXT') {
        leftSep = '';
        rightSep = '\n\n';
      } else {
        leftSep = ' ';
        rightSep = ' ';
      }

      finalDocument =
        textBefore + leftSep + processedText + rightSep + textAfter;
      diffType = 'insert';
      break;
    }

    case 'continue':
    default: {
      let sep = '';
      if (context.isInsideSentence) sep = '';
      else if (textBefore.endsWith('\n\n')) sep = '';
      else if (/[.!?]\s*$/.test(textBefore.trimEnd())) sep = ' ';

      finalDocument = textBefore + sep + processedText;
      diffType = 'insert';
      break;
    }
  }

  const diff: DiffInfo = {
    type: diffType,
    position: cursorInfo.markerIndex,
    addedText: processedText,
    removedText,
    addedWords: countWords(processedText),
  };

  const changeDescription = [
    `Intent: ${intent.type}`,
    `Position: ${documentState.position}`,
    `Line ${cursorInfo.lineNumber}, Col ${cursorInfo.columnNumber}`,
    diff.addedWords > 0 ? `Added ~${diff.addedWords} words` : '',
    removedText ? `Removed ~${countWords(removedText)} words` : '',
    context.isInsideSentence ? 'Completed mid-sentence' : '',
    intent.type === 'insert' ? 'Bridged to existing text' : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return { finalDocument, diff, changeDescription };
}
