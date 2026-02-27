// Load environment variables FIRST, before any other imports
import dotenv from "dotenv";
dotenv.config();

import { program } from "commander";
import { readFileSync } from "fs";
import { createInterface } from "readline";
import { createWritingGraph } from "@/graph";
import { WritingStateValue } from "@/state";

async function runWritingAgent(
  inputText: string,
  maxIterations: number = 3,
  verbose: boolean = false
): Promise<void> {
  console.log("\n" + "=".repeat(60));
  console.log("Writing Continuation Agent");
  console.log("=".repeat(60) + "\n");

  const graph = createWritingGraph();

  const initialState: WritingStateValue = {
    inputText: inputText.trim(),
    continuation: "",
    formattedContinuation: "",
    evaluationScore: 0,
    evaluationFeedback: "",
    passed: false,
    iteration: 0,
    maxIterations,
    history: [],
  };

  console.log(`[system] Input text length: ${inputText.length} characters`);
  console.log(`[system] Max iterations: ${maxIterations}`);
  console.log(`[system] Starting writing and evaluation loop...\n`);

  try {
    const finalState = await graph.invoke(initialState);

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("Final Result");
    console.log("=".repeat(60) + "\n");

    console.log("ORIGINAL TEXT:\n");
    console.log(finalState.inputText);

    console.log("\n" + "-".repeat(60) + "\n");
    console.log("GENERATED CONTINUATION:\n");
    console.log(finalState.formattedContinuation || finalState.continuation);

    console.log("\n" + "=".repeat(60));
    console.log("Summary");
    console.log("=".repeat(60));
    console.log(`Total iterations: ${finalState.iteration}`);
    console.log(`Final evaluation score: ${finalState.evaluationScore}/10`);
    console.log(`Evaluation passed: ${finalState.passed ? "✓ Yes" : "✗ No"}`);

    if (verbose && finalState.history.length > 0) {
      console.log("\nIteration History:");
      finalState.history.forEach((attempt: any, index: number) => {
        console.log(
          `\n  Iteration ${index + 1}:`
        );
        console.log(`    Score: ${attempt.score}/10`);
        console.log(`    Feedback: ${attempt.feedback}`);
      });
    }

    console.log("\n" + "=".repeat(60) + "\n");
  } catch (error) {
    console.error("\n[error] Failed to generate continuation:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

async function interactiveMode(): Promise<void> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (prompt: string): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(prompt, (answer) => {
        resolve(answer);
      });
    });
  };

  try {
    console.log("\n=".repeat(60));
    console.log("Writing Continuation Agent - Interactive Mode");
    console.log("=".repeat(60) + "\n");

    const inputText = await question(
      'Paste your text (press Enter twice when done):\n'
    );
    const maxIterationsStr = await question(
      "\nMax iterations (default 3): "
    );
    const maxIterations = maxIterationsStr ? parseInt(maxIterationsStr) : 3;

    rl.close();

    await runWritingAgent(inputText, maxIterations, true);
  } catch (error) {
    rl.close();
    throw error;
  }
}

// CLI Setup
program
  .name("writing-agent")
  .description("AI writing continuation agent with evaluator feedback loop")
  .version("1.0.0");

program
  .option("--input <text>", "Input text to continue")
  .option("--file <path>", "Read input from file")
  .option("--interactive", "Interactive mode")
  .option("--max-iterations <number>", "Max iterations (default 3)", "3")
  .option("--verbose", "Verbose output with iteration history");

program.parse();

const options = program.opts();

async function main(): Promise<void> {
  let inputText: string | null = null;
  const maxIterations = parseInt(options.maxIterations as string) || 3;
  const verbose = options.verbose as boolean;

  if (options.input) {
    inputText = options.input as string;
  } else if (options.file) {
    try {
      inputText = readFileSync(options.file as string, "utf-8");
    } catch (error) {
      console.error(`Error reading file: ${(error as Error).message}`);
      process.exit(1);
    }
  } else if (options.interactive) {
    await interactiveMode();
    return;
  } else {
    console.log("No input provided. Use --help for usage instructions.");
    console.log("\nExamples:");
    console.log('  npx tsx src/index.ts --input "Your text here..."');
    console.log("  npx tsx src/index.ts --file input.txt");
    console.log("  npx tsx src/index.ts --interactive");
    process.exit(1);
  }

  if (inputText) {
    await runWritingAgent(inputText, maxIterations, verbose);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
