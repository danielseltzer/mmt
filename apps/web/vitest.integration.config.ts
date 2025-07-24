import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    globalSetup: './tests/setup-integration-global.ts',
    setupFiles: ['./tests/setup-integration.ts'],
    include: ['tests/integration/**/*.test.*'],
    testTimeout: 30000, // 30 seconds for integration tests
    // Run tests sequentially to avoid state conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    }
  },
});