import { describe, it, expect } from 'vitest';
import { TableCore } from '../core/TableCore';
import type { Document } from '../core/types';

describe('TableCore', () => {
  const createTestDocument = (path: string, name: string, size: number = 1024): Document => ({
    path,
    fullPath: path,
    content: '',
    metadata: {
      name,
      size,
      modified: new Date('2024-01-01'),
      frontmatter: {},
      tags: [],
      links: [],
    },
  });

  const testDocuments: Document[] = [
    createTestDocument('/path/to/file1.md', 'file1.md', 1024),
    createTestDocument('/path/to/file2.md', 'file2.md', 2048),
    createTestDocument('/path/to/file3.md', 'file3.md', 512),
  ];

  describe('Document Management', () => {
    it('should initialize with documents', () => {
      const core = new TableCore({ documents: testDocuments });
      expect(core.getDocuments()).toEqual(testDocuments);
    });

    it('should update documents', () => {
      const core = new TableCore({ documents: testDocuments });
      const newDocs = [createTestDocument('/new/file.md', 'new.md')];
      core.updateDocuments(newDocs);
      expect(core.getDocuments()).toEqual(newDocs);
    });

    it('should find document by id', () => {
      const core = new TableCore({ documents: testDocuments });
      const doc = core.getDocumentById('/path/to/file1.md');
      expect(doc).toEqual(testDocuments[0]);
    });
  });

  describe('Selection Management', () => {
    it('should toggle row selection', () => {
      const core = new TableCore({ documents: testDocuments });
      
      expect(core.isRowSelected('/path/to/file1.md')).toBe(false);
      
      core.toggleRowSelection('/path/to/file1.md');
      expect(core.isRowSelected('/path/to/file1.md')).toBe(true);
      
      core.toggleRowSelection('/path/to/file1.md');
      expect(core.isRowSelected('/path/to/file1.md')).toBe(false);
    });

    it('should select all documents', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.selectAll();
      expect(core.getSelectedPaths()).toHaveLength(3);
      expect(core.isAllSelected()).toBe(true);
    });

    it('should deselect all documents', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.selectAll();
      core.deselectAll();
      expect(core.getSelectedPaths()).toHaveLength(0);
      expect(core.isAllSelected()).toBe(false);
    });

    it('should select range of documents', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.selectRange(0, 2);
      expect(core.getSelectedPaths()).toHaveLength(3);
      expect(core.isRowSelected('/path/to/file1.md')).toBe(true);
      expect(core.isRowSelected('/path/to/file2.md')).toBe(true);
      expect(core.isRowSelected('/path/to/file3.md')).toBe(true);
    });

    it('should handle shift-click selection', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // First click
      core.handleRowClick(0, false);
      expect(core.getSelectedPaths()).toEqual(['/path/to/file1.md']);
      
      // Shift-click to select range
      core.handleRowClick(2, true);
      expect(core.getSelectedPaths()).toHaveLength(3);
    });

    it('should notify selection changes', () => {
      let selectedPaths: string[] = [];
      const core = new TableCore({ 
        documents: testDocuments,
        onSelectionChange: (paths) => { selectedPaths = paths; }
      });
      
      core.selectRow('/path/to/file1.md');
      expect(selectedPaths).toEqual(['/path/to/file1.md']);
    });
  });

  describe('Sorting', () => {
    it('should set sorting state', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.setSorting('name', 'asc');
      expect(core.getSorting()).toEqual({ field: 'name', order: 'asc' });
      
      core.setSorting('name', 'desc');
      expect(core.getSorting()).toEqual({ field: 'name', order: 'desc' });
      
      core.setSorting(null);
      expect(core.getSorting()).toBeNull();
    });

    it('should toggle sort order', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // First click - ascending
      core.toggleSort('name');
      expect(core.getSorting()).toEqual({ field: 'name', order: 'asc' });
      
      // Second click - descending
      core.toggleSort('name');
      expect(core.getSorting()).toEqual({ field: 'name', order: 'desc' });
      
      // Third click - clear
      core.toggleSort('name');
      expect(core.getSorting()).toBeNull();
    });

    it('should sort documents by name', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.setSorting('name', 'asc');
      const sorted = core.getSortedDocuments();
      expect(sorted[0].metadata.name).toBe('file1.md');
      expect(sorted[1].metadata.name).toBe('file2.md');
      expect(sorted[2].metadata.name).toBe('file3.md');
    });

    it('should sort documents by size', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.setSorting('size', 'asc');
      const sorted = core.getSortedDocuments();
      expect(sorted[0].metadata.size).toBe(512);
      expect(sorted[1].metadata.size).toBe(1024);
      expect(sorted[2].metadata.size).toBe(2048);
    });

    it('should notify sort changes', () => {
      let sortField = '';
      let sortOrder: 'asc' | 'desc' = 'asc';
      
      const core = new TableCore({ 
        documents: testDocuments,
        onSortChange: (field, order) => {
          sortField = field;
          sortOrder = order;
        }
      });
      
      core.setSorting('name', 'desc');
      expect(sortField).toBe('name');
      expect(sortOrder).toBe('desc');
    });
  });

  describe('Column Visibility', () => {
    it('should manage column visibility', () => {
      const core = new TableCore({ 
        documents: testDocuments,
        initialColumns: ['name', 'path']
      });
      
      expect(core.isColumnVisible('name')).toBe(true);
      expect(core.isColumnVisible('path')).toBe(true);
      expect(core.isColumnVisible('size')).toBe(false);
      
      core.setColumnVisibility('size', true);
      expect(core.isColumnVisible('size')).toBe(true);
      
      core.toggleColumnVisibility('name');
      expect(core.isColumnVisible('name')).toBe(false);
    });

    it('should return visible columns', () => {
      const core = new TableCore({ 
        documents: testDocuments,
        initialColumns: ['name', 'path', 'modified']
      });
      
      expect(core.getVisibleColumns()).toContain('name');
      expect(core.getVisibleColumns()).toContain('path');
      expect(core.getVisibleColumns()).toContain('modified');
      expect(core.getVisibleColumns()).toHaveLength(3);
    });
  });

  describe('Column Sizing', () => {
    it('should manage column sizes', () => {
      const core = new TableCore({ documents: testDocuments });
      
      expect(core.getColumnSize('name')).toBe(100); // default
      
      core.setColumnSize('name', 200);
      expect(core.getColumnSize('name')).toBe(200);
      
      expect(core.getColumnSize('path', 300)).toBe(300); // with custom default
    });
  });

  describe('Operations', () => {
    it('should request operations with selected documents', () => {
      let requestedOperation = '';
      let requestedPaths: string[] = [];
      
      const core = new TableCore({ 
        documents: testDocuments,
        onOperationRequest: (request) => {
          requestedOperation = request.operation;
          requestedPaths = request.documentPaths;
        }
      });
      
      core.selectRow('/path/to/file1.md');
      core.selectRow('/path/to/file2.md');
      core.requestOperation('delete');
      
      expect(requestedOperation).toBe('delete');
      expect(requestedPaths).toEqual(['/path/to/file1.md', '/path/to/file2.md']);
    });
  });

  describe('State Management', () => {
    it('should return immutable state snapshot', () => {
      const core = new TableCore({ 
        documents: testDocuments,
        initialColumns: ['name', 'path']
      });
      
      core.selectRow('/path/to/file1.md');
      core.setSorting('name', 'asc');
      
      const state = core.getState();
      expect(state.selectedRows.has('/path/to/file1.md')).toBe(true);
      expect(state.sorting).toEqual({ field: 'name', order: 'asc' });
      expect(state.visibleColumns.has('name')).toBe(true);
      
      // Modifying returned state should not affect core
      state.selectedRows.clear();
      expect(core.isRowSelected('/path/to/file1.md')).toBe(true);
    });
  });
});