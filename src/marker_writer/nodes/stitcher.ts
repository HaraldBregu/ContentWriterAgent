import type { WriterStateValue } from "@/marker_writer/state";
import type { DiffInfo } from "@/marker_writer/types";
import { countWords } from "@/marker_writer/helpers";

export function stitcherNode(
  state: WriterStateValue,
): Partial<WriterStateValue> {
  const { cursorInfo, processedText, intent } = state;

  let finalDocument: string;
  let diff: DiffInfo;

  switch (intent.type) {
    case "delete":
      finalDocument = (cursorInfo.textBefore + cursorInfo.textAfter).trim();
      diff = {
        type: "delete",
        position: cursorInfo.markerIndex,
        addedText: "",
        removedText: cursorInfo.selectedRegion,
        addedWords: 0,
      };
      break;

    case "rewrite":
    case "expand":
      finalDocument =
        cursorInfo.textBefore + processedText + cursorInfo.textAfter;
      diff = {
        type: "replace",
        position: cursorInfo.markerIndex,
        addedText: processedText,
        removedText: cursorInfo.selectedRegion,
        addedWords: countWords(processedText),
      };
      break;

    case "generate":
      finalDocument = processedText;
      diff = {
        type: "generate",
        position: 0,
        addedText: processedText,
        removedText: "",
        addedWords: countWords(processedText),
      };
      break;

    default:
      finalDocument =
        cursorInfo.textBefore + processedText + cursorInfo.textAfter;
      diff = {
        type: "insert",
        position: cursorInfo.markerIndex,
        addedText: processedText,
        removedText: "",
        addedWords: countWords(processedText),
      };
  }

  return {
    finalDocument,
    diff,
    changeDescription: `${intent.type}: ${diff.addedWords} words`,
  };
}
