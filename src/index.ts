import dotenv from "dotenv";

dotenv.config();

console.log("Content Writer Agent with Multi-Agent Framework");
console.log("=".repeat(50));
console.log(
  "\nChoose an example to run:"
);
console.log("1. Simple Content Writer: npm run example:simple");
console.log("2. Sidekick Multi-Agent: npm run example:sidekick");
console.log("\nOr import the agents directly in your code:");
console.log('  - ContentWriterAgent from "./agents/contentWriterAgent"');
console.log('  - createSidekickGraph from "./graph/sidekickGraph"');

