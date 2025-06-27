import { api } from './client.js';

// Expose API to window for testing
declare global {
  interface Window {
    api: typeof api;
    __progressUpdates?: any[];
  }
}

// Make API available on window for tests
if (typeof window !== 'undefined') {
  window.api = api;
}

export { api };