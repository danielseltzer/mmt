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
      // GIVEN: An array of Document objects
      // WHEN: Creating a DocumentSet using fromDocuments()
      // THEN: Returns DocumentSet with all documents in table format
      const docs = createTestDocuments(10);
      const docSet = await fromDocuments(docs);
      
      expect(docSet.size).toBe(10);
      expect(docSet.isEmpty).toBe(false);
      expect(docSet.wasTruncated).toBe(false);
      expect(docSet.isMaterialized).toBe(false);
    });
    
    it('should enforce default limit of 500', async () => {
      // GIVEN: An array with more than 500 documents
      // WHEN: Creating DocumentSet without overriding limit
      // THEN: Throws error to prevent accidental large datasets
      const docs = createTestDocuments(501);
      
      await expect(fromDocuments(docs)).rejects.toThrow(
        'Document array contains 501 documents, exceeding the limit of 500'
      );
    });
    
    it('should allow overriding limit', async () => {
      // GIVEN: 600 documents and explicit override flag
      // WHEN: Creating DocumentSet with overrideLimit: true
      // THEN: Allows creation despite exceeding default limit
      const docs = createTestDocuments(600);
      const docSet = await fromDocuments(docs, {
        limit: 500,
        overrideLimit: true,
      });
      
      expect(docSet.size).toBe(600);
    });
    
    it('should materialize when requested', async () => {
      // GIVEN: Documents and materialize option
      // WHEN: Creating DocumentSet with materialize: true
      // THEN: Immediately converts to Document array (eager loading)
      const docs = createTestDocuments(5);
      const docSet = await fromDocuments(docs, {
        materialize: true,
      });
      
      expect(docSet.isMaterialized).toBe(true);
      expect(docSet.documents).toHaveLength(5);
    });
    
    it('should handle custom limits', async () => {
      // GIVEN: 50 documents with custom limit of 25
      // WHEN: Creating DocumentSet with lower limit
      // THEN: Tracks truncation but includes all documents
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
      // GIVEN: An Arquero table with document-like rows
      // WHEN: Creating DocumentSet using fromTable()
      // THEN: Wraps table in DocumentSet with metadata
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
      // GIVEN: A table with associated query context
      // WHEN: Creating DocumentSet with metadata
      // THEN: Preserves query history and performance metrics
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
      // GIVEN: A table with 100 rows and limit of 50
      // WHEN: Creating DocumentSet with limit option
      // THEN: Returns first 50 rows without marking as truncated
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