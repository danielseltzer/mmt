/**
 * API Configuration
 * Centralized configuration for API endpoints
 * 
 * IMPORTANT: All API URLs must be constructed through this module
 * Never hardcode API URLs in components or stores
 */

/**
 * Get API base URL from environment or configuration
 * @returns Base URL for API server
 */
function getApiBaseUrl(): string {
  // Check for environment variable first
  if (typeof import.meta.env.VITE_API_URL === 'string' && import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Check for API host and port from environment
  const apiHost = import.meta.env.VITE_API_HOST || 'localhost';
  const apiPort = import.meta.env.VITE_API_PORT || import.meta.env.MMT_API_PORT || '3001';
  const apiProtocol = import.meta.env.VITE_API_PROTOCOL || 'http';
  
  return `${apiProtocol}://${apiHost}:${apiPort}`;
}

// API base URL - constructed from environment configuration
export const API_BASE_URL = getApiBaseUrl();

/**
 * Construct full API URL
 * @param endpoint - The API endpoint (should start with /api)
 * @returns Full URL for the API endpoint
 */
export function getApiEndpoint(endpoint: string): string {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${normalizedEndpoint}`;
}

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
  // Vault endpoints
  vaults: () => getApiEndpoint('/api/vaults'),
  vaultDocuments: (vaultId: string) => getApiEndpoint(`/api/vaults/${encodeURIComponent(vaultId)}/documents`),
  vaultDocumentsSearch: (vaultId: string) => getApiEndpoint(`/api/vaults/${encodeURIComponent(vaultId)}/documents/search`),
  vaultStatus: (vaultId: string) => getApiEndpoint(`/api/vaults/${encodeURIComponent(vaultId)}/status`),
  
  // Similarity endpoints
  similaritySearch: (vaultId: string) => getApiEndpoint(`/api/vaults/${encodeURIComponent(vaultId)}/similarity/search`),
  similarDocuments: (vaultId: string) => getApiEndpoint(`/api/vaults/${encodeURIComponent(vaultId)}/similarity/similar`),
  similarityStatus: (vaultId: string) => getApiEndpoint(`/api/vaults/${encodeURIComponent(vaultId)}/similarity/status`),
  
  // Document endpoints
  documentPreview: (vaultId: string, path: string) => getApiEndpoint(`/api/vaults/${encodeURIComponent(vaultId)}/documents/${encodeURIComponent(path)}`)
};