import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDocumentStore } from '../../src/stores/document-store';

describe('Document Store - Similarity Search', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDocumentStore.setState({
      vaults: [],
      tabs: [],
      activeTabId: null,
      loadingVaults: false,
      error: null
    });
    
    // Clear fetch mocks - we'll use real fetch or controlled responses
    global.fetch = vi.fn();
  });
  
  describe('performSimilaritySearch', () => {
    it('should call similarity search endpoint with correct parameters', async () => {
      const mockVault = { id: 'test-vault', name: 'Test Vault', status: 'ready' };
      const mockTab = {
        id: 'tab-1',
        vaultId: 'test-vault',
        name: 'Test Vault',
        documents: [],
        searchQuery: '',
        searchMode: 'similarity' as const,
        loading: false,
        error: null
      };
      
      // Setup initial state
      useDocumentStore.setState({
        vaults: [mockVault],
        tabs: [mockTab],
        activeTabId: 'tab-1'
      });
      
      // Mock fetch to return similarity results
      const mockResults = [
        {
          path: 'doc1.md',
          fullPath: '/vault/doc1.md',
          score: 0.95,
          metadata: {
            name: 'Document 1',
            modified: '2024-01-01',
            size: 1000
          }
        },
        {
          path: 'doc2.md',
          fullPath: '/vault/doc2.md',
          score: 0.85,
          metadata: {
            name: 'Document 2',
            modified: '2024-01-02',
            size: 2000
          }
        }
      ];
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults })
      });
      
      const { result } = renderHook(() => useDocumentStore());
      
      // Perform similarity search
      await act(async () => {
        await result.current.performSimilaritySearch('tab-1', 'test query');
      });
      
      // Verify fetch was called with correct URL and body
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/vaults/test-vault/similarity/search',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'test query', limit: 500 })
        }
      );
      
      // Verify documents were updated in the tab
      const updatedTab = result.current.tabs.find(t => t.id === 'tab-1');
      expect(updatedTab?.documents).toBeDefined();
      expect(updatedTab?.documents.length).toBe(2);
      // Check that the documents were transformed correctly
      expect(updatedTab?.documents[0].path).toBe('doc1.md');
      expect(updatedTab?.documents[0].metadata.similarityScore).toBe(0.95);
      expect(updatedTab?.loading).toBe(false);
      expect(updatedTab?.error).toBeNull();
    });
    
    it('should handle similarity search errors gracefully', async () => {
      const mockTab = {
        id: 'tab-1',
        vaultId: 'test-vault',
        name: 'Test Vault',
        documents: [],
        searchQuery: '',
        searchMode: 'similarity' as const,
        loading: false,
        error: null
      };
      
      useDocumentStore.setState({
        vaults: [{ id: 'test-vault', name: 'Test Vault', status: 'ready' }],
        tabs: [mockTab],
        activeTabId: 'tab-1'
      });
      
      // Mock fetch to return 501 (not configured)
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 501,
        statusText: 'Not Implemented',
        json: async () => ({
          error: 'Similarity search is not configured',
          message: 'To enable similarity search, add a similarity configuration to the vault'
        })
      });
      
      const { result } = renderHook(() => useDocumentStore());
      
      await act(async () => {
        await result.current.performSimilaritySearch('tab-1', 'test query');
      });
      
      const updatedTab = result.current.tabs.find(t => t.id === 'tab-1');
      expect(updatedTab?.loading).toBe(false);
      expect(updatedTab?.error).toContain('Similarity search');
      expect(updatedTab?.documents).toEqual([]);
    });
    
    it('should switch search modes and trigger appropriate search', async () => {
      const mockTab = {
        id: 'tab-1',
        vaultId: 'test-vault',
        name: 'Test Vault',
        documents: [],
        searchQuery: 'existing query',
        searchMode: 'text' as const,
        loading: false,
        error: null
      };
      
      useDocumentStore.setState({
        vaults: [{ id: 'test-vault', name: 'Test Vault', status: 'ready' }],
        tabs: [mockTab],
        activeTabId: 'tab-1'
      });
      
      // Mock successful similarity search
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });
      
      const { result } = renderHook(() => useDocumentStore());
      
      // Switch to similarity mode
      await act(async () => {
        result.current.setSearchMode('tab-1', 'similarity');
      });
      
      // Should update the search mode
      const updatedTab = result.current.tabs.find(t => t.id === 'tab-1');
      expect(updatedTab?.searchMode).toBe('similarity');
      
      // Should trigger similarity search if there's an existing query
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/similarity/search'),
        expect.any(Object)
      );
    });
    
    it('should not trigger search when switching modes without a query', async () => {
      const mockTab = {
        id: 'tab-1',
        vaultId: 'test-vault',
        name: 'Test Vault',
        documents: [],
        searchQuery: '', // Empty query
        searchMode: 'text' as const,
        loading: false,
        error: null
      };
      
      useDocumentStore.setState({
        vaults: [{ id: 'test-vault', name: 'Test Vault', status: 'ready' }],
        tabs: [mockTab],
        activeTabId: 'tab-1'
      });
      
      const { result } = renderHook(() => useDocumentStore());
      
      // Switch to similarity mode
      await act(async () => {
        result.current.setSearchMode('tab-1', 'similarity');
      });
      
      // Should update the mode but not trigger search
      const updatedTab = result.current.tabs.find(t => t.id === 'tab-1');
      expect(updatedTab?.searchMode).toBe('similarity');
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('should properly format similarity search results', async () => {
      const mockTab = {
        id: 'tab-1',
        vaultId: 'test-vault',
        name: 'Test Vault',
        documents: [],
        searchQuery: '',
        searchMode: 'similarity' as const,
        loading: false,
        error: null
      };
      
      useDocumentStore.setState({
        vaults: [{ id: 'test-vault', name: 'Test Vault', status: 'ready' }],
        tabs: [mockTab],
        activeTabId: 'tab-1'
      });
      
      // Mock response with similarity scores
      const mockResponse = {
        vaultId: 'test-vault',
        query: 'test query',
        results: [
          {
            path: 'best-match.md',
            score: 0.98,
            content: 'Content snippet...',
            metadata: {
              title: 'Best Match',
              modified: '2024-01-01T12:00:00Z',
              size: 1500
            }
          }
        ]
      };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResponse.results })
      });
      
      const { result } = renderHook(() => useDocumentStore());
      
      await act(async () => {
        await result.current.performSimilaritySearch('tab-1', 'test query');
      });
      
      const updatedTab = result.current.tabs.find(t => t.id === 'tab-1');
      
      // Documents should be properly formatted
      expect(updatedTab?.documents).toBeDefined();
      expect(updatedTab?.documents.length).toBeGreaterThan(0);
      
      // Check that results are stored correctly
      if (updatedTab?.documents[0]) {
        const firstDoc = updatedTab.documents[0];
        expect(firstDoc).toHaveProperty('path');
        expect(firstDoc).toHaveProperty('metadata');
      }
    });
  });
  
  describe('updateSearch with similarity mode', () => {
    it('should trigger similarity search when in similarity mode', async () => {
      const mockTab = {
        id: 'tab-1',
        vaultId: 'test-vault',
        name: 'Test Vault',
        documents: [],
        searchQuery: '',
        searchMode: 'similarity' as const,
        loading: false,
        error: null
      };
      
      useDocumentStore.setState({
        vaults: [{ id: 'test-vault', name: 'Test Vault', status: 'ready' }],
        tabs: [mockTab],
        activeTabId: 'tab-1'
      });
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });
      
      const { result } = renderHook(() => useDocumentStore());
      
      await act(async () => {
        result.current.updateSearch('tab-1', 'new similarity query');
      });
      
      // Should call similarity endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/vaults/test-vault/similarity/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ query: 'new similarity query', limit: 500 })
        })
      );
    });
    
    it('should trigger text search when in text mode', async () => {
      const mockTab = {
        id: 'tab-1',
        vaultId: 'test-vault',
        name: 'Test Vault',
        documents: [],
        searchQuery: '',
        searchMode: 'text' as const,
        loading: false,
        error: null
      };
      
      useDocumentStore.setState({
        vaults: [{ id: 'test-vault', name: 'Test Vault', status: 'ready' }],
        tabs: [mockTab],
        activeTabId: 'tab-1'
      });
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: [] })
      });
      
      const { result } = renderHook(() => useDocumentStore());
      
      await act(async () => {
        result.current.updateSearch('tab-1', 'text search query');
      });
      
      // Should call documents endpoint with query param
      expect(global.fetch).toHaveBeenCalled();
      const calledUrl = (global.fetch as any).mock.calls[0][0];
      expect(calledUrl).toContain('/api/vaults/test-vault/documents');
      // URLSearchParams encodes spaces as + by default
      expect(calledUrl).toContain('q=text+search+query');
    });
  });
});