/**
 * API Configuration
 * Centralized configuration for API endpoints
 * 
 * IMPORTANT: Configuration comes from server
 * In development, Vite proxy handles /api routes
 * In production, the app fetches configuration from the server
 */

// In development, use relative URLs to leverage Vite's proxy
// In production, the API URL should be fetched from server configuration
export const API_BASE_URL = '';

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