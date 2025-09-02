/**
 * Shared type definitions for document store
 * Extracted from document-store.ts for reusability
 */

// Local type definitions to avoid importing from @mmt/entities
export interface Document {
  path: string;
  fullPath?: string; // Full path for unique identification
  metadata: {
    name: string;
    modified: string;
    size: number;
    frontmatter?: Record<string, unknown>;
    tags?: string[];
    links?: string[];
    backlinks?: string[];
  };
  similarityScore?: number; // Score from similarity search (0-1)
}

export interface FilterCondition {
  field: string;
  operator: string;
  value: string | string[] | number | Date | boolean | { min: number | Date; max: number | Date };
  key?: string;
  caseSensitive?: boolean;
}

export interface FilterCollection {
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

export interface Vault {
  id: string;
  name: string;
  status: 'ready' | 'initializing' | 'error';
  error?: string;
}

/**
 * Tab State - Individual state for each open vault/document set tab
 */
export interface TabState {
  tabId: string;
  vaultId: string;
  tabName: string;
  documents: Document[];
  filteredDocuments: Document[];
  totalCount: number;
  vaultTotal: number;
  searchQuery: string;
  filters: FilterCollection;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  searchMode: 'text' | 'similarity';
  similarityResults: Document[];
  loading: boolean;
  loadingSimilarity: boolean;
  error: string | null;
}

// Vault index status interface
export interface VaultIndexStatus {
  status: 'ready' | 'indexing' | 'not_indexed' | 'error' | 'initializing';
  documentCount: number;
  totalDocuments?: number;
  lastIndexed?: string;
  indexProgress?: number;
  error?: string;
  similarityStatus?: {
    available: boolean;
    status: string;
    ollamaConnected?: boolean;
  };
}