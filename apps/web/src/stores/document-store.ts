import { create } from 'zustand';
import { Loggers } from '@mmt/logger';
import { API_ENDPOINTS } from '../config/api';
import type { 
  Document, 
  FilterCollection, 
  Vault, 
  TabState, 
  VaultIndexStatus 
} from './types.js';
import {
  generateTabId,
  createInitialTabState,
  loadTabsFromStorage,
  saveTabsToStorage,
  saveActiveTabId
} from './tab-manager.js';
import {
  initializeTabs,
  performInitialFetch
} from './tab-initialization.js';
import {
  performSimilaritySearch,
  findSimilarDocuments,
  checkSimilarityAvailable
} from './similarity-search.js';
import {
  loadVaults as loadVaultsFromAPI,
  VaultStatusManager
} from './vault-manager.js';
import {
  fetchDocuments as fetchDocumentsFromAPI,
  type DocumentFetchParams
} from './document-operations.js';
import type { DocumentStoreState } from './document-store-types.js';

const logger = Loggers.web();


// Local storage keys
const ACTIVE_TAB_STORAGE_KEY = 'mmt-active-tab';

// Initialize vault status manager
const vaultStatusManager = new VaultStatusManager();

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
    saveActiveTabId(newTab.tabId);

    // Fetch documents for the new tab
    get().fetchDocuments();
  },
  
  switchTab: (tabId: string) => {
    const tab = get().tabs.find(t => t.tabId === tabId);
    if (!tab) return;
    
    set({ activeTabId: tabId });
    saveActiveTabId(tabId);
    
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
    saveActiveTabId(newActiveTabId);
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
    
    // Use the extracted function
    const params: DocumentFetchParams = {
      vaultId,
      searchQuery,
      filters,
      sortBy,
      sortOrder
    };
    
    fetchDocumentsFromAPI(params)
      .then(result => {
        // Update tab with fetched documents - use captured tabId
        set((currentState) => ({
          tabs: currentState.tabs.map(tab =>
            tab.tabId === tabId
              ? { 
                  ...tab,
                  documents: result.documents,
                  filteredDocuments: result.documents,
                  totalCount: result.total,
                  vaultTotal: result.vaultTotal,
                  loading: false
                }
              : tab
          )
        }));
        
        console.log('[fetchDocuments] Updated tab state, loading should be false');
      })
      .catch(error => {
        console.error('[fetchDocuments] Error:', error);
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
      const documentsWithScores = await performSimilaritySearch(
        currentTab.vaultId,
        query,
        20
      );
      
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
      const documentsWithScores = await findSimilarDocuments(
        currentTab.vaultId,
        documentPath,
        10
      );
      
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
      const vaults = await loadVaultsFromAPI();
      console.log('[loadVaults] Loaded vaults:', vaults);
      
      // Check if similarity search is available
      let similarityAvailable = false;
      if (vaults.length > 0) {
        similarityAvailable = await checkSimilarityAvailable(vaults[0].id);
      }
      
      set({ vaults, isLoadingVaults: false, similarityAvailable });
      
      // Initialize tabs if needed
      const { tabs } = get();
      const initResult = initializeTabs(vaults, tabs);
      
      if (initResult.tabs !== tabs || initResult.activeTabId) {
        set({ 
          tabs: initResult.tabs,
          activeTabId: initResult.activeTabId || get().activeTabId
        });
        
        saveTabsToStorage(initResult.tabs);
        if (initResult.activeTabId) {
          saveActiveTabId(initResult.activeTabId);
        }
        
        // Fetch documents for active tab if needed
        if (initResult.shouldFetch) {
          const activeTab = initResult.tabs.find(t => t.tabId === initResult.activeTabId);
          if (activeTab && initResult.fetchVaultId) {
            const tabId = activeTab.tabId;
            performInitialFetch(
              tabId,
              initResult.fetchVaultId,
              (data) => {
                set((state) => ({
                  tabs: state.tabs.map(tab =>
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
              },
              (error) => {
                set((state) => ({
                  tabs: state.tabs.map(tab =>
                    tab.tabId === tabId
                      ? { 
                          ...tab,
                          error: 'Failed to load documents',
                          loading: false
                        }
                      : tab
                  )
                }));
              }
            );
          } else {
            get().fetchDocuments();
          }
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
    vaultStatusManager.updateStatus(vaultId, status);
  },
  
  getVaultStatus: (vaultId: string) => {
    return vaultStatusManager.getStatus(vaultId);
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