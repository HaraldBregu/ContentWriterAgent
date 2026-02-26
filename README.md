# Content Writer Agent

An intelligent AI agent capable of generating any type of content. Built with Node.js, TypeScript, and LangChain, this application harnesses the power of advanced AI models to create high-quality, customizable content across multiple formats and styles.

## Overview

The Content Writer Agent is designed to intelligently generate content for various use cases including blog posts, social media content, technical documentation, creative writing, and much more. With its flexible architecture, it can be extended to handle specialized content generation tasks while maintaining consistency in quality and style.

## Features

- **Versatile Content Generation**: Generates any type of content across multiple formats (blog, social media, technical, creative, etc.)
- **AI-Powered Writing**: Uses OpenAI's GPT models via LangChain for intelligent, context-aware content creation
- **Flexible Agent Architecture**: Extensible base agent class for building custom agents and specialized content generators
- **Customizable Output**: Control writing style, content length, and format to match your specific needs
- **TypeScript Support**: Full type safety and better development experience
- **Easy Configuration**: Environment-based configuration for API keys

## Prerequisites

- Node.js 18+
- npm or yarn
- OpenAI API key

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_api_key_here
```

## Development

Run the development server with hot reload:
```bash
npm run dev
```

## Build

Build the TypeScript project:
```bash
npm run build
```

## Run

Execute the built application:
```bash
npm start
```

## Project Structure

```
src/
├── index.ts              # Application entry point
├── agents/
│   ├── baseAgent.ts     # Base agent class
│   └── contentWriterAgent.ts  # Content writer agent implementation
```

## Usage Example

```typescript
import { ContentWriterAgent } from "./agents/contentWriterAgent";

const agent = new ContentWriterAgent();
const content = await agent.write({
  topic: "Artificial Intelligence",
  style: "blog",
  length: "medium",
});
console.log(content);
```

## Extending

To create custom agents:

1. Extend the `BaseAgent` class
2. Implement your agent logic
3. Use the `invoke` method to communicate with the LangChain model

```typescript
import { BaseAgent, AgentConfig } from "./baseAgent";

export class CustomAgent extends BaseAgent {
  constructor() {
    const config: AgentConfig = {
      name: "Custom",
      systemPrompt: "Your system prompt here",
    };
    super(config);
  }

  async customMethod(): Promise<string> {
    // Your implementation
  }
}
```

## License

MIT
