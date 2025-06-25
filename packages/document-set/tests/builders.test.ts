import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import {
  fromDocuments,
  fromTable,
} from '../src/index.js';
import type { Document } from '@mmt/entities';

describe('builders', () => {
  // Helper to create test documents
  const createTestDocuments = (count: number): Document[] => {
    return Array.from({ length: count }, (_, i) => ({
      path: `/vault/doc${i}.md`,
      content: `Content ${i}`,
      metadata: {
        name: `doc${i}`,
        modified: new Date(2024, 0, i + 1),
        size: 100 + i,
        frontmatter: { index: i },
        tags: i % 2 === 0 ? ['even'] : ['odd'],
        links: [],
      },
    }));
  };
  
  describe('fromDocuments', () => {
    it('should create DocumentSet from document array', async () => {
      const docs = createTestDocuments(10);
      const docSet = await fromDocuments(docs);
      
      expect(docSet.size).toBe(10);
      expect(docSet.isEmpty).toBe(false);
      expect(docSet.wasTruncated).toBe(false);
      expect(docSet.isMaterialized).toBe(false);
    });
    
    it('should enforce default limit of 500', async () => {
      const docs = createTestDocuments(501);
      
      await expect(fromDocuments(docs)).rejects.toThrow(
        'Document array contains 501 documents, exceeding the limit of 500'
      );
    });
    
    it('should allow overriding limit', async () => {
      const docs = createTestDocuments(600);
      const docSet = await fromDocuments(docs, {
        limit: 500,
        overrideLimit: true,
      });
      
      expect(docSet.size).toBe(600);
    });
    
    it('should materialize when requested', async () => {
      const docs = createTestDocuments(5);
      const docSet = await fromDocuments(docs, {
        materialize: true,
      });
      
      expect(docSet.isMaterialized).toBe(true);
      expect(docSet.documents).toHaveLength(5);
    });
    
    it('should handle custom limits', async () => {
      const docs = createTestDocuments(50);
      const docSet = await fromDocuments(docs, {
        limit: 25,
        overrideLimit: true,
      });
      
      expect(docSet.size).toBe(50);
      expect(docSet.limit).toBe(25);
      expect(docSet.wasTruncated).toBe(true);
    });
  });
  
  describe('fromTable', () => {
    it('should create DocumentSet from Arquero table', async () => {
      const rows = Array.from({ length: 10 }, (_, i) => ({
        path: `/test/doc${i}.md`,
        name: `doc${i}`,
        modified: new Date().toISOString(),
        size: 100 + i,
        fm_index: i,
        tags: i % 2 === 0 ? 'even' : 'odd',
        tags_count: 1,
      }));
      const table = aq.from(rows);
      
      const docSet = await fromTable(table);
      
      expect(docSet.size).toBe(10);
      expect(docSet.metadata.fields).toContain('path');
      expect(docSet.metadata.fields).toContain('fm_index');
    });
    
    it('should preserve source query and execution time', async () => {
      const table = aq.from([{ path: '/test.md', name: 'test' }]);
      const sourceQuery = { conditions: [] };
      
      const docSet = await fromTable(table, {
        sourceQuery,
        executionTime: 100,
      });
      
      expect(docSet.sourceQuery).toBe(sourceQuery);
      expect(docSet.metadata.queryExecutionTime).toBe(100);
    });
    
    it('should apply limit to table', async () => {
      const rows = Array.from({ length: 100 }, (_, i) => ({
        path: `/test/doc${i}.md`,
        name: `doc${i}`,
      }));
      const table = aq.from(rows);
      
      const docSet = await fromTable(table, { limit: 50 });
      
      expect(docSet.size).toBe(50);
      expect(docSet.wasTruncated).toBe(false);
    });
  });
});