import dotenv from "dotenv";
import { HumanMessage } from "@langchain/core/messages";
import { createSidekickGraph } from "../graph/sidekickGraph";
import { AgentState } from "../types/state";

dotenv.config();

async function runSidekickExample() {
  // Initialize the graph
  const graph = createSidekickGraph();

  // Define the initial state
  const initialState: AgentState = {
    messages: [
      new HumanMessage(
        "Write a blog post about the benefits of using AI agents in content creation"
      ),
    ],
    successCriteria:
      "Write an engaging blog post (800-1000 words) that explains the benefits of AI agents in content creation, includes practical examples, and provides actionable insights for readers",
    feedbackOnWork: null,
    successCriteriaMet: false,
    userInputNeeded: false,
  };

  console.log("🚀 Starting Sidekick Agent...\n");
  console.log(`📋 Success Criteria: ${initialState.successCriteria}\n`);

  try {
    // Run the graph
    const result = await graph.invoke(initialState);

    console.log("\n✅ Agent Completed!\n");
    console.log("=".repeat(50));
    console.log("Final Results:");
    console.log("=".repeat(50));
    console.log(
      `Success Criteria Met: ${result.successCriteriaMet ? "✓" : "✗"}`
    );
    console.log(
      `User Input Needed: ${result.userInputNeeded ? "✓" : "✗"}`
    );

    // Find the final assistant message
    const assistantMessages = result.messages.filter(
      (msg: any) => msg._getType() === "ai"
    );
    if (assistantMessages.length > 0) {
      const lastMessage = assistantMessages[assistantMessages.length - 1];
      console.log("\n📝 Final Response:\n");
      console.log(lastMessage.content);
    }

    // Show feedback if available
    if (result.feedbackOnWork) {
      console.log("\n📊 Evaluator Feedback:");
      console.log(result.feedbackOnWork);
    }
  } catch (error) {
    console.error("❌ Error running Sidekick:", error);
    throw error;
  }
}

// Run the example
runSidekickExample();
