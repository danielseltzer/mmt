import { describe, it, expect } from 'vitest';
import {
  fromDocuments,
  filter,
  filters,
  limit,
  materialize,
  isMaterialized,
} from '../src/index.js';
import type { Document } from '@mmt/entities';

describe('operations', () => {
  // Helper to create test documents
  const createTestDocuments = (): Document[] => [
    {
      path: '/vault/important.md',
      content: '',
      metadata: {
        name: 'important',
        modified: new Date(2024, 0, 1),
        size: 1000,
        frontmatter: { priority: 'high', status: 'active' },
        tags: ['important', 'work'],
        links: [],
      },
    },
    {
      path: '/vault/notes/daily.md',
      content: '',
      metadata: {
        name: 'daily',
        modified: new Date(2024, 0, 15),
        size: 500,
        frontmatter: { priority: 'low', status: 'draft' },
        tags: ['daily'],
        links: [],
      },
    },
    {
      path: '/vault/archive/old.md',
      content: '',
      metadata: {
        name: 'old',
        modified: new Date(2023, 6, 1),
        size: 2000,
        frontmatter: { priority: 'low', status: 'archived' },
        tags: ['archived'],
        links: [],
      },
    },
  ];
  
  describe('filter', () => {
    it('should filter documents with custom predicate', async () => {
      // GIVEN: A DocumentSet with documents of varying sizes
      // WHEN: Filtering with custom predicate for size > 750
      // THEN: Returns new DocumentSet with only matching documents
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered = filter(docSet, (row) => row.size > 750);
      
      expect(filtered.size).toBe(2);
      expect(filtered).not.toBe(docSet); // New instance
      
      const materialized = await filtered.materialize();
      expect(materialized.map(d => d.metadata.name)).toEqual(['important', 'old']);
    });
    
    it('should work with hasTag filter', async () => {
      // GIVEN: Documents with different tags
      // WHEN: Using hasTag filter helper for 'important'
      // THEN: Returns only documents containing that tag
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered = filter(docSet, filters.hasTag('important'));
      
      expect(filtered.size).toBe(1);
      const materialized = await filtered.materialize();
      expect(materialized[0].metadata.name).toBe('important');
    });
    
    it('should work with frontmatter filter', async () => {
      // GIVEN: Documents with frontmatter priority field
      // WHEN: Filtering for priority='low'
      // THEN: Returns documents matching the frontmatter value
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered = filter(docSet, filters.frontmatter('priority', 'low'));
      
      expect(filtered.size).toBe(2);
      const materialized = await filtered.materialize();
      expect(materialized.map(d => d.metadata.name).sort()).toEqual(['daily', 'old']);
    });
    
    it('should work with sizeGreaterThan filter', async () => {
      // GIVEN: Documents with sizes 1000, 500, and 2000 bytes
      // WHEN: Filtering for size > 1500
      // THEN: Returns only the document with 2000 bytes
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered = filter(docSet, filters.sizeGreaterThan(1500));
      
      expect(filtered.size).toBe(1);
      const materialized = await filtered.materialize();
      expect(materialized[0].metadata.name).toBe('old');
    });
    
    it('should work with modifiedAfter filter', async () => {
      // GIVEN: Documents with different modification dates
      // WHEN: Filtering for documents modified after Dec 1, 2023
      // THEN: Returns only recently modified documents
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered = filter(docSet, filters.modifiedAfter(new Date(2023, 11, 1)));
      
      expect(filtered.size).toBe(2);
      const materialized = await filtered.materialize();
      expect(materialized.map(d => d.metadata.name).sort()).toEqual(['daily', 'important']);
    });
    
    it('should work with pathMatches filter', async () => {
      // GIVEN: Documents in different folders
      // WHEN: Filtering with regex for 'archive' in path
      // THEN: Returns only documents in archive folder
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered = filter(docSet, filters.pathMatches(/archive/));
      
      expect(filtered.size).toBe(1);
      const materialized = await filtered.materialize();
      expect(materialized[0].metadata.name).toBe('old');
    });
    
    it('should handle empty results', async () => {
      // GIVEN: A DocumentSet and an always-false predicate
      // WHEN: Filtering with predicate that matches nothing
      // THEN: Returns empty DocumentSet (not null or error)
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered = filter(docSet, () => false);
      
      expect(filtered.size).toBe(0);
      expect(filtered.isEmpty).toBe(true);
    });
  });
  
  describe('limit', () => {
    it('should limit document count', async () => {
      // GIVEN: A DocumentSet with 3 documents
      // WHEN: Applying limit of 2
      // THEN: Returns new set with only first 2 documents
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const limited = limit(docSet, 2);
      
      expect(limited.size).toBe(2);
      expect(limited.limit).toBe(2);
      expect(limited).not.toBe(docSet);
    });
    
    it('should return same set if already within limit', async () => {
      // GIVEN: A DocumentSet with 3 documents
      // WHEN: Applying limit of 10 (higher than count)
      // THEN: Returns same instance (optimization)
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const limited = limit(docSet, 10);
      
      expect(limited).toBe(docSet); // Same instance
    });
    
    it('should reject invalid limits', async () => {
      // GIVEN: A DocumentSet
      // WHEN: Applying limit of 0 or negative
      // THEN: Throws error (limits must be positive)
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      expect(() => limit(docSet, 0)).toThrow('Limit must be at least 1');
      expect(() => limit(docSet, -1)).toThrow('Limit must be at least 1');
    });
    
    it('should preserve document order', async () => {
      // GIVEN: Documents in specific order
      // WHEN: Applying limit of 2
      // THEN: Returns first 2 documents in original order
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const limited = limit(docSet, 2);
      const materialized = await limited.materialize();
      
      expect(materialized[0].metadata.name).toBe('important');
      expect(materialized[1].metadata.name).toBe('daily');
    });
  });
  
  describe('materialize', () => {
    it('should materialize documents', async () => {
      // GIVEN: An unmaterialized DocumentSet
      // WHEN: Calling materialize()
      // THEN: Converts table to Document array and caches result
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      expect(isMaterialized(docSet)).toBe(false);
      
      const materialized = await materialize(docSet);
      
      expect(materialized).toHaveLength(3);
      expect(isMaterialized(docSet)).toBe(true);
      expect(docSet.documents).toBe(materialized);
    });
    
    it('should preserve document data', async () => {
      // GIVEN: A DocumentSet with complete document data
      // WHEN: Materializing to Document objects
      // THEN: All metadata fields are preserved correctly
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const materialized = await materialize(docSet);
      
      const first = materialized[0];
      expect(first.path).toBe('/vault/important.md');
      expect(first.metadata.name).toBe('important');
      expect(first.metadata.size).toBe(1000);
      expect(first.metadata.frontmatter.priority).toBe('high');
      expect(first.metadata.tags).toEqual(['important', 'work']);
    });
  });
  
  describe('chaining operations', () => {
    it('should allow chaining filter and limit', async () => {
      // GIVEN: A DocumentSet
      // WHEN: Chaining filter for priority='low' then limit to 1
      // THEN: Operations compose correctly (filter first, then limit)
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const result = limit(
        filter(docSet, filters.frontmatter('priority', 'low')),
        1
      );
      
      expect(result.size).toBe(1);
      const materialized = await result.materialize();
      expect(materialized[0].metadata.name).toBe('daily');
    });
    
    it('should allow multiple filters', async () => {
      // GIVEN: A DocumentSet
      // WHEN: Applying multiple sequential filters
      // THEN: Each filter narrows the result set further
      const docs = createTestDocuments();
      const docSet = await fromDocuments(docs);
      
      const filtered1 = filter(docSet, (row) => row.size >= 500);
      const filtered2 = filter(filtered1, filters.modifiedAfter(new Date(2023, 11, 1)));
      
      expect(filtered2.size).toBe(2);
    });
  });
});