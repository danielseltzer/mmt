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
        target: `http://localhost:${process.env.MMT_API_PORT || '3001'}`,
        changeOrigin: true,
      }
    }
  }
})