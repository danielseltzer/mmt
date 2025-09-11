import '@testing-library/jest-dom'

// Mock import.meta.env for tests
globalThis.import = {
  meta: {
    env: {
      VITE_API_PORT: '3001',
      MMT_API_PORT: '3001',
    }
  }
}