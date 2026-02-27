export const config = {
  model: "gpt-4o",
  writerTemperature: 0.7,
  evaluatorTemperature: 0,
  formatterTemperature: 0.2,
  passThreshold: 7.0,
  maxIterations: 3,
  continuationLength: "200-400 words",
} as const;

export type Config = typeof config;
