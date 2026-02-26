import { BaseAgent, AgentConfig, Message } from "./baseAgent";

export interface ContentWritingRequest {
  topic: string;
  style?: "blog" | "social" | "technical" | "creative";
  length?: "short" | "medium" | "long";
}

export class ContentWriterAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: "ContentWriter",
      systemPrompt:
        "You are an expert content writer. Create engaging, well-structured, and high-quality content. " +
        "Adapt your writing style to the requested format and audience. " +
        "Always ensure the content is clear, informative, and compelling.",
      modelName: "gpt-4",
      temperature: 0.7,
    };
    super(config);
  }

  async write(request: ContentWritingRequest): Promise<string> {
    const style = request.style || "blog";
    const length = request.length || "medium";

    const prompt = `Write ${length} ${style} content about: "${request.topic}"`;

    const messages: Message[] = [
      { role: "system", content: this.getSystemPrompt() },
      { role: "user", content: prompt },
    ];

    return this.invoke(messages);
  }
}
