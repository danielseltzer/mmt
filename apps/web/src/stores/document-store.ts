import { create } from 'zustand';

// Local type definitions to avoid importing from @mmt/entities
interface Document {
  path: string;
  metadata: {
    name: string;
    modified: string;
    size: number;
    frontmatter?: Record<string, any>;
    tags?: string[];
    links?: string[];
    backlinks?: string[];
  };
}

interface FilterCondition {
  field: string;
  operator: string;
  value: any;
  key?: string;
  caseSensitive?: boolean;
}

interface FilterCollection {
  conditions: FilterCondition[];
  logic: 'AND' | 'OR';
}

interface Vault {
  id: string;
  name: string;
  status: 'ready' | 'initializing' | 'error';
  error?: string;
}

/**
 * Document Store - Manages document fetching with server-side filtering
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
 * 
 * Example Usage:
 * setFilters({
 *   conditions: [
 *     { field: 'modified', operator: 'gt', value: '2024-01-01' },
 *     { field: 'size', operator: 'lt', value: 100000 },
 *     { field: 'tags', operator: 'contains', value: ['important'] }
 *   ],
 *   logic: 'AND'
 * });
 * fetchDocuments();
 */
interface DocumentStoreState {
  // State
  documents: Document[];
  filteredDocuments: Document[];
  totalCount: number; // Total number of documents matching the current filters
  vaultTotal: number; // Total number of documents in the vault (unfiltered)
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: FilterCollection;
  sortBy?: string;
  sortOrder: 'asc' | 'desc';
  
  // Vault state
  vaults: Vault[];
  currentVaultId: string | null;
  isLoadingVaults: boolean;
  
  // Actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: FilterCollection) => void;
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  fetchDocuments: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
  
  // Vault actions
  loadVaults: () => Promise<void>;
  setCurrentVault: (vaultId: string) => void;
}

// No longer needed - filtering happens on the server

// Local storage key for persisting vault selection
const VAULT_STORAGE_KEY = 'mmt-selected-vault';

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  // State
  documents: [],
  filteredDocuments: [],
  totalCount: 0,
  vaultTotal: 0,
  loading: false,
  error: null,
  searchQuery: '',
  filters: { conditions: [], logic: 'AND' },
  sortBy: undefined,
  sortOrder: 'asc',
  
  // Vault state
  vaults: [],
  currentVaultId: localStorage.getItem(VAULT_STORAGE_KEY),
  isLoadingVaults: false,
  
  // Actions
  setSearchQuery: (query: string) => set({ searchQuery: query }),
  
  setFilters: (filters: FilterCollection) => {
    set({ filters });
    // Trigger a new fetch with the updated filters
    get().fetchDocuments();
  },
  
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => {
    set({ sortBy, sortOrder });
    // Trigger a new fetch with the updated sort
    get().fetchDocuments();
  },
  
  fetchDocuments: async () => {
    const currentVaultId = get().currentVaultId;
    if (!currentVaultId) {
      // No vault selected, can't fetch documents
      return;
    }
    
    set({ loading: true, error: null });
    
    try {
      const query = get().searchQuery;
      const filters = get().filters;
      const sortBy = get().sortBy;
      const sortOrder = get().sortOrder;
      // Limit to 500 for performance
      const limit = 500;
      
      // Build URL with query parameters
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      params.append('limit', limit.toString());
      params.append('offset', '0');
      
      // Add sort parameters
      if (sortBy) {
        params.append('sortBy', sortBy);
        params.append('sortOrder', sortOrder);
      }
      
      // Add filters as JSON if present
      if (filters && filters.conditions.length > 0) {
        params.append('filters', JSON.stringify(filters));
      }
      
      // Use vault-aware endpoint
      const url = `/api/vaults/${currentVaultId}/documents?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Server already filtered the documents
      set({ 
        documents: data.documents, 
        filteredDocuments: data.documents, 
        totalCount: data.total,
        vaultTotal: data.vaultTotal,
        loading: false 
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unknown error', loading: false });
    }
  },
  
  clearError: () => set({ error: null }),
  
  reset: () => set({
    documents: [],
    filteredDocuments: [],
    totalCount: 0,
    vaultTotal: 0,
    loading: false,
    error: null,
    searchQuery: '',
    filters: { conditions: [], logic: 'AND' },
    sortBy: undefined,
    sortOrder: 'asc'
  }),
  
  // Vault actions
  loadVaults: async () => {
    set({ isLoadingVaults: true });
    
    try {
      const response = await fetch('/api/vaults');
      if (!response.ok) {
        throw new Error(`Failed to load vaults: ${response.status}`);
      }
      
      const data = await response.json();
      const vaults = data.vaults || [];
      
      set({ vaults, isLoadingVaults: false });
      
      // If no current vault is selected, select the first available one
      const currentVaultId = get().currentVaultId;
      if (!currentVaultId && vaults.length > 0) {
        const firstReadyVault = vaults.find((v: Vault) => v.status === 'ready') || vaults[0];
        get().setCurrentVault(firstReadyVault.id);
      }
    } catch (error) {
      console.error('Failed to load vaults:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load vaults',
        isLoadingVaults: false 
      });
    }
  },
  
  setCurrentVault: (vaultId: string) => {
    // Save to localStorage
    localStorage.setItem(VAULT_STORAGE_KEY, vaultId);
    
    // Update state and clear documents
    set({ 
      currentVaultId: vaultId,
      documents: [],
      filteredDocuments: [],
      totalCount: 0,
      vaultTotal: 0,
      searchQuery: '',
      filters: { conditions: [], logic: 'AND' }
    });
    
    // Fetch documents for the new vault
    get().fetchDocuments();
  }
}));