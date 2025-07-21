import { describe, it, expect, beforeAll } from 'vitest';

describe('API Integration', () => {
  let baseUrl;
  
  beforeAll(() => {
    // In tests, we'll use the actual API server URL
    baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  });

  describe('fetchDocuments', () => {
    it('should fetch documents from API', async () => {
      // Simple fetch test - no mocks!
      const response = await fetch(`${baseUrl}/api/documents`);
      const data = await response.json();
      
      expect(response.ok).toBe(true);
      expect(data).toHaveProperty('documents');
      expect(data).toHaveProperty('total');
      expect(Array.isArray(data.documents)).toBe(true);
    });
  });
});