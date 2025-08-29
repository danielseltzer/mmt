/**
 * Document API - Handles document fetching and search operations
 * Extracted from document-store.ts to improve maintainability
 */

import type { Document, Vault } from './types.js';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

interface DocumentResponse {
  documents: Document[];
  total: number;
  vaultTotal: number;
}

interface SearchRequest {
  filters?: FilterCollection;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch documents from a vault
 */
export async function fetchVaultDocuments(
  vaultId: string,
  request: SearchRequest = {}
): Promise<DocumentResponse> {
  try {
    const response = await fetch(`http://localhost:3001/api/vaults/${encodeURIComponent(vaultId)}/documents/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch documents: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add fullPath to each document for unique identification
    const documents = data.documents.map((doc: Document) => ({
      ...doc,
      fullPath: `${vaultId}:${doc.path}`
    }));

    return {
      documents,
      total: data.total || documents.length,
      vaultTotal: data.vaultTotal || documents.length
    };
  } catch (error) {
    logger.error('Error fetching documents:', error);
    throw error;
  }
}

/**
 * Perform similarity search
 */
export async function performSimilaritySearch(
  vaultId: string,
  query: string,
  limit: number = 20
): Promise<Document[]> {
  try {
    const response = await fetch(`http://localhost:3001/api/vaults/${encodeURIComponent(vaultId)}/similarity/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Similarity search not available');
      }
      throw new Error(`Similarity search failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add fullPath and ensure similarity scores
    return data.documents.map((doc: Document) => ({
      ...doc,
      fullPath: `${vaultId}:${doc.path}`,
      similarityScore: doc.similarityScore || 0
    }));
  } catch (error) {
    logger.error('Error performing similarity search:', error);
    throw error;
  }
}

/**
 * Find similar documents to a given document
 */
export async function findSimilarDocuments(
  vaultId: string,
  documentPath: string,
  limit: number = 10
): Promise<Document[]> {
  try {
    const response = await fetch(`http://localhost:3001/api/vaults/${encodeURIComponent(vaultId)}/similarity/similar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentPath, limit })
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Similar documents feature not available');
      }
      throw new Error(`Finding similar documents failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add fullPath and ensure similarity scores
    return data.documents.map((doc: Document) => ({
      ...doc,
      fullPath: `${vaultId}:${doc.path}`,
      similarityScore: doc.similarityScore || 0
    }));
  } catch (error) {
    logger.error('Error finding similar documents:', error);
    throw error;
  }
}

/**
 * Check if similarity search is available for a vault
 */
export async function checkSimilarityAvailable(vaultId: string): Promise<boolean> {
  try {
    const response = await fetch(`http://localhost:3001/api/vaults/${encodeURIComponent(vaultId)}/similarity/status`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.available === true;
  } catch (error) {
    logger.error('Error checking similarity status:', error);
    return false;
  }
}

/**
 * Load available vaults
 */
export async function loadVaults(): Promise<Vault[]> {
  try {
    const response = await fetch('http://localhost:3001/api/vaults');
    if (!response.ok) {
      throw new Error(`Failed to load vaults: ${response.statusText}`);
    }
    const vaults = await response.json();
    return vaults;
  } catch (error) {
    logger.error('Error loading vaults:', error);
    throw error;
  }
}