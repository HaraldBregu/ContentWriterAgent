export const config = {
  model: 'gpt-4o',
  writerTemperature: 0.7,
  continuationLength: '200-400 words',
} as const;

export type Config = typeof config;
