import { useState, useEffect } from 'react';
import { useDocumentStore, VaultIndexStatus } from '../stores/document-store';
import { API_ENDPOINTS, getApiEndpoint } from '../config/api';
import { API_ROUTES } from '@mmt/entities';

interface ApiCall {
  id: string;
  time: Date;
  method: string;
  url: string;
  status: number | string;
  responseData?: any;
  error?: string;
}

export function TestHarness() {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [textSearchQuery, setTextSearchQuery] = useState('');
  const [similaritySearchQuery, setSimilaritySearchQuery] = useState('');
  const [testFilePath, setTestFilePath] = useState('/Users/danielseltzer/Documents/test.md');
  const [filterQuery, setFilterQuery] = useState('');
  const [vaultStatuses, setVaultStatuses] = useState<Record<string, VaultIndexStatus>>({});
  
  // Use actual document store
  const documentStore = useDocumentStore();
  const vaults = useDocumentStore(state => state.vaults);
  const tabs = useDocumentStore(state => state.tabs);
  const activeTabId = useDocumentStore(state => state.activeTabId);
  const currentTab = tabs.find(t => t.tabId === activeTabId);
  const isLoadingVaults = useDocumentStore(state => state.isLoadingVaults);
  
  // Log API call helper
  const logApiCall = (method: string, url: string, status: number | string, responseData?: any, error?: string) => {
    const newCall: ApiCall = {
      id: `${Date.now()}-${Math.random()}`,
      time: new Date(),
      method,
      url,
      status,
      responseData,
      error
    };
    setApiCalls(prev => [...prev, newCall]);
    console.log('[TestHarness] API Call:', newCall);
    
    if (error) {
      setErrors(prev => [...prev, `${new Date().toISOString()}: ${error}`]);
    }
  };
  
  // Vault Operations
  const handleLoadVaults = async () => {
    console.log('[TestHarness] Loading vaults...');
    try {
      await documentStore.loadVaults();
      logApiCall('GET', '/api/vaults', 200, { vaults: documentStore.vaults });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logApiCall('GET', '/api/vaults', 'ERROR', undefined, errorMsg);
    }
  };
  
  const handleCheckVaultStatus = async (vaultId: string) => {
    console.log('[TestHarness] Checking vault status:', vaultId);
    const url = API_ENDPOINTS.vaultStatus(vaultId);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TestHarness] Vault status error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      logApiCall('GET', url, response.status, data);
      
      // Update local vault status
      setVaultStatuses(prev => ({
        ...prev,
        [vaultId]: data
      }));
      
      // Update store
      documentStore.updateVaultStatus(vaultId, data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TestHarness] Check vault status error:', error);
      logApiCall('GET', url, 'ERROR', undefined, errorMsg);
      setErrors(prev => [...prev, `Vault status check failed: ${errorMsg}`]);
    }
  };
  
  // Document Operations
  const handleFetchDocuments = async (vaultId: string) => {
    console.log('[TestHarness] Fetching documents for vault:', vaultId);
    
    // Create tab if needed
    const existingTab = tabs.find(t => t.vaultId === vaultId);
    if (!existingTab) {
      documentStore.createTab(vaultId);
    } else {
      documentStore.switchTab(existingTab.tabId);
    }
    
    // Fetch documents
    setTimeout(() => {
      documentStore.fetchDocuments();
      const url = API_ROUTES.documents.list(vaultId);
      logApiCall('GET', url, 'PENDING', { message: 'Check active tab for results' });
    }, 100);
  };
  
  const handleApplyFilter = async () => {
    if (!currentTab) {
      setErrors(prev => [...prev, 'No active tab']);
      return;
    }
    
    console.log('[TestHarness] Applying filter:', filterQuery);
    const url = getApiEndpoint(API_ROUTES.documents.parseQuery(currentTab.vaultId));
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: filterQuery })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TestHarness] Filter parse error:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      logApiCall('POST', url, response.status, data);
      
      if (data.filters) {
        documentStore.setFilters(data.filters);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TestHarness] Apply filter error:', error);
      logApiCall('POST', url, 'ERROR', undefined, errorMsg);
      setErrors(prev => [...prev, `Filter application failed: ${errorMsg}`]);
    }
  };
  
  // File Operations
  const handleRevealInFinder = async () => {
    console.log('[TestHarness] Revealing in finder:', testFilePath);
    const url = getApiEndpoint(API_ROUTES.files.reveal());
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: testFilePath })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TestHarness] Reveal error:', errorText);
        logApiCall('POST', url, response.status, errorText);
        setErrors(prev => [...prev, `Reveal failed: ${errorText}`]);
        return;
      }
      
      const data = await response.json();
      logApiCall('POST', url, response.status, data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TestHarness] Reveal in finder error:', error);
      logApiCall('POST', url, 'ERROR', undefined, errorMsg);
      setErrors(prev => [...prev, `Reveal operation failed: ${errorMsg}`]);
    }
  };
  
  const handleQuickLook = async () => {
    console.log('[TestHarness] QuickLook preview:', testFilePath);
    const url = getApiEndpoint(API_ROUTES.files.quicklook());
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: testFilePath })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TestHarness] QuickLook error:', errorText);
        logApiCall('POST', url, response.status, errorText);
        setErrors(prev => [...prev, `QuickLook failed: ${errorText}`]);
        return;
      }
      
      const data = await response.json();
      logApiCall('POST', url, response.status, data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TestHarness] QuickLook error:', error);
      logApiCall('POST', url, 'ERROR', undefined, errorMsg);
      setErrors(prev => [...prev, `QuickLook operation failed: ${errorMsg}`]);
    }
  };
  
  // Search Operations
  const handleTextSearch = async () => {
    if (!currentTab) {
      setErrors(prev => [...prev, 'No active tab for search']);
      return;
    }
    
    console.log('[TestHarness] Text search:', textSearchQuery);
    documentStore.setSearchQuery(textSearchQuery);
    documentStore.setSearchMode('text');
    documentStore.fetchDocuments();
    
    const url = `/api/vaults/${encodeURIComponent(currentTab.vaultId)}/documents?q=${encodeURIComponent(textSearchQuery)}`;
    logApiCall('GET', url, 'PENDING', { query: textSearchQuery });
  };
  
  const handleSimilaritySearch = async () => {
    if (!currentTab) {
      setErrors(prev => [...prev, 'No active tab for similarity search']);
      return;
    }
    
    console.log('[TestHarness] Similarity search:', similaritySearchQuery);
    const url = API_ENDPOINTS.similaritySearch(currentTab.vaultId);
    
    try {
      documentStore.setSearchMode('similarity');
      await documentStore.performSimilaritySearch(similaritySearchQuery);
      logApiCall('POST', url, 200, { query: similaritySearchQuery });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logApiCall('POST', url, 'ERROR', undefined, errorMsg);
    }
  };
  
  const handleCheckSimilarityStatus = async (vaultId: string) => {
    console.log('[TestHarness] Checking similarity status for vault:', vaultId);
    const url = API_ENDPOINTS.similarityStatus(vaultId);
    
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TestHarness] Similarity status error:', errorText);
        logApiCall('GET', url, response.status, { error: errorText });
        setErrors(prev => [...prev, `Similarity status check failed: ${errorText}`]);
        return;
      }
      
      const data = await response.json();
      logApiCall('GET', url, response.status, data);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TestHarness] Similarity status check error:', error);
      logApiCall('GET', url, 'ERROR', undefined, errorMsg);
      setErrors(prev => [...prev, `Similarity status check failed: ${errorMsg}`]);
    }
  };
  
  // Clear functions
  const clearApiCalls = () => setApiCalls([]);
  const clearErrors = () => setErrors([]);
  
  // Auto-load vaults on mount
  useEffect(() => {
    if (vaults.length === 0 && !isLoadingVaults) {
      handleLoadVaults();
    }
  }, []);
  
  return (
    <div id="test-harness" style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>MMT Test Harness</h1>
      <p>Development mode testing page for all API operations</p>
      
      {/* Vault Operations */}
      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Vault Operations</h2>
        
        <div style={{ marginTop: '10px' }}>
          <button 
            data-testid="load-vaults"
            onClick={handleLoadVaults}
            style={{ padding: '5px 10px', marginRight: '10px' }}
          >
            Load Vaults
          </button>
          
          <div data-testid="vault-count" style={{ marginTop: '10px' }}>
            Loaded Vaults: {vaults.length}
          </div>
          
          {isLoadingVaults && (
            <div data-testid="vault-loading">Loading vaults...</div>
          )}
          
          {vaults.map(vault => (
            <div key={vault.id} data-testid={`vault-${vault.id}`} style={{ marginTop: '10px', paddingLeft: '20px' }}>
              <strong>{vault.name}</strong> (ID: {vault.id})
              <div>Status: <span data-testid={`vault-status-${vault.id}`}>{vault.status}</span></div>
              {vault.error && <div style={{ color: 'red' }}>Error: {vault.error}</div>}
              
              <button
                data-testid={`check-status-${vault.id}`}
                onClick={() => handleCheckVaultStatus(vault.id)}
                style={{ padding: '2px 5px', marginTop: '5px', marginRight: '5px' }}
              >
                Check Status
              </button>
              
              <button
                data-testid={`fetch-docs-${vault.id}`}
                onClick={() => handleFetchDocuments(vault.id)}
                style={{ padding: '2px 5px', marginTop: '5px', marginRight: '5px' }}
              >
                Fetch Documents
              </button>
              
              <button
                data-testid={`check-similarity-${vault.id}`}
                onClick={() => handleCheckSimilarityStatus(vault.id)}
                style={{ padding: '2px 5px', marginTop: '5px' }}
              >
                Check Similarity
              </button>
              
              {vaultStatuses[vault.id] && (
                <div style={{ marginTop: '5px', fontSize: '12px' }}>
                  Index Status: {vaultStatuses[vault.id].status} | 
                  Docs: {vaultStatuses[vault.id].documentCount} | 
                  Similarity: {vaultStatuses[vault.id].similarityStatus?.available ? 'Available' : 'Not Available'}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      
      {/* Document Operations */}
      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Document Operations</h2>
        
        {currentTab && (
          <div>
            <div data-testid="active-tab">
              Active Tab: {currentTab.tabName} (Vault: {currentTab.vaultId})
            </div>
            <div data-testid="document-count">
              Documents: {currentTab.documents.length} / {currentTab.totalCount} (Vault Total: {currentTab.vaultTotal})
            </div>
            {currentTab.loading && <div data-testid="documents-loading">Loading documents...</div>}
            {currentTab.error && <div data-testid="documents-error" style={{ color: 'red' }}>Error: {currentTab.error}</div>}
            
            <div style={{ marginTop: '10px' }}>
              <input
                data-testid="filter-input"
                type="text"
                placeholder="Filter query (e.g., 'modified after 2024-01-01')"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                style={{ width: '300px', padding: '5px', marginRight: '10px' }}
              />
              <button
                data-testid="apply-filter"
                onClick={handleApplyFilter}
                style={{ padding: '5px 10px' }}
              >
                Apply Filter
              </button>
            </div>
          </div>
        )}
        
        {!currentTab && (
          <div data-testid="no-active-tab">No active tab. Load vaults first.</div>
        )}
      </section>
      
      {/* File Operations */}
      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>File Operations</h2>
        
        <div>
          <input
            data-testid="file-path-input"
            type="text"
            placeholder="File path"
            value={testFilePath}
            onChange={(e) => setTestFilePath(e.target.value)}
            style={{ width: '400px', padding: '5px', marginRight: '10px' }}
          />
        </div>
        
        <div style={{ marginTop: '10px' }}>
          <button
            data-testid="reveal-in-finder"
            onClick={handleRevealInFinder}
            style={{ padding: '5px 10px', marginRight: '10px' }}
          >
            Reveal in Finder
          </button>
          
          <button
            data-testid="quicklook-preview"
            onClick={handleQuickLook}
            style={{ padding: '5px 10px' }}
          >
            QuickLook Preview
          </button>
        </div>
        
        <div data-testid="file-operation-status" style={{ marginTop: '10px' }}>
          {/* Status will be shown in API calls */}
        </div>
      </section>
      
      {/* Search Operations */}
      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Search Operations</h2>
        
        <div>
          <input
            data-testid="text-search-input"
            type="text"
            placeholder="Text search query"
            value={textSearchQuery}
            onChange={(e) => setTextSearchQuery(e.target.value)}
            style={{ width: '300px', padding: '5px', marginRight: '10px' }}
          />
          <button
            data-testid="text-search-button"
            onClick={handleTextSearch}
            style={{ padding: '5px 10px' }}
            disabled={!currentTab}
          >
            Text Search
          </button>
        </div>
        
        <div style={{ marginTop: '10px' }}>
          <input
            data-testid="similarity-search-input"
            type="text"
            placeholder="Similarity search query"
            value={similaritySearchQuery}
            onChange={(e) => setSimilaritySearchQuery(e.target.value)}
            style={{ width: '300px', padding: '5px', marginRight: '10px' }}
          />
          <button
            data-testid="similarity-search-button"
            onClick={handleSimilaritySearch}
            style={{ padding: '5px 10px' }}
            disabled={!currentTab}
          >
            Similarity Search
          </button>
        </div>
        
        {currentTab && (
          <div style={{ marginTop: '10px' }}>
            <div data-testid="search-mode">Search Mode: {currentTab.searchMode}</div>
            <div data-testid="search-results-count">
              {currentTab.searchMode === 'similarity' 
                ? `Similarity Results: ${currentTab.similarityResults.length}`
                : `Filtered Documents: ${currentTab.filteredDocuments.length}`
              }
            </div>
          </div>
        )}
      </section>
      
      {/* Debug Output */}
      <section style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px' }}>
        <h2>Debug Output</h2>
        
        <div style={{ marginBottom: '10px' }}>
          <button onClick={clearApiCalls} style={{ padding: '5px 10px', marginRight: '10px' }}>
            Clear API Calls
          </button>
          <button onClick={clearErrors} style={{ padding: '5px 10px' }}>
            Clear Errors
          </button>
        </div>
        
        <div data-testid="api-calls" style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', padding: '5px' }}>
          <h3>API Calls ({apiCalls.length})</h3>
          {apiCalls.map(call => (
            <div key={call.id} style={{ marginBottom: '5px', fontSize: '12px' }}>
              [{call.time.toISOString()}] {call.method} {call.url} - Status: {call.status}
              {call.error && <span style={{ color: 'red' }}> - Error: {call.error}</span>}
              {call.responseData && (
                <div style={{ paddingLeft: '20px', color: '#666' }}>
                  Response: {JSON.stringify(call.responseData, null, 2).substring(0, 200)}...
                </div>
              )}
            </div>
          ))}
          {apiCalls.length === 0 && <div>No API calls yet</div>}
        </div>
        
        <div data-testid="error-log" style={{ marginTop: '10px', maxHeight: '150px', overflow: 'auto', border: '1px solid #ddd', padding: '5px' }}>
          <h3>Errors ({errors.length})</h3>
          {errors.map((error, idx) => (
            <div key={idx} style={{ color: 'red', fontSize: '12px', marginBottom: '3px' }}>
              {error}
            </div>
          ))}
          {errors.length === 0 && <div>No errors</div>}
        </div>
        
        <div data-testid="store-state" style={{ marginTop: '10px', border: '1px solid #ddd', padding: '5px' }}>
          <h3>Store State</h3>
          <div style={{ fontSize: '12px' }}>
            <div>Vaults: {vaults.length}</div>
            <div>Tabs: {tabs.length}</div>
            <div>Active Tab ID: {activeTabId || 'None'}</div>
            {currentTab && (
              <>
                <div>Current Tab Documents: {currentTab.documents.length}</div>
                <div>Current Tab Loading: {currentTab.loading ? 'Yes' : 'No'}</div>
                <div>Current Tab Error: {currentTab.error || 'None'}</div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}