import { describe, it, expect } from 'vitest';
import {
  DocumentToIndexSchema,
  SearchOptionsSchema,
  SearchResultSchema,
  IndexingResultSchema,
  SimilarityStatusSchema,
  SimilarityConfigSchema
} from '../types';

describe('Type Schemas', () => {
  describe('DocumentToIndexSchema', () => {
    it('should validate correct document', () => {
      const doc = {
        id: 'doc1',
        path: '/test/doc.md',
        content: 'Test content'
      };
      
      const result = DocumentToIndexSchema.safeParse(doc);
      expect(result.success).toBe(true);
    });
    
    it('should accept optional fields', () => {
      const doc = {
        id: 'doc1',
        path: '/test/doc.md',
        content: 'Test content',
        embedding: [0.1, 0.2, 0.3],
        metadata: { tags: ['test'], author: 'user' }
      };
      
      const result = DocumentToIndexSchema.safeParse(doc);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid document', () => {
      const doc = {
        id: 'doc1',
        // missing required fields
      };
      
      const result = DocumentToIndexSchema.safeParse(doc);
      expect(result.success).toBe(false);
    });
  });
  
  describe('SearchOptionsSchema', () => {
    it('should provide defaults', () => {
      const result = SearchOptionsSchema.parse({});
      expect(result.limit).toBe(10);
      expect(result.threshold).toBe(0.2);
    });
    
    it('should accept custom values', () => {
      const options = {
        limit: 20,
        threshold: 0.5,
        filter: { tag: 'important' }
      };
      
      const result = SearchOptionsSchema.parse(options);
      expect(result.limit).toBe(20);
      expect(result.threshold).toBe(0.5);
      expect(result.filter).toEqual({ tag: 'important' });
    });
  });
  
  describe('SearchResultSchema', () => {
    it('should validate search result', () => {
      const result = {
        id: 'doc1',
        path: '/test/doc.md',
        score: 0.95
      };
      
      const parsed = SearchResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
    
    it('should accept optional content and metadata', () => {
      const result = {
        id: 'doc1',
        path: '/test/doc.md',
        score: 0.95,
        content: 'Preview text...',
        metadata: { highlight: true }
      };
      
      const parsed = SearchResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });
  
  describe('IndexingResultSchema', () => {
    it('should validate indexing result', () => {
      const result = {
        successful: 10,
        failed: 2,
        errors: [
          {
            documentId: 'doc1',
            path: '/test/doc1.md',
            error: 'Failed to generate embedding'
          }
        ]
      };
      
      const parsed = IndexingResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });
  
  describe('SimilarityStatusSchema', () => {
    it('should validate status', () => {
      const status = {
        ready: true,
        documentCount: 100,
        provider: 'qdrant'
      };
      
      const parsed = SimilarityStatusSchema.safeParse(status);
      expect(parsed.success).toBe(true);
    });
    
    it('should accept optional fields', () => {
      const status = {
        ready: false,
        documentCount: 0,
        provider: 'orama',
        lastIndexed: new Date(),
        error: 'Connection failed'
      };
      
      const parsed = SimilarityStatusSchema.safeParse(status);
      expect(parsed.success).toBe(true);
    });
  });
  
  describe('SimilarityConfigSchema', () => {
    it('should provide default provider', () => {
      const config = {};
      const parsed = SimilarityConfigSchema.parse(config);
      expect(parsed.provider).toBe('orama');
    });
    
    it('should accept Qdrant configuration', () => {
      const config = {
        provider: 'qdrant',
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        qdrant: {
          url: 'http://localhost:6333',
          collectionName: 'my-documents',
          onDisk: true
        }
      };
      
      const parsed = SimilarityConfigSchema.parse(config);
      expect(parsed.provider).toBe('qdrant');
      expect(parsed.qdrant?.collectionName).toBe('my-documents');
      expect(parsed.qdrant?.onDisk).toBe(true);
    });
    
    it('should accept Orama configuration', () => {
      const config = {
        provider: 'orama',
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        orama: {
          indexFilename: 'custom-index.msp',
          maxDepth: 200
        }
      };
      
      const parsed = SimilarityConfigSchema.parse(config);
      expect(parsed.provider).toBe('orama');
      expect(parsed.orama?.indexFilename).toBe('custom-index.msp');
      expect(parsed.orama?.maxDepth).toBe(200);
    });
    
    it('should provide defaults for provider configs', () => {
      const config = {
        provider: 'qdrant',
        qdrant: {}
      };
      
      const parsed = SimilarityConfigSchema.parse(config);
      expect(parsed.qdrant?.url).toBe('http://localhost:6333');
      expect(parsed.qdrant?.collectionName).toBe('documents');
      expect(parsed.qdrant?.onDisk).toBe(false);
    });
  });
});