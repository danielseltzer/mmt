import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/tests/setup.ts'],
    include: [
      'tests/date-parsing.test.js',
      'tests/table-rendering.test.tsx',
      'tests/filter-conversion.test.js',
      'tests/api-config.test.js',
      'tests/config-store.test.js',
      'tests/tab-bar.test.tsx',
      'tests/format-utils.test.ts',
      'tests/stores/similarity-search-store.test.ts',
      'tests/document-table-initial-sort.test.tsx',
      'tests/document-count-display.test.tsx'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/integration/**',
    ],
  },
})