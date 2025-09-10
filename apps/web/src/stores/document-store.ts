/**
 * Document Store V2 - Simplified replacement for the complex original
 * 
 * Key improvements:
 * - Single store instead of multiple stores
 * - Direct API calls without complex abstraction layers
 * - Proper React StrictMode handling
 * - Clear error handling
 * - Maintains tab functionality but simplified
 */

import { create } from 'zustand';
import type { FilterCollection } from './types';
import { applyFilters } from './filter-manager';
import { useConfigStore } from './config-store';

// Types (simplified from original)
interface Vault {
  id: string;
  name: string;
  status: string;
}

interface Document {
  path: string;
  fullPath: string;
  metadata: {
    name: string;
    modified: string;
    size: number;
    frontmatter?: any;
    tags?: string[];
    links?: any[];
  };
}

interface Tab {
  id: string;
  vaultId: string;
  name: string;
  documents: Document[];
  filteredDocuments?: Document[];
  searchQuery: string;
  searchMode: 'text' | 'similarity';
  filters?: FilterCollection;
  loading: boolean;
  error: string | null;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  vaultTotal?: number; // Total document count from API (not limited by pagination)
  totalCount?: number;
}

interface DocumentStore {
  // State
  vaults: Vault[];
  tabs: Tab[];
  activeTabId: string | null;
  loadingVaults: boolean;
  error: string | null;
  
  // Actions
  loadVaults: () => Promise<void>;
  createTab: (vaultId: string) => void;
  switchTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  loadDocuments: (tabId: string) => Promise<void>;
  updateSearch: (tabId: string, query: string) => void;
  setSearchMode: (tabId: string, mode: 'text' | 'similarity') => void;
  performSimilaritySearch: (tabId: string, query: string) => Promise<void>;
  setFilters: (filters: FilterCollection) => void;
  clearError: () => void;
  
  // Getters
  getActiveTab: () => Tab | null;
}

// API functions
const getApiBase = () => {
  // Get from config store or derive from location
  const config = useConfigStore.getState().config;
  if (config?.apiUrl) {
    return config.apiUrl;
  }
  // Fallback to deriving from window location
  return window.location.origin;
};

async function fetchVaults(): Promise<Vault[]> {
  const response = await fetch(`${getApiBase()}/api/vaults`);
  if (!response.ok) {
    throw new Error(`Failed to fetch vaults: ${response.statusText}`);
  }
  const data = await response.json();
  return data.vaults || [];
}

async function fetchDocuments(
  vaultId: string, 
  searchQuery?: string,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc'
): Promise<{ documents: Document[]; total: number }> {
  const params = new URLSearchParams();
  params.append('limit', '500'); // TODO: Implement proper pagination
  params.append('offset', '0');
  if (searchQuery) {
    params.append('q', searchQuery);
  }
  // Add sorting parameters for API to handle full dataset sorting
  if (sortBy) {
    params.append('sortBy', sortBy);
    params.append('sortOrder', sortOrder || 'desc');
  }

  const url = `${getApiBase()}/api/vaults/${encodeURIComponent(vaultId)}/documents?${params}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch documents: ${response.statusText}`);
  }
  const data = await response.json();
  return {
    documents: data.documents || [],
    total: data.total || 0
  };
}

async function performSimilaritySearch(vaultId: string, query: string): Promise<Document[]> {
  const url = `${getApiBase()}/api/vaults/${encodeURIComponent(vaultId)}/similarity/search`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit: 500 })
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Similarity search not available for this vault');
    }
    if (response.status === 501) {
      throw new Error('Similarity search is not configured for this vault');
    }
    throw new Error(`Similarity search failed: ${response.statusText}`);
  }

  const data = await response.json();
  // The API returns 'results' for similarity search, not 'documents'
  // Results include similarity scores which we should preserve
  const results = data.results || [];
  
  // Transform results to match Document interface if needed
  return results.map((result: any) => ({
    path: result.path,
    fullPath: result.fullPath || result.path,
    metadata: {
      name: result.metadata?.name || result.path.split('/').pop(),
      modified: result.metadata?.modified || new Date().toISOString(),
      size: result.metadata?.size || 0,
      frontmatter: result.metadata?.frontmatter,
      tags: result.metadata?.tags || [],
      links: result.metadata?.links || [],
      // Store similarity score as part of metadata for display
      similarityScore: result.score
    }
  }));
}

