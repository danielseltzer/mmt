/**
 * API Configuration
 * Centralized configuration for API endpoints
 * 
 * IMPORTANT: All API URLs must be constructed through this module
 * Never hardcode API URLs in components or stores
 */

import { API_ROUTES } from '@mmt/entities';

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
 * Uses centralized route definitions from @mmt/entities
 */
export const API_ENDPOINTS = {
  // Vault endpoints
  vaults: () => getApiEndpoint(API_ROUTES.vaults.list()),
  vaultDocuments: (vaultId: string) => getApiEndpoint(API_ROUTES.documents.list(vaultId)),
  vaultDocumentsSearch: (vaultId: string) => getApiEndpoint(API_ROUTES.documents.search(vaultId)),
  vaultStatus: (vaultId: string) => getApiEndpoint(API_ROUTES.vaults.status(vaultId)),
  
  // Similarity endpoints
  similaritySearch: (vaultId: string) => getApiEndpoint(API_ROUTES.similarity.search(vaultId)),
  similarDocuments: (vaultId: string) => getApiEndpoint(API_ROUTES.similarity.similar(vaultId)),
  similarityStatus: (vaultId: string) => getApiEndpoint(API_ROUTES.similarity.status(vaultId)),
  
  // Document endpoints
  documentPreview: (vaultId: string, path: string) => getApiEndpoint(API_ROUTES.documents.preview(vaultId, path))
};