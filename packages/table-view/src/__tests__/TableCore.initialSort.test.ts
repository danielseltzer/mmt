import { describe, it, expect, vi } from 'vitest';
import { TableCore } from '../core/TableCore';
import type { Document } from '../core/types';

describe('TableCore - Initial Sort by Modified Date', () => {
  const createTestDocument = (
    path: string, 
    name: string, 
    modified: Date | string | undefined,
    size: number = 1024
  ): Document => ({
    path,
    fullPath: path,
    content: '',
    metadata: {
      name,
      size,
      modified: modified as any, // Allow both Date and string
      frontmatter: {},
      tags: [],
      links: [],
    },
  });

  const testDocuments: Document[] = [
    createTestDocument('/path/oldest.md', 'oldest.md', new Date('2024-01-01T10:00:00Z')),
    createTestDocument('/path/middle.md', 'middle.md', new Date('2024-06-15T14:30:00Z')),
    createTestDocument('/path/newest.md', 'newest.md', new Date('2024-12-25T08:00:00Z')),
    createTestDocument('/path/another.md', 'another.md', new Date('2024-09-10T12:00:00Z')),
  ];

  describe('Default Initial Sort', () => {
    it('should default to sorting by modified date descending when no initialSort is provided', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // Should have default sort state
      const sortState = core.getSorting();
      expect(sortState).not.toBeNull();
      expect(sortState?.field).toBe('modified');
      expect(sortState?.order).toBe('desc');
    });

    it('should return documents sorted by modified date (newest first) by default', () => {
      const core = new TableCore({ documents: testDocuments });
      
      const sorted = core.getSortedDocuments();
      
      // Documents should be sorted newest to oldest
      expect(sorted[0].metadata.name).toBe('newest.md');
      expect(sorted[1].metadata.name).toBe('another.md');
      expect(sorted[2].metadata.name).toBe('middle.md');
      expect(sorted[3].metadata.name).toBe('oldest.md');
    });

    it('should respect explicit initialSort over default', () => {
      const core = new TableCore({ 
        documents: testDocuments,
        initialSort: { field: 'name', order: 'asc' }
      });
      
      const sortState = core.getSorting();
      expect(sortState?.field).toBe('name');
      expect(sortState?.order).toBe('asc');
      
      const sorted = core.getSortedDocuments();
      expect(sorted[0].metadata.name).toBe('another.md');
      expect(sorted[1].metadata.name).toBe('middle.md');
      expect(sorted[2].metadata.name).toBe('newest.md');
      expect(sorted[3].metadata.name).toBe('oldest.md');
    });

    it('should allow null initialSort to explicitly disable default sorting', () => {
      const core = new TableCore({ 
        documents: testDocuments,
        initialSort: null
      });
      
      const sortState = core.getSorting();
      expect(sortState).toBeNull();
      
      // Documents should remain in original order
      const sorted = core.getSortedDocuments();
      expect(sorted[0].metadata.name).toBe('oldest.md');
      expect(sorted[1].metadata.name).toBe('middle.md');
      expect(sorted[2].metadata.name).toBe('newest.md');
      expect(sorted[3].metadata.name).toBe('another.md');
    });

    it('should handle documents with missing or invalid dates', () => {
      const documentsWithInvalidDates: Document[] = [
        createTestDocument('/path/valid.md', 'valid.md', '2024-06-15T14:30:00Z'),
        createTestDocument('/path/no-date.md', 'no-date.md', undefined as any),
        createTestDocument('/path/invalid.md', 'invalid.md', 'not-a-date'),
        createTestDocument('/path/another-valid.md', 'another-valid.md', '2024-01-01T10:00:00Z'),
      ];
      
      const core = new TableCore({ documents: documentsWithInvalidDates });
      
      const sorted = core.getSortedDocuments();
      
      // Valid dates should be sorted correctly, invalid/missing dates should be handled gracefully
      // Typically, invalid dates would be treated as oldest or newest consistently
      expect(sorted[0].metadata.name).toBe('valid.md');
      expect(sorted[1].metadata.name).toBe('another-valid.md');
      // Invalid dates should be at the end (implementation detail)
      expect([sorted[2].metadata.name, sorted[3].metadata.name]).toContain('no-date.md');
      expect([sorted[2].metadata.name, sorted[3].metadata.name]).toContain('invalid.md');
    });

  });

  describe('Sort Indicator State', () => {
    it('should indicate sort state for default modified sort', () => {
      const core = new TableCore({ documents: testDocuments });
      
      const state = core.getState();
      expect(state.sorting).toEqual({ field: 'modified', order: 'desc' });
    });

    it.skip('should toggle sort order between desc and asc', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // Initial state: modified desc (default)
      expect(core.getSorting()).toEqual({ field: 'modified', order: 'desc' });
      
      // First toggle: modified asc (since we're already on desc)
      core.toggleSort('modified');
      expect(core.getSorting()).toEqual({ field: 'modified', order: 'asc' });
      
      // Second toggle: modified desc
      core.toggleSort('modified');
      expect(core.getSorting()).toEqual({ field: 'modified', order: 'desc' });
      
      // Third toggle: back to asc (cycles between asc and desc)
      core.toggleSort('modified');
      expect(core.getSorting()).toEqual({ field: 'modified', order: 'asc' });
    });

    it('should switch to new field when different column is sorted', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // Start with default: modified desc
      expect(core.getSorting()).toEqual({ field: 'modified', order: 'desc' });
      
      // Click on name column
      core.toggleSort('name');
      expect(core.getSorting()).toEqual({ field: 'name', order: 'asc' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty document list', () => {
      const core = new TableCore({ documents: [] });
      
      const sortState = core.getSorting();
      expect(sortState).toEqual({ field: 'modified', order: 'desc' });
      
      const sorted = core.getSortedDocuments();
      expect(sorted).toEqual([]);
    });

    it('should handle documents with same modified date', () => {
      const sameDate = '2024-06-15T14:30:00Z';
      const documentsWithSameDate: Document[] = [
        createTestDocument('/path/b.md', 'b.md', sameDate),
        createTestDocument('/path/a.md', 'a.md', sameDate),
        createTestDocument('/path/c.md', 'c.md', sameDate),
      ];
      
      const core = new TableCore({ documents: documentsWithSameDate });
      
      const sorted = core.getSortedDocuments();
      // All have same date, so order should be stable (same as input)
      expect(sorted.map(d => d.metadata.name)).toEqual(['b.md', 'a.md', 'c.md']);
    });
  });
});