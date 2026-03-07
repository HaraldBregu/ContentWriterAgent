import { defineConfig } from 'vitest/config';

const alias = { '@': new URL('./src', import.meta.url).pathname };

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    },
  },
  resolve: { alias },
});

export const integration = defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
  },
  resolve: { alias },
});

export const e2e = defineConfig({
  test: {
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 120_000,
  },
  resolve: { alias },
});
