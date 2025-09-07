import { describe, it, expect, beforeEach, vi } from 'vitest';
import { API_BASE_URL, getApiEndpoint, API_ENDPOINTS } from '../src/config/api';

describe('API Configuration', () => {
  describe('getApiEndpoint', () => {
    it('should construct correct API endpoints', () => {
      // Test with leading slash
      expect(getApiEndpoint('/api/vaults')).toBe('http://localhost:3001/api/vaults');
      
      // Test without leading slash (should add it)
      expect(getApiEndpoint('api/vaults')).toBe('http://localhost:3001/api/vaults');
    });

    it('should handle nested paths correctly', () => {
      const endpoint = getApiEndpoint('/api/vaults/test-vault/documents');
      expect(endpoint).toBe('http://localhost:3001/api/vaults/test-vault/documents');
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should generate correct vault endpoints', () => {
      const vaultId = 'test-vault';
      
      expect(API_ENDPOINTS.vaults()).toBe('http://localhost:3001/api/vaults');
      expect(API_ENDPOINTS.vaultDocuments(vaultId)).toBe('http://localhost:3001/api/vaults/test-vault/documents');
      expect(API_ENDPOINTS.vaultDocumentsSearch(vaultId)).toBe('http://localhost:3001/api/vaults/test-vault/documents/search');
      expect(API_ENDPOINTS.vaultStatus(vaultId)).toBe('http://localhost:3001/api/vaults/test-vault/status');
    });

    it('should generate correct similarity endpoints', () => {
      const vaultId = 'test-vault';
      
      expect(API_ENDPOINTS.similaritySearch(vaultId)).toBe('http://localhost:3001/api/vaults/test-vault/similarity/search');
      expect(API_ENDPOINTS.similarDocuments(vaultId)).toBe('http://localhost:3001/api/vaults/test-vault/similarity/similar');
      expect(API_ENDPOINTS.similarityStatus(vaultId)).toBe('http://localhost:3001/api/vaults/test-vault/similarity/status');
    });

    it('should properly encode vault IDs with special characters', () => {
      const vaultId = 'vault with spaces';
      
      expect(API_ENDPOINTS.vaultStatus(vaultId)).toBe('http://localhost:3001/api/vaults/vault%20with%20spaces/status');
      expect(API_ENDPOINTS.similaritySearch(vaultId)).toBe('http://localhost:3001/api/vaults/vault%20with%20spaces/similarity/search');
    });

    it('should generate correct document endpoints', () => {
      const vaultId = 'test-vault';
      const path = 'folder/document.md';
      
      expect(API_ENDPOINTS.documentPreview(vaultId, path)).toBe('http://localhost:3001/api/vaults/test-vault/documents/folder%2Fdocument.md');
    });
  });

  // WebSocket tests removed - configuration now comes from server
});