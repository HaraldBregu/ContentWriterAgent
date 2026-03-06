import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';

export function createUnderstandingModel() {
  return new ChatOpenAI({ model: 'gpt-4o', temperature: 0 });
}

export function createWriterModel() {
  return new ChatAnthropic({
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 4096,
  });
}

export function createReviewerModel() {
  return new ChatOpenAI({ model: 'gpt-4o', temperature: 0.1 });
}
