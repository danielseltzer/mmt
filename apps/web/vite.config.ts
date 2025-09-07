import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    strictPort: true, // Fail if port is already in use - no defaults allowed
    // Proxy removed - using direct API calls with CORS instead
    // API base URL is configured in src/config/api.ts
  }
})