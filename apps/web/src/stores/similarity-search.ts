/**
 * Similarity Search Manager - Handles all similarity search operations
 * Extracted from document-store.ts to improve maintainability
 */

import type { Document, TabState } from './types.js';
import { API_ENDPOINTS } from '../config/api.js';

export interface SimilaritySearchResult {
  path: string;
  score: number;
}

/**
 * Perform a similarity search for a given query
 */
export async function performSimilaritySearch(
  vaultId: string,
  query: string,
  limit: number = 20
): Promise<Document[]> {
  const response = await fetch(API_ENDPOINTS.similaritySearch(vaultId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      query,
      limit 
    }),
  });
  
  if (!response.ok) {
    if (response.status === 501) {
      throw new Error('Similarity search is not configured. Add a similarity provider (e.g., Qdrant) to your configuration.');
    }
    throw new Error(`Similarity search failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Transform results to include similarity scores
  return data.results.map((result: SimilaritySearchResult) => ({
    path: result.path,
    fullPath: result.path,
    metadata: {
      name: result.path.split('/').pop() || result.path,
      modified: '',
      size: 0,
    },
    similarityScore: result.score,
  }));
}

/**
 * Find documents similar to a given document
 */
export async function findSimilarDocuments(
  vaultId: string,
  documentPath: string,
  limit: number = 10
): Promise<Document[]> {
  const response = await fetch(API_ENDPOINTS.similaritySearch(vaultId), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      documentPath,
      limit 
    }),
  });
  
  if (!response.ok) {
    if (response.status === 501) {
      throw new Error('Similarity search is not configured. Add a similarity provider (e.g., Qdrant) to your configuration.');
    }
    throw new Error(`Find similar failed: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Transform results to include similarity scores
  return data.results.map((result: SimilaritySearchResult) => ({
    path: result.path,
    fullPath: result.path,
    metadata: {
      name: result.path.split('/').pop() || result.path,
      modified: '',
      size: 0,
    },
    similarityScore: result.score,
  }));
}

/**
 * Check if similarity search is available for a vault
 */
export async function checkSimilarityAvailable(vaultId: string): Promise<boolean> {
  try {
    const response = await fetch(API_ENDPOINTS.similarityStatus(vaultId));
    // 501 means not configured, which is fine - not an error
    return response.ok && response.status !== 501;
  } catch {
    // Network error or other issue - assume not available
    return false;
  }
}