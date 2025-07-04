import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000, // 30 seconds for Electron tests
    pool: 'forks', // Use forks instead of threads for Electron
    deps: {
      external: ['electron', 'electron-trpc']
    }
  },
  resolve: {
    conditions: ['node'],
  },
});