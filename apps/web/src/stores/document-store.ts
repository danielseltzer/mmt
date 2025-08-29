import { create } from 'zustand';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

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
  value: string | string[] | number | Date | boolean | { min: number | Date; max: number | Date };
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

interface DocumentStoreState {
  // Tab management
  tabs: TabState[];
  activeTabId: string | null;
  
  // Vault state (shared across tabs)
  vaults: Vault[];
  isLoadingVaults: boolean;
  similarityAvailable: boolean;
  vaultStatuses: Map<string, VaultIndexStatus>;
  
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
    logger.error('Failed to load tabs from storage:', e);
  }
  return [];
};

// Save tabs to localStorage
const saveTabsToStorage = (tabs: TabState[]) => {
  try {
    // Only save essential state, not documents
    // Don't persist search queries - start fresh on reload
    const toSave = tabs.map(tab => ({
      tabId: tab.tabId,
      vaultId: tab.vaultId,
      tabName: tab.tabName,
      // searchQuery: tab.searchQuery,  // Don't persist search queries
      filters: tab.filters,
      sortBy: tab.sortBy,
      sortOrder: tab.sortOrder,
      searchMode: tab.searchMode,
    }));
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    logger.error('Failed to save tabs to storage:', e);
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
  vaultStatuses: new Map(),
  
  // Tab management actions
  createTab: (vaultId: string) => {
    const vault = get().vaults.find(v => v.id === vaultId);
    if (!vault) return;

    // Check if there are existing tabs for this vault to create unique names
    const existingVaultTabs = get().tabs.filter(t => t.vaultId === vaultId);
    const tabName = existingVaultTabs.length > 0
      ? `${vault.name} (${existingVaultTabs.length + 1})`
      : vault.name;

    const newTab = createInitialTabState(vaultId, tabName);
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
  
  fetchDocuments: () => {
    // Make this non-async and use promises directly
    const state = get();
    const currentTab = state.getCurrentTab();
    const tabId = currentTab?.tabId;
    
    console.log('[fetchDocuments] Current tab:', currentTab);
    if (!currentTab || !tabId) {
      console.log('[fetchDocuments] No current tab, aborting');
      return;
    }
    
    // Prevent duplicate fetches for the same tab
    if (currentTab.loading) {
      console.log('[fetchDocuments] Already loading for this tab, skipping duplicate fetch');
      return;
    }
    
    // Update loading state for current tab
    set({
      tabs: state.tabs.map(tab =>
        tab.tabId === tabId
          ? { ...tab, loading: true, error: null }
          : tab
      )
    });
    
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
    
    // Use vault-aware endpoint with properly encoded vault ID
    const url = `/api/vaults/${encodeURIComponent(vaultId)}/documents?${params.toString()}`;
    console.log('[fetchDocuments] Fetching from URL:', url);
    
    // Use promise chain instead of async/await
    try {
      fetch(url)
      .then(response => {
        console.log('[fetchDocuments] Fetch completed, response:', response);
        console.log('[fetchDocuments] Response status:', response.status);
        console.log('[fetchDocuments] Response ok:', response.ok);
        
        if (!response.ok) {
          return response.text().then(errorText => {
            console.error('[fetchDocuments] API error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
          });
        }
        
        console.log('[fetchDocuments] About to parse JSON...');
        return response.json();
      })
      .then(data => {
        console.log('[fetchDocuments] JSON parsed successfully');
        console.log('[fetchDocuments] Received data:', { 
          documents: data.documents?.length || 0, 
          total: data.total,
          vaultTotal: data.vaultTotal 
        });
        
        // Update tab with fetched documents - use captured tabId
        set((currentState) => ({
          tabs: currentState.tabs.map(tab =>
            tab.tabId === tabId
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
        }));
        
        console.log('[fetchDocuments] Updated tab state, loading should be false');
      })
      .catch(error => {
        console.error('[fetchDocuments] Promise error:', error);
        console.error('[fetchDocuments] Full error object:', {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
          vaultId,
          tabId,
          url: url
        });
        set((currentState) => ({
          tabs: currentState.tabs.map(tab =>
            tab.tabId === tabId
              ? { 
                  ...tab,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  loading: false
                }
              : tab
          )
        }));
      });
    } catch (syncError) {
      console.error('[fetchDocuments] Synchronous error creating fetch:', syncError);
      console.error('[fetchDocuments] Sync error details:', {
        message: syncError?.message,
        stack: syncError?.stack,
        vaultId,
        url: url
      });
      set((currentState) => ({
        tabs: currentState.tabs.map(tab =>
          tab.tabId === tabId
            ? { 
                ...tab,
                error: 'Failed to create fetch request',
                loading: false
              }
            : tab
        )
      }));
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
      const response = await fetch(`http://localhost:3001/api/vaults/${currentTab.vaultId}/similarity/search`, {
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
      const documentsWithScores = data.results.map((result) => ({
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
      console.error('[performSimilaritySearch] Error:', error);
      console.error('[performSimilaritySearch] Error details:', {
        message: error?.message,
        stack: error?.stack,
        vaultId: currentTab.vaultId,
        query
      });
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
      const response = await fetch(`http://localhost:3001/api/vaults/${currentTab.vaultId}/similarity/search`, {
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
      const documentsWithScores = data.results.map((result) => ({
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
      console.error('[findSimilarDocuments] Error:', error);
      console.error('[findSimilarDocuments] Error details:', {
        message: error?.message,
        stack: error?.stack,
        vaultId: currentTab.vaultId,
        documentPath
      });
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
    // Prevent multiple concurrent loads
    if (get().isLoadingVaults) {
      console.log('[loadVaults] Already loading vaults, skipping...');
      return;
    }
    
    set({ isLoadingVaults: true });
    console.log('[loadVaults] Starting vault load...');
    
    try {
      const response = await fetch('http://localhost:3001/api/vaults');
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[loadVaults] API error response:', errorText);
        throw new Error(`Failed to load vaults: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const vaults = data.vaults || [];
      console.log('[loadVaults] Loaded vaults:', vaults);
      
      // Check if similarity search is available
      // Try to get similarity status from the first vault
      let similarityAvailable = false;
      if (vaults.length > 0) {
        try {
          const statusResponse = await fetch(`http://localhost:3001/api/vaults/${vaults[0].id}/similarity/status`);
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
      console.log('[loadVaults] Current tabs:', tabs);
      if (tabs.length === 0 && vaults.length > 0) {
        // Try to restore tabs from storage
        const storedTabs = loadTabsFromStorage();
        console.log('[loadVaults] Stored tabs from localStorage:', storedTabs);
        
        if (storedTabs.length > 0) {
          // Validate stored tabs against available vaults
          const validTabs = storedTabs.filter(tab => 
            vaults.some((v: Vault) => v.id === tab.vaultId)
          ).map(stored => ({
            ...createInitialTabState(stored.vaultId, 
              vaults.find((v: Vault) => v.id === stored.vaultId)?.name || stored.tabName),
            tabId: stored.tabId,
            tabName: stored.tabName,
            searchQuery: '',  // Always start with empty search query
            filters: stored.filters || { conditions: [], logic: 'AND' },
            sortBy: stored.sortBy,
            sortOrder: stored.sortOrder || 'asc',
            searchMode: stored.searchMode || 'text',
          }));
          
          if (validTabs.length > 0) {
            const storedActiveId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
            const activeTabId = validTabs.find(t => t.tabId === storedActiveId)?.tabId || validTabs[0].tabId;
            
            console.log('[loadVaults] Setting valid tabs:', validTabs);
            console.log('[loadVaults] Setting active tab ID:', activeTabId);
            set({ 
              tabs: validTabs,
              activeTabId
            });
            
            // Fetch documents for active tab
            console.log('[loadVaults] Fetching documents for active tab...');
            get().fetchDocuments();
            return;
          }
        }
        
        // No valid stored tabs, create tabs for all ready vaults
        console.log('[loadVaults] No stored tabs, creating tabs for all ready vaults');
        const readyVaults = vaults.filter((v: Vault) => v.status === 'ready');
        
        // Create a tab for each ready vault
        if (readyVaults.length > 0) {
          // Store the current tabs array to add all tabs at once
          const newTabs: TabState[] = [];
          let firstTabId: string | null = null;
          
          readyVaults.forEach((vault: Vault, index: number) => {
            console.log(`[loadVaults] Creating tab for vault: ${vault.name}`);
            
            // Create tab state directly without using createTab to avoid side effects
            const tabName = vault.name;
            const newTab = createInitialTabState(vault.id, tabName);
            newTabs.push(newTab);
            
            if (index === 0) {
              firstTabId = newTab.tabId;
            }
          });
          
          // Set all tabs at once with the first one as active
          const updatedTabs = [...get().tabs, ...newTabs];
          set({
            tabs: updatedTabs,
            activeTabId: firstTabId
          });
          
          saveTabsToStorage(updatedTabs);
          if (firstTabId) {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, firstTabId);
          }
          
          // Fetch documents for the active tab
          console.log('[loadVaults] Fetching documents for first tab:', firstTabId);
          if (firstTabId && newTabs.length > 0) {
            const tabToLoad = newTabs[0];
            const url = `/api/vaults/${encodeURIComponent(tabToLoad.vaultId)}/documents?limit=500&offset=0`;
            
            setTimeout(() => {
              console.log('[loadVaults] Direct fetch for initial load:', url);
              fetch(url)
                .then(response => response.json())
                .then(data => {
                  console.log('[loadVaults] Initial fetch complete:', data.documents?.length || 0);
                  set((state) => ({
                    tabs: state.tabs.map(tab =>
                      tab.tabId === firstTabId
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
                  }));
                })
                .catch(error => {
                  console.error('[loadVaults] Initial fetch error:', error);
                  console.error('[loadVaults] Initial fetch error details:', {
                    message: error?.message,
                    stack: error?.stack,
                    vaultId: tabToLoad?.vaultId,
                    url: url
                  });
                  set((state) => ({
                    tabs: state.tabs.map(tab =>
                      tab.tabId === firstTabId
                        ? { 
                            ...tab,
                            error: 'Failed to load documents',
                            loading: false
                          }
                        : tab
                    )
                  }));
                });
            }, 100);
          }
        } else if (vaults.length > 0) {
          // No ready vaults, but we have vaults - create tab for first one anyway
          console.log('[loadVaults] No ready vaults, creating tab for first vault');
          get().createTab(vaults[0].id);
        }
      }
    } catch (error) {
      logger.error('Failed to load vaults:', error);
      console.error('[loadVaults] Failed to load vaults:', error);
      console.error('[loadVaults] Error details:', {
        message: error?.message,
        stack: error?.stack,
        type: error?.constructor?.name
      });
      set({ 
        isLoadingVaults: false 
      });
    }
  },
  
  // Vault status management
  updateVaultStatus: (vaultId: string, status: VaultIndexStatus) => {
    const statuses = new Map(get().vaultStatuses);
    statuses.set(vaultId, status);
    set({ vaultStatuses: statuses });
  },
  
  getVaultStatus: (vaultId: string) => {
    return get().vaultStatuses.get(vaultId);
  }
}));

// For backward compatibility, expose commonly used getters at the top level
export const useCurrentTab = () => {
  const tabs = useDocumentStore(state => state.tabs);
  const activeTabId = useDocumentStore(state => state.activeTabId);
  return tabs.find(t => t.tabId === activeTabId) || null;
};
export const useActiveDocuments = () => {
  const currentTab = useCurrentTab();
  return currentTab?.filteredDocuments || [];
};
export const useActiveFilters = () => {
  const currentTab = useCurrentTab();
  return currentTab?.filters || { conditions: [], logic: 'AND' };
};
export const useActiveTotalCount = () => {
  const currentTab = useCurrentTab();
  return currentTab?.totalCount || 0;
};