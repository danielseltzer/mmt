import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useConfigStore } from '../src/stores/config-store';

describe('Config Store', () => {
  beforeEach(() => {
    // Reset the store state before each test
    useConfigStore.setState({
      config: null,
      isLoading: false,
      error: null
    });
    
    // Clear fetch mocks
    vi.clearAllMocks();
  });

  describe('fetchConfig', () => {
    it('should fetch configuration from /api/config endpoint', async () => {
      const mockConfig = {
        vaultPath: '/test/vault',
        apiPort: 3001
      };
      
      // Mock successful fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockConfig
      });
      
      const { fetchConfig } = useConfigStore.getState();
      await fetchConfig();
      
      const state = useConfigStore.getState();
      expect(state.config).toEqual(mockConfig);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe(null);
      
      expect(global.fetch).toHaveBeenCalledWith('/api/config');
    });
    
    it('should handle fetch errors gracefully', async () => {
      // Mock failed fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error'
      });
      
      const { fetchConfig } = useConfigStore.getState();
      await fetchConfig();
      
      const state = useConfigStore.getState();
      expect(state.config).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to fetch config: Internal Server Error');
    });
    
    it('should handle network errors', async () => {
      // Mock network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const { fetchConfig } = useConfigStore.getState();
      await fetchConfig();
      
      const state = useConfigStore.getState();
      expect(state.config).toBe(null);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Network error');
    });
  });
});