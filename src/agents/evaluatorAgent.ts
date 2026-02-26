import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages";
import { AgentState } from "../types/state";
import { EvaluatorOutputSchema } from "../types/evaluator";

function formatConversation(messages: any[]): string {
  let conversation = "Conversation history:\n\n";
  for (const message of messages) {
    if (message._getType() === "human") {
      conversation += `User: ${message.content}\n`;
    } else if (message._getType() === "ai") {
      const text = message.content || "[Tool use]";
      conversation += `Assistant: ${text}\n`;
    }
  }
  return conversation;
}

export async function evaluatorNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
  });

  const lastResponse = state.messages[state.messages.length - 1].content;

  const systemMessage = `You are an evaluator that determines if a task has been completed successfully by an Assistant.
Assess the Assistant's last response based on the given criteria. Respond with your feedback, and with your decision on whether the success criteria has been met,
and whether more input is needed from the user.`;

  let userMessage = `You are evaluating a conversation between the User and Assistant. You decide what action to take based on the last response from the Assistant.

The entire conversation with the assistant, with the user's original request and all replies, is:
${formatConversation(state.messages)}

The success criteria for this assignment is:
${state.successCriteria}

And the final response from the Assistant that you are evaluating is:
${lastResponse}

Respond with your feedback, and decide if the success criteria is met by this response.
Also, decide if more user input is required, either because the assistant has a question, needs clarification, or seems to be stuck and unable to answer without help.`;

  if (state.feedbackOnWork) {
    userMessage += `
Also, note that in a prior attempt from the Assistant, you provided this feedback: ${state.feedbackOnWork}
If you're seeing the Assistant repeating the same mistakes, then consider responding that user input is required.`;
  }

  const messages = [
    { role: "system" as const, content: systemMessage },
    { role: "user" as const, content: userMessage },
  ];

  // Use structured output
  const llmWithOutput = llm.withStructuredOutput(EvaluatorOutputSchema);
  const evalResult = await llmWithOutput.invoke(messages as any);

  const evaluationMessage = new AIMessage(
    `Evaluator Feedback on this answer: ${evalResult.feedback}`
  );

  return {
    messages: [...state.messages, evaluationMessage],
    feedbackOnWork: evalResult.feedback,
    successCriteriaMet: evalResult.success_criteria_met,
    userInputNeeded: evalResult.user_input_needed,
  };
}
