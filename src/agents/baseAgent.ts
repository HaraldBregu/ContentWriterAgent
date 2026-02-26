import { ChatOpenAI } from "@langchain/openai";

export interface AgentConfig {
  name: string;
  systemPrompt: string;
  modelName?: string;
  temperature?: number;
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

  async invoke(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await this.model.invoke([
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: userMessage },
    ] as any);

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
