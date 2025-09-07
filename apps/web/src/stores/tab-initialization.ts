/**
 * Tab Initialization - Handles initial tab setup when loading vaults
 * Extracted from document-store.ts to improve maintainability
 */

import type { TabState, Vault } from './types.js';
import {
  createInitialTabState,
  loadTabsFromStorage,
  saveTabsToStorage,
  saveActiveTabId
} from './tab-manager.js';
import { fetchDocuments } from './document-operations.js';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

export interface TabInitResult {
  tabs: TabState[];
  activeTabId: string | null;
  shouldFetch: boolean;
  fetchVaultId?: string;
}

/**
 * Initialize tabs from storage or create defaults
 */
export function initializeTabs(vaults: Vault[], existingTabs: TabState[]): TabInitResult {
  console.log('[initializeTabs] Current tabs:', existingTabs);
  
  if (existingTabs.length === 0 && vaults.length > 0) {
    // Try to restore tabs from storage
    const storedTabs = loadTabsFromStorage();
    console.log('[initializeTabs] Stored tabs from localStorage:', storedTabs);
    
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
        filters: stored.filters || { conditions: [], logic: 'AND' as const },
        sortBy: stored.sortBy,
        sortOrder: stored.sortOrder || 'asc' as const,
        searchMode: stored.searchMode || 'text' as const,
      }));
      
      if (validTabs.length > 0) {
        const storedActiveId = localStorage.getItem('mmt-active-tab');
        const activeTabId = validTabs.find(t => t.tabId === storedActiveId)?.tabId || validTabs[0].tabId;
        
        console.log('[initializeTabs] Setting valid tabs:', validTabs);
        console.log('[initializeTabs] Setting active tab ID:', activeTabId);
        
        return {
          tabs: validTabs,
          activeTabId,
          shouldFetch: true,
          fetchVaultId: validTabs.find(t => t.tabId === activeTabId)?.vaultId
        };
      }
    }
    
    // No valid stored tabs, create tabs for all ready vaults
    console.log('[initializeTabs] No stored tabs, creating tabs for all ready vaults');
    const readyVaults = vaults.filter((v: Vault) => v.status === 'ready');
    
    // Create a tab for each ready vault
    if (readyVaults.length > 0) {
      const newTabs: TabState[] = [];
      let firstTabId: string | null = null;
      
      readyVaults.forEach((vault: Vault, index: number) => {
        console.log(`[initializeTabs] Creating tab for vault: ${vault.name}`);
        
        // Create tab state directly
        const tabName = vault.name;
        const newTab = createInitialTabState(vault.id, tabName);
        newTabs.push(newTab);
        
        if (index === 0) {
          firstTabId = newTab.tabId;
        }
      });
      
      return {
        tabs: [...existingTabs, ...newTabs],
        activeTabId: firstTabId,
        shouldFetch: true,
        fetchVaultId: newTabs[0]?.vaultId
      };
    } else if (vaults.length > 0) {
      // No ready vaults, but we have vaults - create tab for first one anyway
      console.log('[initializeTabs] No ready vaults, creating tab for first vault');
      const newTab = createInitialTabState(vaults[0].id, vaults[0].name);
      
      return {
        tabs: [newTab],
        activeTabId: newTab.tabId,
        shouldFetch: true,
        fetchVaultId: vaults[0].id
      };
    }
  }
  
  // No changes needed
  return {
    tabs: existingTabs,
    activeTabId: null,
    shouldFetch: false
  };
}

/**
 * Perform initial document fetch for first tab
 * Now uses fetchDocuments for consistency
 */
export async function performInitialFetch(
  tabId: string,
  vaultId: string,
  onSuccess: (data: any) => void,
  onError: (error: Error) => void
) {
  // Import the fetchDocuments function directly to avoid circular dependency
  const { fetchDocuments } = await import('./document-operations.js');
  
  console.log('[performInitialFetch] Using fetchDocuments for initial load, vaultId:', vaultId);
  
  try {
    const result = await fetchDocuments({
      vaultId,
      limit: 500,
      offset: 0
    });
    
    console.log('[performInitialFetch] Initial fetch complete:', {
      documents: result.documents?.length || 0,
      total: result.total,
      vaultTotal: result.vaultTotal
    });
    
    onSuccess(result);
  } catch (error) {
    console.error('[performInitialFetch] Initial fetch error:', error);
    onError(error as Error);
  }
}