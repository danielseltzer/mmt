import { create } from 'zustand';

// Local type definitions to avoid importing from @mmt/entities
interface Document {
  path: string;
  fullPath?: string; // Full path for unique identification
  metadata: {
    name: string;
    modified: string;
    size: number;
    frontmatter?: Record<string, any>;
    tags?: string[];
    links?: string[];
    backlinks?: string[];
  };
  similarityScore?: number; // Score from similarity search (0-1)
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
 * Tab State - Individual state for each open vault/document set tab
 */
interface TabState {
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
interface DocumentStoreState {
  // Tab management
  tabs: TabState[];
  activeTabId: string | null;
  
  // Vault state (shared across tabs)
  vaults: Vault[];
  isLoadingVaults: boolean;
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
  fetchDocuments: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
  
  // Similarity search actions (operate on active tab)
  setSearchMode: (mode: 'text' | 'similarity') => void;
  performSimilaritySearch: (query: string) => Promise<void>;
  findSimilarDocuments: (documentPath: string) => Promise<void>;
  
  // Vault actions
  loadVaults: () => Promise<void>;
}

// Local storage keys
const TABS_STORAGE_KEY = 'mmt-tabs-state';
const ACTIVE_TAB_STORAGE_KEY = 'mmt-active-tab';

// Generate unique tab ID
const generateTabId = () => `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Create initial tab state
const createInitialTabState = (vaultId: string, vaultName: string): TabState => ({
  tabId: generateTabId(),
  vaultId,
  tabName: vaultName,
  documents: [],
  filteredDocuments: [],
  totalCount: 0,
  vaultTotal: 0,
  searchQuery: '',
  filters: { conditions: [], logic: 'AND' },
  sortBy: undefined,
  sortOrder: 'asc',
  searchMode: 'text',
  similarityResults: [],
  loading: false,
  loadingSimilarity: false,
  error: null,
});

// Load tabs from localStorage
const loadTabsFromStorage = (): TabState[] => {
  try {
    const stored = localStorage.getItem(TABS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate and migrate if needed
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Failed to load tabs from storage:', e);
  }
  return [];
};

// Save tabs to localStorage
const saveTabsToStorage = (tabs: TabState[]) => {
  try {
    // Only save essential state, not documents
    const toSave = tabs.map(tab => ({
      tabId: tab.tabId,
      vaultId: tab.vaultId,
      tabName: tab.tabName,
      searchQuery: tab.searchQuery,
      filters: tab.filters,
      sortBy: tab.sortBy,
      sortOrder: tab.sortOrder,
      searchMode: tab.searchMode,
    }));
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save tabs to storage:', e);
  }
};

export const useDocumentStore = create<DocumentStoreState>((set, get) => ({
  // Initialize with stored tabs or empty array
  tabs: [],
  activeTabId: localStorage.getItem(ACTIVE_TAB_STORAGE_KEY),
  
  // Vault state
  vaults: [],
  isLoadingVaults: false,
  similarityAvailable: false,
  
  // Tab management actions
  createTab: (vaultId: string) => {
    const vault = get().vaults.find(v => v.id === vaultId);
    if (!vault) return;
    
    const newTab = createInitialTabState(vaultId, vault.name);
    const updatedTabs = [...get().tabs, newTab];
    
    set({ 
      tabs: updatedTabs,
      activeTabId: newTab.tabId 
    });
    
    saveTabsToStorage(updatedTabs);
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, newTab.tabId);
    
    // Fetch documents for the new tab
    get().fetchDocuments();
  },
  
  switchTab: (tabId: string) => {
    const tab = get().tabs.find(t => t.tabId === tabId);
    if (!tab) return;
    
    set({ activeTabId: tabId });
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId);
    
    // If tab has no documents yet, fetch them
    if (tab.documents.length === 0 && !tab.loading) {
      get().fetchDocuments();
    }
  },
  
  closeTab: (tabId: string) => {
    const tabs = get().tabs;
    const activeTabId = get().activeTabId;
    const tabIndex = tabs.findIndex(t => t.tabId === tabId);
    
    if (tabIndex === -1 || tabs.length <= 1) return;
    
    const updatedTabs = tabs.filter(t => t.tabId !== tabId);
    let newActiveTabId = activeTabId;
    
    // If closing the active tab, switch to adjacent tab
    if (activeTabId === tabId) {
      const newIndex = Math.min(tabIndex, updatedTabs.length - 1);
      newActiveTabId = updatedTabs[newIndex]?.tabId || null;
    }
    
    set({ 
      tabs: updatedTabs,
      activeTabId: newActiveTabId 
    });
    
    saveTabsToStorage(updatedTabs);
    if (newActiveTabId) {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, newActiveTabId);
    }
  },
  
  getCurrentTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find(t => t.tabId === activeTabId) || null;
  },
  
  updateTabName: (tabId: string, name: string) => {
    const tabs = get().tabs;
    const updatedTabs = tabs.map(tab => 
      tab.tabId === tabId ? { ...tab, tabName: name } : tab
    );
    
    set({ tabs: updatedTabs });
    saveTabsToStorage(updatedTabs);
  },
  
  // Per-tab actions
  setSearchQuery: (query: string) => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    const updatedTabs = get().tabs.map(tab =>
      tab.tabId === currentTab.tabId 
        ? { ...tab, searchQuery: query }
        : tab
    );
    
    set({ tabs: updatedTabs });
  },
  
  setFilters: (filters: FilterCollection) => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    const updatedTabs = get().tabs.map(tab =>
      tab.tabId === currentTab.tabId 
        ? { ...tab, filters }
        : tab
    );
    
    set({ tabs: updatedTabs });
    
    // Trigger a new fetch with the updated filters
    get().fetchDocuments();
  },
  
  setSort: (sortBy: string, sortOrder: 'asc' | 'desc') => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    const updatedTabs = get().tabs.map(tab =>
      tab.tabId === currentTab.tabId 
        ? { ...tab, sortBy, sortOrder }
        : tab
    );
    
    set({ tabs: updatedTabs });
    
    // Trigger a new fetch with the updated sort
    get().fetchDocuments();
  },
  
  fetchDocuments: async () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    // Update loading state for current tab
    set({
      tabs: get().tabs.map(tab =>
        tab.tabId === currentTab.tabId 
          ? { ...tab, loading: true, error: null }
          : tab
      )
    });
    
    try {
      const { searchQuery, filters, sortBy, sortOrder, vaultId } = currentTab;
      const limit = 500;
      
      // Build URL with query parameters
      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
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
      const url = `/api/vaults/${vaultId}/documents?${params.toString()}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Update tab with fetched documents
      set({
        tabs: get().tabs.map(tab =>
          tab.tabId === currentTab.tabId 
            ? { 
                ...tab,
                documents: data.documents,
                filteredDocuments: data.documents,
                totalCount: data.total,
                vaultTotal: data.vaultTotal,
                loading: false
              }
            : tab
        )
      });
    } catch (error) {
      set({
        tabs: get().tabs.map(tab =>
          tab.tabId === currentTab.tabId 
            ? { 
                ...tab,
                error: error instanceof Error ? error.message : 'Unknown error',
                loading: false
              }
            : tab
        )
      });
    }
  },
  
  clearError: () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    set({
      tabs: get().tabs.map(tab =>
        tab.tabId === currentTab.tabId 
          ? { ...tab, error: null }
          : tab
      )
    });
  },
  
  reset: () => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    set({
      tabs: get().tabs.map(tab =>
        tab.tabId === currentTab.tabId 
          ? {
              ...tab,
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
              searchMode: 'text',
              similarityResults: [],
              loadingSimilarity: false
            }
          : tab
      )
    });
  },
  
  // Similarity search actions
  setSearchMode: (mode: 'text' | 'similarity') => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    set({
      tabs: get().tabs.map(tab =>
        tab.tabId === currentTab.tabId 
          ? { ...tab, searchMode: mode }
          : tab
      )
    });
    
    // Clear results when switching modes
    if (mode === 'text') {
      set({
        tabs: get().tabs.map(tab =>
          tab.tabId === currentTab.tabId 
            ? { ...tab, similarityResults: [] }
            : tab
        )
      });
      get().fetchDocuments();
    } else {
      // If switching to similarity mode and we have a query, perform search
      if (currentTab.searchQuery) {
        get().performSimilaritySearch(currentTab.searchQuery);
      }
    }
  },
  
  performSimilaritySearch: async (query: string) => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    set({
      tabs: get().tabs.map(tab =>
        tab.tabId === currentTab.tabId 
          ? { ...tab, loadingSimilarity: true, error: null }
          : tab
      )
    });
    
    try {
      const response = await fetch(`/api/vaults/${currentTab.vaultId}/similarity/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          limit: 20 
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
      const documentsWithScores = data.results.map((result: any) => ({
        path: result.path,
        fullPath: result.path,
        metadata: {
          name: result.path.split('/').pop() || result.path,
          modified: '',
          size: 0,
        },
        similarityScore: result.score,
      }));
      
      set({
        tabs: get().tabs.map(tab =>
          tab.tabId === currentTab.tabId 
            ? { 
                ...tab,
                similarityResults: documentsWithScores,
                filteredDocuments: documentsWithScores,
                totalCount: documentsWithScores.length,
                loadingSimilarity: false,
                loading: false
              }
            : tab
        )
      });
    } catch (error) {
      set({
        tabs: get().tabs.map(tab =>
          tab.tabId === currentTab.tabId 
            ? { 
                ...tab,
                error: error instanceof Error ? error.message : 'Similarity search failed',
                loadingSimilarity: false,
                loading: false
              }
            : tab
        )
      });
    }
  },
  
  findSimilarDocuments: async (documentPath: string) => {
    const currentTab = get().getCurrentTab();
    if (!currentTab) return;
    
    set({
      tabs: get().tabs.map(tab =>
        tab.tabId === currentTab.tabId 
          ? { ...tab, loadingSimilarity: true, error: null, searchMode: 'similarity' }
          : tab
      )
    });
    
    try {
      const response = await fetch(`/api/vaults/${currentTab.vaultId}/similarity/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          documentPath,
          limit: 10 
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
      const documentsWithScores = data.results.map((result: any) => ({
        path: result.path,
        fullPath: result.path,
        metadata: {
          name: result.path.split('/').pop() || result.path,
          modified: '',
          size: 0,
        },
        similarityScore: result.score,
      }));
      
      set({
        tabs: get().tabs.map(tab =>
          tab.tabId === currentTab.tabId 
            ? { 
                ...tab,
                similarityResults: documentsWithScores,
                filteredDocuments: documentsWithScores,
                totalCount: documentsWithScores.length,
                loadingSimilarity: false,
                loading: false,
                searchQuery: `Similar to: ${documentPath.split('/').pop()}`
              }
            : tab
        )
      });
    } catch (error) {
      set({
        tabs: get().tabs.map(tab =>
          tab.tabId === currentTab.tabId 
            ? { 
                ...tab,
                error: error instanceof Error ? error.message : 'Find similar failed',
                loadingSimilarity: false,
                loading: false
              }
            : tab
        )
      });
    }
  },
  
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
      
      // Check if similarity search is available
      // Try to get similarity status from the first vault
      let similarityAvailable = false;
      if (vaults.length > 0) {
        try {
          const statusResponse = await fetch(`/api/vaults/${vaults[0].id}/similarity/status`);
          // 501 means not configured, which is fine - not an error
          similarityAvailable = statusResponse.ok && statusResponse.status !== 501;
        } catch {
          // Network error or other issue - assume not available
          similarityAvailable = false;
        }
      }
      
      set({ vaults, isLoadingVaults: false, similarityAvailable });
      
      // Initialize tabs if needed
      const { tabs } = get();
      if (tabs.length === 0 && vaults.length > 0) {
        // Try to restore tabs from storage
        const storedTabs = loadTabsFromStorage();
        
        if (storedTabs.length > 0) {
          // Validate stored tabs against available vaults
          const validTabs = storedTabs.filter(tab => 
            vaults.some((v: Vault) => v.id === tab.vaultId)
          ).map(stored => ({
            ...createInitialTabState(stored.vaultId, 
              vaults.find((v: Vault) => v.id === stored.vaultId)?.name || stored.tabName),
            tabId: stored.tabId,
            tabName: stored.tabName,
            searchQuery: stored.searchQuery || '',
            filters: stored.filters || { conditions: [], logic: 'AND' },
            sortBy: stored.sortBy,
            sortOrder: stored.sortOrder || 'asc',
            searchMode: stored.searchMode || 'text',
          }));
          
          if (validTabs.length > 0) {
            const storedActiveId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
            const activeTabId = validTabs.find(t => t.tabId === storedActiveId)?.tabId || validTabs[0].tabId;
            
            set({ 
              tabs: validTabs,
              activeTabId
            });
            
            // Fetch documents for active tab
            get().fetchDocuments();
            return;
          }
        }
        
        // No valid stored tabs, create default tab for first vault
        const firstReadyVault = vaults.find((v: Vault) => v.status === 'ready') || vaults[0];
        if (firstReadyVault) {
          get().createTab(firstReadyVault.id);
        }
      }
    } catch (error) {
      console.error('Failed to load vaults:', error);
      set({ 
        isLoadingVaults: false 
      });
    }
  },
}));

// For backward compatibility, expose commonly used getters at the top level
export const useCurrentTab = () => useDocumentStore(state => state.getCurrentTab());
export const useActiveDocuments = () => {
  const currentTab = useDocumentStore(state => state.getCurrentTab());
  return currentTab?.filteredDocuments || [];
};
export const useActiveFilters = () => {
  const currentTab = useDocumentStore(state => state.getCurrentTab());
  return currentTab?.filters || { conditions: [], logic: 'AND' };
};
export const useActiveTotalCount = () => {
  const currentTab = useDocumentStore(state => state.getCurrentTab());
  return currentTab?.totalCount || 0;
};