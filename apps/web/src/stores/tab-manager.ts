/**
 * Tab Manager - Handles tab lifecycle and persistence for document tabs
 * Extracted from document-store.ts to improve maintainability
 */

import type { TabState } from './types.js';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

const TABS_STORAGE_KEY = 'mmt-tabs-state';
const ACTIVE_TAB_STORAGE_KEY = 'mmt-active-tab';

/**
 * Generate a unique tab ID
 */
export const generateTabId = (): string => 
  `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create initial tab state for a vault
 */
export const createInitialTabState = (vaultId: string, vaultName: string): TabState => ({
  tabId: generateTabId(),
  vaultId,
  tabName: vaultName,
  documents: [],
  filteredDocuments: [],
  totalCount: 0,
  vaultTotal: 0,
  searchQuery: '',
  filters: {
    conditions: [],
    logic: 'AND'
  },
  sortBy: undefined,
  sortOrder: 'asc',
  searchMode: 'text',
  similarityResults: [],
  loading: false,
  loadingSimilarity: false,
  error: null
});

/**
 * Load tabs from localStorage
 */
export const loadTabsFromStorage = (): TabState[] => {
  try {
    const storedTabs = localStorage.getItem(TABS_STORAGE_KEY);
    if (storedTabs) {
      const tabs = JSON.parse(storedTabs) as TabState[];
      // Clear any transient state from stored tabs
      return tabs.map(tab => ({
        ...tab,
        documents: [],
        filteredDocuments: [],
        loading: false,
        loadingSimilarity: false,
        error: null
      }));
    }
  } catch (error) {
    logger.error('Failed to load tabs from storage:', error);
  }
  return [];
};

/**
 * Save tabs to localStorage
 */
export const saveTabsToStorage = (tabs: TabState[]): void => {
  try {
    // Only persist essential tab state (not documents)
    const tabsToStore = tabs.map(tab => ({
      tabId: tab.tabId,
      vaultId: tab.vaultId,
      tabName: tab.tabName,
      searchQuery: tab.searchQuery,
      filters: tab.filters,
      sortBy: tab.sortBy,
      sortOrder: tab.sortOrder,
      searchMode: tab.searchMode,
      totalCount: tab.totalCount,
      vaultTotal: tab.vaultTotal
    }));
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabsToStore));
  } catch (error) {
    logger.error('Failed to save tabs to storage:', error);
  }
};

/**
 * Load active tab ID from localStorage
 */
export const loadActiveTabId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
  } catch (error) {
    logger.error('Failed to load active tab ID:', error);
    return null;
  }
};

/**
 * Save active tab ID to localStorage
 */
export const saveActiveTabId = (tabId: string | null): void => {
  try {
    if (tabId) {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, tabId);
    } else {
      localStorage.removeItem(ACTIVE_TAB_STORAGE_KEY);
    }
  } catch (error) {
    logger.error('Failed to save active tab ID:', error);
  }
};

/**
 * Tab manager class for complex tab operations
 */
export class TabManager {
  /**
   * Find a tab by ID
   */
  static findTab(tabs: TabState[], tabId: string): TabState | undefined {
    return tabs.find(t => t.tabId === tabId);
  }

  /**
   * Find tabs by vault ID
   */
  static findTabsByVault(tabs: TabState[], vaultId: string): TabState[] {
    return tabs.filter(t => t.vaultId === vaultId);
  }

  /**
   * Update a tab with partial state
   */
  static updateTab(tabs: TabState[], tabId: string, updates: Partial<TabState>): TabState[] {
    return tabs.map(tab => 
      tab.tabId === tabId ? { ...tab, ...updates } : tab
    );
  }

  /**
   * Remove a tab
   */
  static removeTab(tabs: TabState[], tabId: string): TabState[] {
    return tabs.filter(t => t.tabId !== tabId);
  }

  /**
   * Ensure at least one tab exists
   */
  static ensureTabExists(tabs: TabState[], vaults: Vault[]): TabState[] {
    if (tabs.length === 0 && vaults.length > 0) {
      const defaultVault = vaults.find(v => v.status === 'ready') || vaults[0];
      if (defaultVault) {
        return [createInitialTabState(defaultVault.id, defaultVault.name)];
      }
    }
    return tabs;
  }
}