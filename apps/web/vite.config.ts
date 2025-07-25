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
    proxy: {
      '/api': {
        target: (() => {
          const apiPort = process.env.MMT_API_PORT;
          if (!apiPort) {
            throw new Error('MMT_API_PORT environment variable is required but not set');
          }
          return `http://localhost:${apiPort}`;
        })(),
        changeOrigin: true,
      }
    }
  }
})