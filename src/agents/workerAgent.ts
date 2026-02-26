import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, BaseMessage } from "@langchain/core/messages";
import { AgentState } from "../types/state";

export async function workerNode(state: AgentState): Promise<Partial<AgentState>> {
  const llm = new ChatOpenAI({
    modelName: "gpt-4",
    temperature: 0.7,
  });

  let systemPrompt = `You are a helpful assistant that can complete content writing tasks.
You keep working on a task until either you have a question or clarification for the user, or the success criteria is met.

This is the success criteria:
${state.successCriteria}

You should reply either with a question for the user about this assignment, or with your final response.
If you have a question for the user, you need to reply by clearly stating your question. An example might be:

Question: please clarify whether you want a summary or a detailed answer

If you've finished, reply with the final answer, and don't ask a question; simply reply with the answer.`;

  if (state.feedbackOnWork) {
    systemPrompt += `

Previously you thought you completed the assignment, but your reply was rejected because the success criteria was not met.
Here is the feedback on why this was rejected:
${state.feedbackOnWork}

With this feedback, please continue the assignment, ensuring that you meet the success criteria or have a question for the user.`;
  }

  // Update or add system message
  let messages: any[] = [...state.messages];
  const systemMessageIndex = messages.findIndex(
    (msg) => msg._getType?.() === "system"
  );

  if (systemMessageIndex !== -1) {
    messages[systemMessageIndex] = new SystemMessage(systemPrompt);
  } else {
    messages = [new SystemMessage(systemPrompt), ...messages];
  }

  // Convert to plain objects for LLM invocation
  const messageObjects = messages.map((msg) => ({
    role: msg._getType?.() === "human" ? "user" : (msg._getType?.() === "ai" ? "assistant" : "system"),
    content: msg.content,
  }));

  // Invoke the LLM
  const response = await llm.invoke(messageObjects as any);

  return {
    messages: [...state.messages, response as any],
  };
}
