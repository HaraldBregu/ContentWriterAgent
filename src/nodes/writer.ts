import { ChatOpenAI } from "@langchain/openai";
import { WritingStateValue } from "@/state";
import { config } from "@/config";

const writer = new ChatOpenAI({
  model: config.model,
  temperature: config.writerTemperature,
});

export async function writerNode(state: WritingStateValue): Promise<Partial<WritingStateValue>> {
  const { inputText, evaluationFeedback, iteration } = state;

  let systemPrompt = `You are a creative writing continuation assistant. Your task is to seamlessly continue a piece of text provided by the user.

Guidelines:
1. Match the tone, style, voice, and genre of the original text exactly
2. Maintain narrative consistency and flow
3. Generate a continuation of approximately 200-400 words
4. Ensure the transition from input to continuation is smooth and natural
5. If this is a revision, carefully address the feedback provided`;

  let userMessage = `Original text:
"""
${inputText}
"""

Please generate a natural continuation of this text.`;

  if (evaluationFeedback && iteration > 0) {
    userMessage += `

Previous feedback to address:
${evaluationFeedback}

Please revise the continuation to address this feedback while maintaining the quality and style of the original.`;
  }

  console.log(`[writer] Iteration ${iteration + 1}: Generating continuation...`);

  try {
    const response = await writer.invoke([
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ] as any);

    const continuation = typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

    console.log(`[writer] Generated ${continuation.length} characters of continuation`);

    return {
      continuation,
    };
  } catch (error) {
    console.error("[writer] Error generating continuation:", error);
    throw error;
  }
}
