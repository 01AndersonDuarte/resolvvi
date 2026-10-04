import { defineConfig } from 'vitest/config';

const MINIMUM_COVERAGE = 80;

export default defineConfig({
  test: {
    fileParallelism: false,
    coverage: {
      exclude: ['src/**/*.test.ts', 'src/generated/**', 'src/protocols.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        branches: MINIMUM_COVERAGE,
        functions: MINIMUM_COVERAGE,
        lines: MINIMUM_COVERAGE,
        statements: MINIMUM_COVERAGE,
      },
    },
    include: ['src/**/*.test.ts'],
    mockReset: true,
    restoreMocks: true,
  },
});
