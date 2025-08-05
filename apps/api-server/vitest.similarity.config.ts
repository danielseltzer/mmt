import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/similarity-*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    // No setupFiles - these tests don't need the API server
  }
});