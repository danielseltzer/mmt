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
      'tests/table-rendering.test.jsx'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'tests/integration/**',
    ],
  },
})