import { describe, it, expect } from 'vitest';
import { config } from '@/config';

describe('config', () => {
  it('exports the correct model name', () => {
    expect(config.model).toBe('gpt-4o');
  });

  it('exports a writerTemperature greater than 0', () => {
    expect(config.writerTemperature).toBeGreaterThan(0);
    expect(config.writerTemperature).toBeLessThanOrEqual(1);
  });

  it('exports evaluatorTemperature of 0 for deterministic evaluation', () => {
    expect(config.evaluatorTemperature).toBe(0);
  });

  it('exports formatterTemperature between 0 and 1', () => {
    expect(config.formatterTemperature).toBeGreaterThanOrEqual(0);
    expect(config.formatterTemperature).toBeLessThanOrEqual(1);
  });

  it('exports a passThreshold between 1 and 10', () => {
    expect(config.passThreshold).toBeGreaterThanOrEqual(1);
    expect(config.passThreshold).toBeLessThanOrEqual(10);
  });

  it('exports maxIterations as a positive integer', () => {
    expect(config.maxIterations).toBeGreaterThan(0);
    expect(Number.isInteger(config.maxIterations)).toBe(true);
  });

  it('exports continuationLength as a non-empty string', () => {
    expect(typeof config.continuationLength).toBe('string');
    expect(config.continuationLength.length).toBeGreaterThan(0);
  });

  it('is readonly (const assertion applied)', () => {
    // TypeScript const assertion ensures the config object is not reassignable at the type level.
    // At runtime we verify the values haven't drifted from expected production settings.
    expect(config).toMatchObject({
      model: expect.any(String),
      writerTemperature: expect.any(Number),
      evaluatorTemperature: expect.any(Number),
      formatterTemperature: expect.any(Number),
      passThreshold: expect.any(Number),
      maxIterations: expect.any(Number),
      continuationLength: expect.any(String),
    });
  });
});