// Generate unique IDs
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create initial default tab for UI to function even without vaults
const initialDefaultTab: Tab = {
  id: generateId(),
  vaultId: 'default',
  name: 'Default',
  documents: [],
  filteredDocuments: [],
  filters: { conditions: [], logic: 'AND' },
  searchQuery: '',
  searchMode: 'text',
  loading: false,
  error: null,
  totalCount: 0
};

// Store implementation
export const useDocumentStore = create<DocumentStore>((set, get) => ({
  // Initial state with default tab
  vaults: [],
  tabs: [initialDefaultTab],
  activeTabId: initialDefaultTab.id,
  loadingVaults: false,
  error: null,
  
  // Load vaults from API
  loadVaults: async () => {
    const { loadingVaults } = get();
    if (loadingVaults) return; // Prevent duplicate calls
    
    set({ loadingVaults: true, error: null });
    
    try {
      const vaults = await fetchVaults();
      
      set({ vaults, loadingVaults: false });
      
      // Replace default tab with vault tabs when vaults are loaded
      const { tabs } = get();
      
      // Check if we only have the default tab
      const hasOnlyDefaultTab = tabs.length === 1 && tabs[0].vaultId === 'default';
      
      if (vaults.length > 0 && hasOnlyDefaultTab) {
        // Clear the default tab and create tabs for all vaults
        const newTabs = [];
        let firstTabId = null;
        
        vaults.forEach((vault, index) => {
          const newTab: Tab = {
            id: generateId(),
            vaultId: vault.id,
            name: vault.name,
            documents: [],
            filteredDocuments: [],
            filters: { conditions: [], logic: 'AND' },
            searchQuery: '',
            searchMode: 'text',
            loading: false,
            error: null,
            totalCount: 0
          };
          newTabs.push(newTab);
          
          if (index === 0) {
            firstTabId = newTab.id;
          }
        });
        
        set({ 
          tabs: newTabs,
          activeTabId: firstTabId
        });
        
        // Load documents for the first tab
        if (firstTabId) {
          get().loadDocuments(firstTabId);
        }
      }
      // If no vaults, keep the default tab as is
      
    } catch (error) {
      console.error('[DocumentStore] Error loading vaults:', error);
      set({ 
        loadingVaults: false, 
        error: error instanceof Error ? error.message : 'Failed to load vaults' 
      });
    }
  },
  
  // Create new tab for a vault
  createTab: (vaultId: string) => {
    const { vaults, tabs } = get();
    const vault = vaults.find(v => v.id === vaultId);
    if (!vault) return;
    
    // Check for existing tab with same vault
    const existingTab = tabs.find(t => t.vaultId === vaultId);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      return;
    }
    
    const newTab: Tab = {
      id: generateId(),
      vaultId,
      name: vault.name,
      documents: [],
      filteredDocuments: [],
      filters: { conditions: [], logic: 'AND' },
      searchQuery: '',
      searchMode: 'text',
      loading: false,
      error: null,
      totalCount: 0
    };
    
    set({ 
      tabs: [...tabs, newTab],
      activeTabId: newTab.id
    });
    
    // Load documents for the new tab
    get().loadDocuments(newTab.id);
  },
  
  // Switch to existing tab
  switchTab: (tabId: string) => {
    set({ activeTabId: tabId });
  },
  
  // Close tab
  closeTab: (tabId: string) => {
    const { tabs, activeTabId } = get();
    const newTabs = tabs.filter(t => t.id !== tabId);
    
    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      newActiveTabId = newTabs.length > 0 ? newTabs[0].id : null;
    }
    
    set({ 
      tabs: newTabs,
      activeTabId: newActiveTabId
    });
  },
  
  // Load documents for a specific tab
  loadDocuments: async (tabId: string) => {
    const { tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.loading) return;
    
    // Update tab loading state
    set({
      tabs: tabs.map(t => 
        t.id === tabId 
          ? { ...t, loading: true, error: null }
          : t
      )
    });
    
    try {
      console.log('[DocumentStore] Loading documents for tab:', tabId, 'vault:', tab.vaultId);
      const result = await fetchDocuments(
        tab.vaultId, 
        tab.searchQuery,
        tab.sortBy,
        tab.sortOrder
      );
      console.log('[DocumentStore] Loaded documents:', result.documents.length, 'total:', result.total);
      
      const updatedTab = get().tabs.find(t => t.id === tabId);
      const filters = updatedTab?.filters || { conditions: [], logic: 'AND' };
      const filteredDocs = applyFilters(
        result.documents,
        filters,
        updatedTab?.searchQuery,
        updatedTab?.searchMode
      );

      set({
        tabs: get().tabs.map(t => 
          t.id === tabId 
            ? { 
                ...t, 
                documents: result.documents, 
                filteredDocuments: filteredDocs,
                vaultTotal: result.total, 
                totalCount: filteredDocs.length,
                loading: false 
              }
            : t
        )
      });
      
    } catch (error) {
      console.error('[DocumentStore] Error loading documents:', error);
      set({
        tabs: get().tabs.map(t => 
          t.id === tabId 
            ? { 
                ...t, 
                loading: false, 
                error: error instanceof Error ? error.message : 'Failed to load documents' 
              }
            : t
        )
      });
    }
  },
  
  // Update search query for a tab
  updateSearch: (tabId: string, query: string) => {
    const { tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    set({
      tabs: tabs.map(t =>
        t.id === tabId
          ? { ...t, searchQuery: query }
          : t
      )
    });

    // Perform appropriate search based on mode
    if (tab.searchMode === 'similarity' && query) {
      get().performSimilaritySearch(tabId, query);
    } else {
      get().loadDocuments(tabId);
    }
  },

  // Set search mode for a tab
  setSearchMode: (tabId: string, mode: 'text' | 'similarity') => {
    const { tabs } = get();
    set({
      tabs: tabs.map(t =>
        t.id === tabId
          ? { ...t, searchMode: mode }
          : t
      )
    });

    // Re-run search with new mode
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.searchQuery) {
      get().updateSearch(tabId, tab.searchQuery);
    }
  },

  // Perform similarity search
  setFilters: (filters: FilterCollection) => {
    const { tabs, activeTabId } = get();
    
    if (!activeTabId) return;
    
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    // Apply filters to documents
    const filteredDocuments = applyFilters(
      tab.documents, 
      filters,
      tab.searchQuery,
      tab.searchMode
    );

    set({
      tabs: tabs.map(t =>
        t.id === activeTabId
          ? { 
              ...t, 
              filters,
              filteredDocuments,
              totalCount: filteredDocuments.length
            }
          : t
      )
    });
  },

  performSimilaritySearch: async (tabId: string, query: string) => {
    const { tabs } = get();
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.loading) return;

    // Update tab loading state
    set({
      tabs: tabs.map(t =>
        t.id === tabId
          ? { ...t, loading: true, error: null }
          : t
      )
    });

    try {
      console.log('[DocumentStore] Performing similarity search for tab:', tabId, 'query:', query);
      const documents = await performSimilaritySearch(tab.vaultId, query);
      console.log('[DocumentStore] Similarity search results:', documents.length);

      set({
        tabs: get().tabs.map(t =>
          t.id === tabId
            ? { ...t, documents, loading: false }
            : t
        )
      });

    } catch (error) {
      console.error('[DocumentStore] Error in similarity search:', error);
      set({
        tabs: get().tabs.map(t =>
          t.id === tabId
            ? {
                ...t,
                loading: false,
                error: error instanceof Error ? error.message : 'Similarity search failed'
              }
            : t
        )
      });
    }
  },
  
  // Clear error
  clearError: () => set({ error: null }),
  
  // Get active tab
  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find(t => t.id === activeTabId) || null;
  }
}));
