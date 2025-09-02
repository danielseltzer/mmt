import { describe, it, expect, beforeEach, afterAll, beforeAll } from 'vitest';
import { useConfigStore } from '../src/stores/config-store';
import http from 'node:http';

describe('Config Store', () => {
  let server;
  let serverPort;
  let serverResponse = null;
  let serverStatusCode = 200;
  let shouldThrowError = false;
  let originalFetch;

  // Create test server
  beforeAll(async () => {
    // Save original fetch
    originalFetch = global.fetch;

    server = http.createServer((req, res) => {
      // Add CORS headers to allow cross-origin requests
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      // Handle OPTIONS preflight requests
      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // Simulate network error by destroying the connection
      if (shouldThrowError) {
        req.socket.destroy();
        return;
      }

      // Handle /api/config endpoint
      if (req.url === '/api/config' && req.method === 'GET') {
        if (serverStatusCode !== 200) {
          res.statusMessage = 'Internal Server Error';
          res.writeHead(serverStatusCode, { 'Content-Type': 'application/json' });
          res.end();
        } else if (serverResponse) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(serverResponse));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('{}');
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    // Start server and get the port
    await new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        serverPort = address.port;
        console.log(`Test server listening on port ${serverPort}`);
        resolve();
      });
    });

    // Override fetch to use our test server
    global.fetch = async (url, options) => {
      // Convert relative URLs to absolute URLs pointing to our test server
      const testUrl = url.startsWith('/') 
        ? `http://127.0.0.1:${serverPort}${url}`
        : url;
      
      // Use the original fetch (from happy-dom environment)
      const response = await originalFetch(testUrl, options);
      return response;
    };
  });

  afterAll(async () => {
    // Restore original fetch
    global.fetch = originalFetch;
    
    // Close the server
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  beforeEach(() => {
    // Reset the store state before each test
    useConfigStore.setState({
      config: null,
      isLoading: false,
      error: null
    });
    
    // Reset server behavior
    serverResponse = null;
    serverStatusCode = 200;
    shouldThrowError = false;
  });

  describe('fetchConfig', () => {
    it('should fetch configuration from /api/config endpoint', async () => {
      const mockConfig = {
        vaultPath: '/test/vault',
        apiPort: 3001
      };
      
      // Configure server response
      serverResponse = mockConfig;
      serverStatusCode = 200;
      
      const { fetchConfig } = useConfigStore.getState();
      await fetchConfig();
      
      const state = useConfigStore.getState();
      expect(state.config).toEqual(mockConfig);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
    });
    
    it('should handle fetch errors gracefully', async () => {
      // Configure server to return 500 error
      serverStatusCode = 500;
      
      const { fetchConfig } = useConfigStore.getState();
      await fetchConfig();
      
      const state = useConfigStore.getState();
      expect(state.config).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to fetch config: Internal Server Error');
    });
    
    it('should handle network errors', async () => {
      // Configure server to simulate network error
      shouldThrowError = true;
      
      const { fetchConfig } = useConfigStore.getState();
      await fetchConfig();
      
      const state = useConfigStore.getState();
      expect(state.config).toBe(null);
      expect(state.isLoading).toBe(false);
      // The error message should contain information about the error
      expect(state.error).toBeTruthy();
      expect(typeof state.error).toBe('string');
      // Check that it's a network-related error (exact message may vary)
      expect(state.error.toLowerCase()).toMatch(/socket|network|connection|econnreset/);
    });
  });
});