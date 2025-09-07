/**
 * Document Operations - Handles document fetching and filtering
 * Extracted from document-store.ts to improve maintainability
 */

import type { Document, FilterCollection } from './types.js';
import { API_ENDPOINTS } from '../config/api.js';

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
  
  // Use centralized API endpoint configuration
  const baseUrl = API_ENDPOINTS.vaultDocuments(vaultId);
  const url = `${baseUrl}?${queryParams.toString()}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      documents: data.documents || [],
      total: data.total || 0,
      vaultTotal: data.vaultTotal || 0
    };
  } catch (error) {
    console.error('[document-operations] Error fetching documents:', error);
    throw error;
  }
}