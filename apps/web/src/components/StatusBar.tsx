/**
 * StatusBar - Application status bar
 */

import React from 'react';
import { useDocumentStore } from '../stores/document-store';

export function StatusBar() {
  const { 
    vaults, 
    tabs, 
    activeTabId, 
    loadingVaults, 
    getActiveTab 
  } = useDocumentStore();

  const currentTab = getActiveTab();
  const documentCount = currentTab?.vaultTotal || currentTab?.documents?.length || 0;
  const vaultCount = vaults.length;
  const hasError = currentTab?.error ? true : false;
  const isLoadingDocuments = currentTab?.loading || false;

  // Determine status
  let status = 'Ready';
  let statusColor = 'text-green-400';
  
  if (loadingVaults) {
    status = 'Loading vaults...';
    statusColor = 'text-yellow-400';
  } else if (isLoadingDocuments) {
    status = `Loading documents from ${currentTab?.name}...`;
    statusColor = 'text-yellow-400';
  } else if (hasError) {
    status = `Error: ${currentTab?.error}`;
    statusColor = 'text-red-400';
  } else if (vaultCount === 0) {
    status = 'No vaults found';
    statusColor = 'text-red-400';
  }

  // Determine app status for health check
  const appStatus = loadingVaults ? 'loading-vaults' : 
                    isLoadingDocuments ? 'loading-documents' :
                    hasError ? 'error' :
                    vaultCount === 0 ? 'no-vaults' :
                    'ready';
  
  const isReady = vaultCount > 0 && !isLoadingDocuments && !loadingVaults && !hasError;

  return (
    <div 
      id="app-status-bar"
      className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 px-4 py-2 text-sm z-50"
      data-testid="status-bar"
      data-status={appStatus}
      data-ready={isReady ? 'true' : 'false'}
      data-error={hasError ? 'true' : 'false'}
    >
      <div className="flex justify-between items-center">
        {/* Left side - App status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Status:</span>
            <span id="status-text" className={statusColor} data-status={status}>
              {status}
            </span>
          </div>
          
          {!loadingVaults && !hasError && (
            <div className="flex items-center gap-1 text-gray-400">
              <span data-ready={isReady ? 'true' : 'false'}>
                Ready: {isReady ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          )}
        </div>

        {/* Right side - Counts and info */}
        <div className="flex items-center gap-4 text-gray-400">
          <span id="vault-count">Vaults: {vaultCount}</span>
          {currentTab && (
            <>
              <span id="document-count">Documents: {documentCount}</span>
              {currentTab.searchQuery && (
                <span>Search: "{currentTab.searchQuery}"</span>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Hidden notification element for health check */}
      {hasError && (
        <div id="notification-text" data-notification-type="error" style={{ display: 'none' }}>
          {currentTab?.error}
        </div>
      )}
    </div>
  );
}
