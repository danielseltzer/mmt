/**
 * Document Operations - Handles document fetching and filtering
 * Extracted from document-store.ts to improve maintainability
 */

import type { Document, FilterCollection } from './types.js';

export interface DocumentFetchParams {
  vaultId: string;
  searchQuery?: string;
  filters?: FilterCollection;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface DocumentFetchResult {
  documents: Document[];
  total: number;
  vaultTotal: number;
}

/**
 * Fetch documents from the API with filters and sorting
 */
export async function fetchDocuments(params: DocumentFetchParams): Promise<DocumentFetchResult> {
  const {
    vaultId,
    searchQuery,
    filters,
    sortBy,
    sortOrder = 'asc',
    limit = 500,
    offset = 0
  } = params;
  
  // Build URL with query parameters
  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.append('q', searchQuery);
  queryParams.append('limit', limit.toString());
  queryParams.append('offset', offset.toString());
  
  // Add sort parameters
  if (sortBy) {
    queryParams.append('sortBy', sortBy);
    queryParams.append('sortOrder', sortOrder);
  }
  
  // Add filters as JSON if present
  if (filters && filters.conditions.length > 0) {
    queryParams.append('filters', JSON.stringify(filters));
  }
  
  // Use vault-aware endpoint with properly encoded vault ID
  const url = `/api/vaults/${encodeURIComponent(vaultId)}/documents?${queryParams.toString()}`;
  console.log('[fetchDocuments] Fetching from URL:', url);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[fetchDocuments] API error:', errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  console.log('[fetchDocuments] Received data:', { 
    documents: data.documents?.length || 0, 
    total: data.total,
    vaultTotal: data.vaultTotal 
  });
  
  return {
    documents: data.documents || [],
    total: data.total || 0,
    vaultTotal: data.vaultTotal || 0
  };
}