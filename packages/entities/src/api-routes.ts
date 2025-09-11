/**
 * Centralized API Routes Management
 * 
 * This module provides a single source of truth for all API routes in the MMT application.
 * All API URLs must be constructed through this module to prevent typos and ensure consistency.
 * 
 * Features:
 * - Type-safe route construction
 * - Automatic URL encoding for parameters
 * - Support for both client and server usage
 * - Consistent route patterns across the application
 */

/**
 * API route builder functions
 * All functions return relative paths that should be prefixed with the API base URL
 */
export const API_ROUTES = {
  // Health check
  health: () => '/health',
  
  // Configuration
  config: () => '/api/config',
  
  // Vault management routes
  vaults: {
    list: () => '/api/vaults',
    status: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/status`,
    
    // Index management
    index: {
      status: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/index/status`,
      refresh: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/index/refresh`,
      events: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/index/events`,
    },
  },
  
  // Document routes
  documents: {
    // Vault-specific document operations
    list: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents`,
    search: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/search`,
    parseQuery: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/parse-query`,
    byPath: (vaultId: string, path: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/by-path/${encodeURIComponent(path)}`,
    preview: (vaultId: string, path: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/preview/${encodeURIComponent(path)}`,
    export: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/export`,
    quicklook: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/quicklook`,
    revealInFinder: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/reveal-in-finder`,
    reveal: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/documents/reveal`,
  },
  
  // Similarity search routes
  similarity: {
    status: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/similarity/status`,
    health: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/similarity/health`,
    search: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/similarity/search`,
    similar: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/similarity/similar`,
    reindex: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/similarity/reindex`,
    events: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/similarity/events`,
  },
  
  // Pipeline routes
  pipelines: {
    execute: () => '/api/pipelines/execute',
    executeForVault: (vaultId: string) => `/api/vaults/${encodeURIComponent(vaultId)}/pipelines/execute`,
  },
  
  // File operations
  files: {
    reveal: () => '/api/files/reveal',
    quicklook: () => '/api/files/quicklook',
  },
} as const;

/**
 * Type definitions for route parameters
 */
export interface RouteParams {
  vaultId?: string;
  path?: string;
  documentPath?: string;
}

/**
 * Helper function to build query string from parameters
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const queryParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      queryParams.append(key, String(value));
    }
  });
  
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Helper to construct full URL with query parameters
 */
export function buildApiRouteWithQuery(
  route: string,
  queryParams?: Record<string, string | number | boolean | undefined>
): string {
  if (!queryParams) {
    return route;
  }
  
  return `${route}${buildQueryString(queryParams)}`;
}

/**
 * Type-safe route parameter validation
 */
export function validateRouteParams(params: RouteParams): void {
  if (params.vaultId !== undefined && typeof params.vaultId !== 'string') {
    throw new Error(`Invalid vaultId parameter: expected string, got ${typeof params.vaultId}`);
  }
  
  if (params.path !== undefined && typeof params.path !== 'string') {
    throw new Error(`Invalid path parameter: expected string, got ${typeof params.path}`);
  }
  
  if (params.documentPath !== undefined && typeof params.documentPath !== 'string') {
    throw new Error(`Invalid documentPath parameter: expected string, got ${typeof params.documentPath}`);
  }
}

/**
 * Export type for the API_ROUTES structure for type safety
 */
export type ApiRoutes = typeof API_ROUTES;

/**
 * Export individual route types for convenience
 */
export type VaultRoutes = typeof API_ROUTES.vaults;
export type DocumentRoutes = typeof API_ROUTES.documents;
export type SimilarityRoutes = typeof API_ROUTES.similarity;
export type PipelineRoutes = typeof API_ROUTES.pipelines;
export type FileRoutes = typeof API_ROUTES.files;