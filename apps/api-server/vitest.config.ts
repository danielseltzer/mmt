import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['tests/integration/**'],
    // Allow empty test suites - API server has integration tests only by design
    passWithNoTests: true
  }
});