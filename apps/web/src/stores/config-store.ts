/**
 * Configuration Store
 * Manages server configuration fetched from /api/config
 * 
 * This replaces environment variable usage for configuration.
 * All configuration comes from the server via YAML files.
 */

import { create } from 'zustand';
import { getApiEndpoint } from '../config/api';
import { API_ROUTES } from '@mmt/entities';

interface ServerConfig {
  vaultPath?: string;
  apiPort?: number;
  // Add other configuration fields as needed from server /api/config
  [key: string]: any;
}

interface ConfigStore {
  config: ServerConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigStore>((set) => ({
  config: null,
  isLoading: false,
  error: null,
  
  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(getApiEndpoint(API_ROUTES.config()));
      
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }
      
      const config = await response.json();
      set({ config, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      set({ 
        error: errorMessage, 
        isLoading: false,
        config: null 
      });
      console.error('Failed to fetch server configuration:', error);
    }
  }
}));

/**
 * Hook to ensure configuration is loaded
 * Call this at app initialization
 */
export async function initializeConfig(): Promise<void> {
  const { fetchConfig } = useConfigStore.getState();
  await fetchConfig();
}

/**
 * Get current configuration synchronously
 * Returns null if not yet loaded
 */
export function getConfig(): ServerConfig | null {
  return useConfigStore.getState().config;
}