import { BaseMessage } from "@langchain/core/messages";

export interface AgentState {
  messages: BaseMessage[];
  successCriteria: string;
  feedbackOnWork: string | null;
  successCriteriaMet: boolean;
  userInputNeeded: boolean;
}
