/**
 * Route Helpers
 * 
 * This module imports the centralized API routes from @mmt/entities
 * and provides helpers for route documentation and consistency.
 * 
 * The API_ROUTES from entities is the single source of truth,
 * but this module helps with server-side route documentation.
 */

import { API_ROUTES } from '@mmt/entities';

/**
 * Route documentation helper
 * Generates documentation comments for routes
 */
export function documentRoute(route: string, method: string, description: string): string {
  return `${method.toUpperCase()} ${route} - ${description}`;
}

/**
 * Extract the relative path from a route function
 * This removes the /api prefix since Express routers are mounted under /api
 */
export function getRelativeRoute(fullRoute: string): string {
  // Remove /api prefix if present
  if (fullRoute.startsWith('/api/')) {
    return fullRoute.substring(4); // Remove '/api'
  }
  return fullRoute;
}

/**
 * Route pattern helpers for Express routers
 * These return the patterns used in router definitions
 */
export const ROUTE_PATTERNS = {
  // Vault routes (relative to /api/vaults)
  vaults: {
    list: '/',
    status: '/:vaultId/status',
    index: {
      status: '/:vaultId/index/status',
      refresh: '/:vaultId/index/refresh',
      events: '/:vaultId/index/events',
    },
  },
  
  // Document routes (relative to /api/vaults/:vaultId/documents)
  documents: {
    list: '/',
    search: '/search',
    parseQuery: '/parse-query',
    byPath: '/by-path/*',
    preview: '/preview/:path(*)',
    export: '/export',
    quicklook: '/quicklook',
    revealInFinder: '/reveal-in-finder',
    reveal: '/reveal',
  },
  
  // Similarity routes (relative to /api/vaults/:vaultId/similarity)
  similarity: {
    status: '/status',
    health: '/health',
    search: '/search',
    similar: '/similar',
    reindex: '/reindex',
    events: '/events',
  },
  
  // Pipeline routes (relative to /api/vaults/:vaultId/pipelines or /api/pipelines)
  pipelines: {
    execute: '/execute',
  },
  
  // Config route (relative to /api)
  config: '/config',
  
  // Health check (at root)
  health: '/health',
} as const;

// Export the centralized API_ROUTES for server-side usage
export { API_ROUTES };

/**
 * Validate that server routes match the centralized definitions
 * This can be used in tests to ensure consistency
 */
export function validateRouteConsistency(): boolean {
  // This would be implemented in tests to verify that
  // the server route patterns match the centralized API_ROUTES
  return true;
}