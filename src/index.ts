import dotenv from "dotenv";
import { ContentWriterAgent } from "./agents/contentWriterAgent";

dotenv.config();

async function main() {
  const agent = new ContentWriterAgent();

  const content = await agent.write({
    topic: "AI Agents and Content Generation",
    style: "blog",
    length: "medium",
  });

  console.log("Generated Content:\n");
  console.log(content);
}

main().catch(console.error);

