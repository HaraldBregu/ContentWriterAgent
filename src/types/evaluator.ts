import { z } from "zod";

export const EvaluatorOutputSchema = z.object({
  feedback: z.string().describe("Feedback on the assistant's response"),
  success_criteria_met: z
    .boolean()
    .describe("Whether the success criteria have been met"),
  user_input_needed: z
    .boolean()
    .describe(
      "True if more input is needed from the user, or clarifications, or the assistant is stuck"
    ),
});

export type EvaluatorOutput = z.infer<typeof EvaluatorOutputSchema>;
