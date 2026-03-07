import { createWriterModel } from "@/marker_writer/models";
import type { WriterStateValue } from "@/marker_writer/state";
import type { AssembledPrompt } from "@/marker_writer/types";

function buildPrompt(state: WriterStateValue): AssembledPrompt {
  const { intent, context, structure, targetLength, cursorInfo } = state;

  let system =
    `You are a skilled writer. Generate text that seamlessly fits the surrounding context.\n` +
    `Rules:\n` +
    `- Match the tone, style, and vocabulary of the existing text\n` +
    `- Output ONLY the generated text, no explanations or meta-commentary\n` +
    `- Target approximately ${targetLength} words`;

  let user = "";

  switch (intent.type) {
    case "continue":
      system += "\n- Continue naturally from where the text left off";
      user = `Continue this text:\n\n${context.immediateBefore}`;
      if (context.immediateAfter) {
        user += `\n\n[The text continues after your insertion with:]\n${context.immediateAfter}`;
      }
      break;

    case "insert":
      system += "\n- Bridge between the text before and after naturally";
      user = `Write text to insert between these sections:\n\nBEFORE:\n${context.immediateBefore}\n\nAFTER:\n${context.immediateAfter}`;
      if (structure.currentHeading) {
        user += `\n\nCurrent section: "${structure.currentHeading}"`;
      }
      break;

    case "rewrite":
      system += "\n- Rewrite the selected text while preserving its meaning";
      user = `Rewrite this text:\n\n"${cursorInfo.selectedRegion}"\n\nContext before: ${context.lastSentenceBefore}\nContext after: ${context.firstSentenceAfter}`;
      break;

    case "expand":
      system += "\n- Expand and enhance the selected text with more detail";
      user = `Expand this text:\n\n"${cursorInfo.selectedRegion}"\n\nContext before: ${context.lastSentenceBefore}\nContext after: ${context.firstSentenceAfter}`;
      break;

    case "delete":
      return { system: "", user: "" };

    case "generate":
      system += "\n- Generate a complete, well-structured piece of writing";
      user = "Generate text";
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
  if (state.intent.type === "delete") {
    return {
      assembledPrompt: { system: "", user: "" },
      generatedText: "",
      processedText: "",
    };
  }

  const prompt = buildPrompt(state);
  const model = createWriterModel();

  const response = await model.invoke([
    { role: "system", content: prompt.system },
    { role: "user", content: prompt.user },
  ]);

  const generated =
    typeof response.content === "string" ? response.content : "";

  return {
    assembledPrompt: prompt,
    generatedText: generated,
    processedText: generated.trim(),
  };
}
