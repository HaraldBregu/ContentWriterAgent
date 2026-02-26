import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import { WritingStateValue } from "@/state";
import { config } from "@/config";

const EvaluationSchema = z.object({
  score: z.number().min(0).max(10).describe("Score from 0-10"),
  passed: z.boolean().describe("Whether the continuation passed evaluation"),
  feedback: z.string().describe("Specific feedback for improvement"),
});

export async function evaluatorNode(
  state: WritingStateValue
): Promise<Partial<WritingStateValue>> {
  const { inputText, continuation } = state;

  // Create LLM instance inside function (after dotenv is loaded)
  const evaluator = new ChatOpenAI({
    model: config.model,
    temperature: config.evaluatorTemperature,
  });

  const evaluatorWithStructured = evaluator.withStructuredOutput(EvaluationSchema);

  const systemPrompt = `You are an expert writing quality evaluator. Your task is to assess a continuation of a piece of text based on specific criteria.

Evaluation Criteria:
1. **Coherence**: Does the continuation logically follow the input? Is the narrative flow smooth?
2. **Style Consistency**: Does it match the tone, voice, and genre of the original?
3. **Quality**: Is the writing engaging, well-crafted, and free of errors?
4. **Flow**: Is the transition from input to continuation seamless and natural?

Scoring:
- 9-10: Excellent - All criteria met excellently, seamless continuation
- 7-8: Good - Meets all criteria well with minor room for improvement
- 5-6: Fair - Some criteria met, but notable issues with coherence, style, or quality
- 3-4: Poor - Multiple issues that need significant revision
- 0-2: Very Poor - Continuation is unsuitable or incoherent

Respond with JSON containing:
- score: number (0-10)
- passed: boolean (true if score >= ${config.passThreshold})
- feedback: string with specific suggestions for improvement if not passed, or confirmation if passed`;

  const userMessage = `Original text:
"""
${inputText}
"""

Generated continuation:
"""
${continuation}
"""

Please evaluate this continuation based on the criteria above.`;

  console.log(`[evaluator] Evaluating continuation...`);

  try {
    const evaluation = await evaluatorWithStructured.invoke([
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ] as any);

    console.log(
      `[evaluator] Score: ${evaluation.score}/10 | Passed: ${evaluation.passed}`
    );
    if (!evaluation.passed) {
      console.log(`[evaluator] Feedback: ${evaluation.feedback}`);
    }

    return {
      evaluationScore: evaluation.score,
      evaluationFeedback: evaluation.feedback,
      passed: evaluation.passed,
    };
  } catch (error) {
    console.error("[evaluator] Error evaluating continuation:", error);
    throw error;
  }
}
