import { ChatOpenAI } from "@langchain/openai";
import { WritingStateValue } from "@/state";
import { config } from "@/config";

export async function formatterNode(state: WritingStateValue): Promise<Partial<WritingStateValue>> {
  const { continuation } = state;

  // Create LLM instance inside function (after dotenv is loaded)
  const formatter = new ChatOpenAI({
    model: config.model,
    temperature: config.formatterTemperature,
  });

  const systemPrompt = `You are a writing polisher. Lightly refine the provided text without altering its meaning, structure, or intent. Fix awkward phrasing, improve flow, ensure consistent style. Do NOT rewrite, add content, or change the tone. Provide the polished version only, without explanations.`;

  const userMessage = `Please polish the following text:

"""
${continuation}
"""`;

  console.log(`[formatter] Polishing continuation...\n`);

  try {
    let formattedContinuation = "";

    const stream = await formatter.stream([
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ] as any);

    for await (const chunk of stream) {
      const content = String(chunk.content || "");
      formattedContinuation += content;
      if (content) process.stdout.write(content);
    }

    console.log(`\n\n[formatter] Polished ${formattedContinuation.length} characters`);

    return {
      formattedContinuation,
    };
  } catch (error) {
    console.error("[formatter] Error polishing continuation:", error);
    throw error;
  }
}
