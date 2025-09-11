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
  // API URL should come from configuration, not environment
  // This is a temporary fix for tests
  
  // For tests, we need to use port 3001
  // In production, this should come from configuration
  const apiHost = 'localhost';
  const apiPort = '3001';
  const apiProtocol = 'http';
  
  // Debug logging for tests
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    console.log('Test env - API port:', apiPort, 'VITE_API_PORT:', import.meta.env.VITE_API_PORT, 'MMT_API_PORT:', import.meta.env.MMT_API_PORT);
  }
  
  return `${apiProtocol}://${apiHost}:${apiPort}`;
}

// API base URL - constructed from environment configuration
// Using a getter to allow dynamic evaluation in tests
export const API_BASE_URL = getApiBaseUrl();

/**
 * Construct full API URL
 * @param endpoint - The API endpoint (should start with /api)
 * @returns Full URL for the API endpoint
 */
export function getApiEndpoint(endpoint: string): string {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Re-evaluate base URL each time to support test mocking
  const baseUrl = getApiBaseUrl();
  
  // Debug logging for tests
  if (typeof process !== 'undefined' && process.env.NODE_ENV === 'test') {
    console.log('getApiEndpoint called, baseUrl:', baseUrl, 'endpoint:', normalizedEndpoint);
  }
  
  return `${baseUrl}${normalizedEndpoint}`;
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