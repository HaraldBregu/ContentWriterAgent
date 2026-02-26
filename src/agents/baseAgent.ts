import { ChatOpenAI } from "@langchain/openai";

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  modelName?: string;
  temperature?: number;
}

export interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export class BaseAgent {
  private model: ChatOpenAI;
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
    this.model = new ChatOpenAI({
      modelName: config.modelName || "gpt-4",
      temperature: config.temperature ?? 0.7,
    });
  }

  async invoke(messages: Message[]): Promise<string> {
    const formattedMessages = messages.map((msg) => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
    }));

    const response = await this.model.invoke(formattedMessages as any);
    return typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);
  }

  getName(): string {
    return this.config.name;
  }

  getSystemPrompt(): string {
    return this.config.systemPrompt;
  }
}
