import { describe, it, expect, vi } from 'vitest';
import * as aq from 'arquero';
import {
  fromDocuments,
  fromTable,
  fromQuery,
} from '../src/index.js';
import type { Document } from '@mmt/entities';
import type { VaultIndexer, PageMetadata } from '@mmt/indexer';
import { QueryParser } from '@mmt/query-parser';

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
  
  describe('fromQuery', () => {
    // Mock indexer
    const createMockIndexer = (results: PageMetadata[]): VaultIndexer => ({
      query: vi.fn().mockResolvedValue(results),
      getOutgoingLinks: vi.fn().mockResolvedValue([]),
      getBacklinks: vi.fn().mockResolvedValue([]),
    } as any);
    
    const createMockMetadata = (count: number): PageMetadata[] => {
      return Array.from({ length: count }, (_, i) => ({
        path: `/vault/doc${i}.md`,
        relativePath: `doc${i}.md`,
        basename: `doc${i}`,
        mtime: Date.now(),
        size: 100 + i,
        frontmatter: { index: i },
        tags: [`tag${i}`],
      } as PageMetadata));
    };
    
    it('should create DocumentSet from query object', async () => {
      const metadata = createMockMetadata(10);
      const indexer = createMockIndexer(metadata);
      const query = { conditions: [{ field: 'tag', operator: 'equals' as const, value: 'test' }] };
      
      const docSet = await fromQuery(query, indexer);
      
      expect(docSet.size).toBe(10);
      expect(docSet.sourceQuery).toBe(query);
      expect(indexer.query).toHaveBeenCalledWith(query);
    });
    
    it('should parse string queries', async () => {
      const metadata = createMockMetadata(5);
      const indexer = createMockIndexer(metadata);
      const queryParser = new QueryParser();
      
      const docSet = await fromQuery('tag:important', indexer, queryParser);
      
      expect(docSet.size).toBe(5);
      expect(indexer.query).toHaveBeenCalled();
    });
    
    it('should enforce query result limit', async () => {
      const metadata = createMockMetadata(600);
      const indexer = createMockIndexer(metadata);
      const query = { conditions: [] };
      
      await expect(fromQuery(query, indexer)).rejects.toThrow(
        'Query returned 600 documents, exceeding the limit of 500'
      );
    });
    
    it('should track query execution time', async () => {
      const metadata = createMockMetadata(10);
      const indexer = createMockIndexer(metadata);
      const query = { conditions: [] };
      
      const docSet = await fromQuery(query, indexer);
      
      expect(docSet.metadata.queryExecutionTime).toBeGreaterThanOrEqual(0);
    });
    
    it('should convert metadata to documents with links', async () => {
      const metadata = createMockMetadata(1);
      const indexer = createMockIndexer(metadata);
      
      // Mock link data
      (indexer.getOutgoingLinks as any).mockResolvedValue([
        { targetPath: 'other.md', linkType: 'wiki' },
      ]);
      (indexer.getBacklinks as any).mockResolvedValue([
        { path: '/vault/referrer.md' },
      ]);
      
      const docSet = await fromQuery({ conditions: [] }, indexer, undefined, {
        materialize: true,
      });
      
      const docs = docSet.documents!;
      expect(docs[0].metadata.links).toEqual(['other.md']);
      expect(docs[0].metadata.backlinks).toEqual(['/vault/referrer.md']);
    });
  });
});