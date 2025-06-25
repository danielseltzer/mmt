import { describe, it, expect } from 'vitest';
import * as aq from 'arquero';
import { DocumentSet } from '../src/document-set.js';
import type { Document } from '@mmt/entities';

describe('DocumentSet', () => {
  // Helper to create test documents
  const createTestDocuments = (count: number): Document[] => {
    return Array.from({ length: count }, (_, i) => ({
      path: `/test/doc${i}.md`,
      content: `Content ${i}`,
      metadata: {
        name: `doc${i}`,
        modified: new Date(2024, 0, i + 1),
        size: 100 + i,
        frontmatter: { index: i, type: i % 2 === 0 ? 'even' : 'odd' },
        tags: i % 3 === 0 ? ['important'] : [],
        links: [],
      },
    }));
  };
  
  // Helper to create test table
  const createTestTable = (docs: Document[]) => {
    const rows = docs.map(doc => ({
      path: doc.path,
      name: doc.metadata.name,
      modified: doc.metadata.modified.toISOString(),
      size: doc.metadata.size,
      tags: doc.metadata.tags.join(', '),
      tags_count: doc.metadata.tags.length,
      fm_index: doc.metadata.frontmatter.index,
      fm_type: doc.metadata.frontmatter.type,
    }));
    return aq.from(rows);
  };
  
  describe('constructor', () => {
    it('should create a DocumentSet from a table', () => {
      const docs = createTestDocuments(10);
      const table = createTestTable(docs);
      
      const docSet = new DocumentSet({
        tableRef: table,
      });
      
      expect(docSet._type).toBe('DocumentSet');
      expect(docSet.documentCount).toBe(10);
      expect(docSet.size).toBe(10);
      expect(docSet.limit).toBe(500);
      expect(docSet.metadata.isComplete).toBe(true);
      expect(docSet.metadata.fields).toContain('path');
      expect(docSet.metadata.fields).toContain('name');
    });
    
    it('should track execution time and source query', () => {
      const table = createTestTable(createTestDocuments(5));
      const sourceQuery = { conditions: [{ field: 'tag', operator: 'equals' as const, value: 'test' }] };
      
      const docSet = new DocumentSet({
        tableRef: table,
        sourceQuery,
        executionTime: 42,
      });
      
      expect(docSet.sourceQuery).toEqual(sourceQuery);
      expect(docSet.metadata.queryExecutionTime).toBe(42);
    });
    
    it('should mark as incomplete when over limit', () => {
      const docs = createTestDocuments(10);
      const table = createTestTable(docs);
      
      const docSet = new DocumentSet({
        tableRef: table,
        limit: 5,
      });
      
      expect(docSet.documentCount).toBe(10);
      expect(docSet.limit).toBe(5);
      expect(docSet.metadata.isComplete).toBe(false);
      expect(docSet.wasTruncated).toBe(true);
    });
  });
  
  describe('properties', () => {
    it('should correctly report isEmpty', () => {
      const emptyTable = aq.from([]);
      const emptySet = new DocumentSet({ tableRef: emptyTable });
      expect(emptySet.isEmpty).toBe(true);
      
      const table = createTestTable(createTestDocuments(1));
      const nonEmptySet = new DocumentSet({ tableRef: table });
      expect(nonEmptySet.isEmpty).toBe(false);
    });
    
    it('should track materialization state', () => {
      const table = createTestTable(createTestDocuments(5));
      const docSet = new DocumentSet({ tableRef: table });
      
      expect(docSet.isMaterialized).toBe(false);
      expect(docSet.documents).toBeUndefined();
    });
  });
  
  describe('materialize', () => {
    it('should materialize documents from table', async () => {
      const originalDocs = createTestDocuments(3);
      const table = createTestTable(originalDocs);
      const docSet = new DocumentSet({ tableRef: table });
      
      const materialized = await docSet.materialize();
      
      expect(materialized).toHaveLength(3);
      expect(docSet.isMaterialized).toBe(true);
      expect(docSet.documents).toBe(materialized);
      
      // Check first document
      const firstDoc = materialized[0];
      expect(firstDoc.path).toBe('/test/doc0.md');
      expect(firstDoc.metadata.name).toBe('doc0');
      expect(firstDoc.metadata.size).toBe(100);
      expect(firstDoc.metadata.frontmatter.index).toBe(0);
      expect(firstDoc.metadata.frontmatter.type).toBe('even');
      expect(firstDoc.metadata.tags).toEqual(['important']);
    });
    
    it('should return cached documents on subsequent calls', async () => {
      const table = createTestTable(createTestDocuments(2));
      const docSet = new DocumentSet({ tableRef: table });
      
      const first = await docSet.materialize();
      const second = await docSet.materialize();
      
      expect(first).toBe(second);
    });
    
    it('should parse tags and links from strings', async () => {
      const rows = [{
        path: '/test/doc.md',
        name: 'doc',
        modified: new Date().toISOString(),
        size: 100,
        tags: 'tag1, tag2, tag3',
        tags_count: 3,
        links: 'link1, link2',
        links_count: 2,
        backlinks: 'back1, back2',
        backlinks_count: 2,
      }];
      const table = aq.from(rows);
      const docSet = new DocumentSet({ tableRef: table });
      
      const docs = await docSet.materialize();
      
      expect(docs[0].metadata.tags).toEqual(['tag1', 'tag2', 'tag3']);
      expect(docs[0].metadata.links).toEqual(['link1', 'link2']);
      expect(docs[0].metadata.backlinks).toEqual(['back1', 'back2']);
    });
  });
  
  describe('withTable', () => {
    it('should create new DocumentSet with different table', () => {
      const originalTable = createTestTable(createTestDocuments(10));
      const original = new DocumentSet({
        tableRef: originalTable,
        sourceQuery: { conditions: [] },
        executionTime: 50,
      });
      
      const filteredTable = originalTable.filter((d: any) => d.fm_type === 'even');
      const filtered = original.withTable(filteredTable);
      
      expect(filtered).not.toBe(original);
      expect(filtered.documentCount).toBe(5);
      expect(filtered.sourceQuery).toBe(original.sourceQuery);
      expect(filtered.metadata.queryExecutionTime).toBe(50);
    });
  });
  
  describe('withLimit', () => {
    it('should create new DocumentSet with limited rows', () => {
      const table = createTestTable(createTestDocuments(10));
      const original = new DocumentSet({ tableRef: table });
      
      const limited = original.withLimit(3);
      
      expect(limited).not.toBe(original);
      expect(limited.documentCount).toBe(3);
      expect(limited.limit).toBe(3);
      expect(limited.metadata.isComplete).toBe(true);
    });
  });
});