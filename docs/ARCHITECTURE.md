# Content Writer Agent - Architecture

This document describes the architecture of the Content Writer Agent, a sophisticated multi-agent system built with LangChain and LangGraph.

## System Overview

The Content Writer Agent uses a **multi-agent workflow** where specialized agents collaborate to produce high-quality content:

1. **Worker Agent**: Generates content based on user requirements
2. **Evaluator Agent**: Validates the output against success criteria
3. **Feedback Loop**: Provides constructive feedback to improve results

This architecture is inspired by production-grade AI systems where multiple agents collaborate to ensure quality and correctness.

## Core Components

### 1. State Management (`src/types/state.ts`)

The system uses a centralized state that flows through the graph:

```typescript
interface AgentState {
  messages: BaseMessage[];          // Conversation history
  successCriteria: string;          // What needs to be accomplished
  feedbackOnWork: string | null;    // Evaluator feedback
  successCriteriaMet: boolean;      // Has the task succeeded?
  userInputNeeded: boolean;         // Does the user need to clarify?
}
```

### 2. Structured Outputs (`src/types/evaluator.ts`)

The evaluator uses Zod schemas to ensure structured, type-safe outputs:

```typescript
EvaluatorOutput {
  feedback: string;                 // Detailed feedback on the response
  success_criteria_met: boolean;    // Whether criteria are satisfied
  user_input_needed: boolean;       // Whether clarification is needed
}
```

### 3. Worker Agent (`src/agents/workerAgent.ts`)

The worker agent is responsible for:
- Understanding the user's request and success criteria
- Generating content that meets the requirements
- Asking clarifying questions when needed
- Iterating on feedback from the evaluator

**Key Features:**
- Maintains conversation history
- Can receive feedback and improve responses
- Produces either final content or clarifying questions

### 4. Evaluator Agent (`src/agents/evaluatorAgent.ts`)

The evaluator agent determines if the worker's output meets requirements:
- Analyzes the worker's response against success criteria
- Provides structured, actionable feedback
- Detects when user clarification is needed
- Identifies when criteria are met

**Key Features:**
- Structured output validation using Zod
- Conversation-aware evaluation
- Feedback loop detection (prevents infinite loops)

### 5. Graph Orchestration (`src/graph/sidekickGraph.ts`)

Uses LangGraph's `StateGraph` to define the workflow:

```
START
  ↓
WORKER (generate content)
  ↓
EVALUATOR (assess quality)
  ↓
SUCCESS CRITERIA MET?
  ├─ YES → END
  └─ NO → WORKER (iterate)
```

## Data Flow

1. **Initialization**: User provides request and success criteria
2. **Worker Phase**: Agent generates content based on the request
3. **Evaluation Phase**: Evaluator assesses against success criteria
4. **Routing Decision**:
   - If success criteria met → Complete
   - If user input needed → Stop for user clarification
   - If neither → Return to worker with feedback

## Message Management

The system maintains a full conversation history using BaseMessage objects from LangChain:
- `HumanMessage`: User input
- `AIMessage`: Agent responses
- `SystemMessage`: System instructions

This allows agents to understand context and previous iterations.

## Feedback Loops

The system implements intelligent feedback loops:
1. Worker completes initial attempt
2. Evaluator provides feedback if criteria not met
3. Worker receives feedback in system prompt
4. Worker iterates with awareness of previous failures
5. System detects repeated mistakes and requests user input

## Extension Points

The architecture is designed to be extended:

### Adding Custom Agents
```typescript
export class CustomAgent extends BaseAgent {
  constructor() {
    super({
      name: "CustomAgent",
      systemPrompt: "Your custom instructions...",
      temperature: 0.7,
    });
  }

  async customMethod(input: string): Promise<string> {
    // Implementation
  }
}
```

### Adding Tools
Future versions can add tool use through LangChain's tool binding:
```typescript
const llmWithTools = llm.bindTools(tools);
```

### Customizing Evaluation
Modify the evaluator system prompt in `evaluatorAgent.ts` to check for different criteria.

## Performance Considerations

1. **Token Usage**: The system maintains full conversation history, which increases token usage
2. **Latency**: Multiple LLM calls mean sequential processing
3. **Feedback Loops**: Can prevent successful completion if criteria are too strict

## Type Safety

The system uses TypeScript for full type safety:
- `AgentState` ensures consistent state shape
- `EvaluatorOutput` is validated with Zod
- All agent functions have explicit return types

## Testing

To test the system:
```bash
npm run example:sidekick
```

This runs the example in `src/examples/sidekickExample.ts` which demonstrates:
- Blog post generation
- Structured evaluation
- Iterative improvement through feedback
