/**
 * Document Store Interface - Type definitions for the document store
 * Extracted from document-store.ts to improve maintainability
 */

import type { 
  TabState, 
  Vault, 
  VaultIndexStatus, 
  FilterCollection 
} from './types.js';

/**
 * Document Store - Manages multiple tabs with per-tab document state
 * 
 * The store supports natural language filtering via the API:
 * 
 * Natural Language Date Expressions:
 * - "last 30 days", "past 7 days" - Documents modified in the last N days
 * - "yesterday", "today" - Documents modified on specific days
 * - "this week", "this month", "this year" - Current period documents
 * - "since 2024", "since January" - Documents since a specific time
 * - "before 2025", "until December" - Documents before a specific time
 * - "-30d" - Shorthand for last 30 days
 * 
 * Natural Language Size Expressions:
 * - "over 1mb", "greater than 100k" - Files larger than specified size
 * - "under 10k", "less than 5mb" - Files smaller than specified size
 * - "at least 1gb", "at most 500k" - Inclusive size boundaries
 * - Size units: b/bytes, k/kb, m/mb, g/gb
 */
export interface DocumentStoreState {
  // Tab management
  tabs: TabState[];
  activeTabId: string | null;
  
  // Vault state (shared across tabs)
  vaults: Vault[];
  isLoadingVaults: boolean;
  isLoadingDocuments: boolean;
  similarityAvailable: boolean;
  
  // Tab management actions
  createTab: (vaultId: string) => void;
  switchTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  getCurrentTab: () => TabState | null;
  updateTabName: (tabId: string, name: string) => void;
  
  // Per-tab actions (operate on active tab)
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterCollection) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  fetchDocuments: () => void;
  clearError: () => void;
  reset: () => void;
  
  // Similarity search actions (operate on active tab)
  setSearchMode: (mode: 'text' | 'similarity') => void;
  performSimilaritySearch: (query: string) => Promise<void>;
  findSimilarDocuments: (documentPath: string) => Promise<void>;
  
  // Vault actions
  loadVaults: () => Promise<void>;
  updateVaultStatus: (vaultId: string, status: VaultIndexStatus) => void;
  getVaultStatus: (vaultId: string) => VaultIndexStatus | undefined;
}