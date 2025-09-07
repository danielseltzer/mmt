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

    it('should select range of documents by ID', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.selectRange('/path/to/file1.md', '/path/to/file3.md');
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
    
    it('should handle selectRow with shift key', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // Select first document
      core.selectRow('/path/to/file1.md');
      expect(core.getSelectedPaths()).toEqual(['/path/to/file1.md']);
      
      // Shift-select third document (should select range)
      core.selectRow('/path/to/file3.md', true);
      expect(core.getSelectedPaths()).toHaveLength(3);
      expect(core.isRowSelected('/path/to/file1.md')).toBe(true);
      expect(core.isRowSelected('/path/to/file2.md')).toBe(true);
      expect(core.isRowSelected('/path/to/file3.md')).toBe(true);
    });
    
    it('should clear selection', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.selectAll();
      expect(core.getSelectedPaths()).toHaveLength(3);
      
      core.clearSelection();
      expect(core.getSelectedPaths()).toHaveLength(0);
    });
    
    it('should return selected row IDs', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.toggleRowSelection('/path/to/file1.md');
      core.toggleRowSelection('/path/to/file2.md');
      
      const selectedRows = core.getSelectedRows();
      expect(selectedRows).toContain('/path/to/file1.md');
      expect(selectedRows).toContain('/path/to/file2.md');
      expect(selectedRows).toHaveLength(2);
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

  describe('Content Management', () => {
    it('should cache and retrieve content', () => {
      const core = new TableCore({ documents: testDocuments });
      
      const content = 'This is the document content';
      core.cacheContent('/path/to/file1.md', content);
      
      expect(core.getCachedContent('/path/to/file1.md')).toBe(content);
      expect(core.getCachedContent('/path/to/file2.md')).toBeUndefined();
    });
    
    it('should clear content cache', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.cacheContent('/path/to/file1.md', 'Content 1');
      core.cacheContent('/path/to/file2.md', 'Content 2');
      
      core.clearContentCache();
      
      expect(core.getCachedContent('/path/to/file1.md')).toBeUndefined();
      expect(core.getCachedContent('/path/to/file2.md')).toBeUndefined();
    });
  });

  describe('Export Functionality', () => {
    it('should export selected rows as JSON', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.toggleRowSelection('/path/to/file1.md');
      core.toggleRowSelection('/path/to/file2.md');
      
      const exported = core.exportSelectedRows('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveLength(2);
      expect(parsed[0].path).toBe('/path/to/file1.md');
      expect(parsed[1].path).toBe('/path/to/file2.md');
    });
    
    it('should export all rows as JSON', () => {
      const core = new TableCore({ documents: testDocuments });
      
      const exported = core.exportAllRows('json');
      const parsed = JSON.parse(exported);
      
      expect(parsed).toHaveLength(3);
    });
    
    it('should export selected rows as CSV', () => {
      const core = new TableCore({ documents: testDocuments });
      
      core.selectRow('/path/to/file1.md');
      
      const exported = core.exportSelectedRows('csv');
      const lines = exported.split('\n');
      
      expect(lines[0]).toBe('Path,Name,Size,Modified,Tags');
      expect(lines[1]).toContain('/path/to/file1.md');
      expect(lines[1]).toContain('file1.md');
      expect(lines[1]).toContain('1024');
    });
    
    it('should export all rows as CSV', () => {
      const core = new TableCore({ documents: testDocuments });
      
      const exported = core.exportAllRows('csv');
      const lines = exported.split('\n');
      
      expect(lines).toHaveLength(4); // header + 3 documents
      expect(lines[0]).toBe('Path,Name,Size,Modified,Tags');
    });
    
    it('should handle CSV escaping properly', () => {
      const documentsWithSpecialChars = [
        {
          ...testDocuments[0],
          path: '/path/with,comma.md',
          metadata: {
            ...testDocuments[0].metadata,
            name: 'file with "quotes".md',
            tags: ['tag1', 'tag2']
          }
        }
      ];
      
      const core = new TableCore({ documents: documentsWithSpecialChars });
      const exported = core.exportAllRows('csv');
      const lines = exported.split('\n');
      
      expect(lines[1]).toContain('"/path/with,comma.md"');
      expect(lines[1]).toContain('"file with ""quotes"".md"');
      expect(lines[1]).toContain('tag1;tag2');
    });
  });

  describe('Context Menu State', () => {
    it('should return correct context menu state', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // No selection
      let state = core.getContextMenuState();
      expect(state.canDelete).toBe(false);
      expect(state.canRename).toBe(false);
      expect(state.canExport).toBe(false);
      expect(state.canSelectAll).toBe(true);
      expect(state.canDeselectAll).toBe(false);
      
      // Single selection
      core.selectRow('/path/to/file1.md');
      state = core.getContextMenuState();
      expect(state.canDelete).toBe(true);
      expect(state.canRename).toBe(true);
      expect(state.canExport).toBe(true);
      expect(state.canSelectAll).toBe(true);
      expect(state.canDeselectAll).toBe(true);
      
      // Multiple selection
      core.toggleRowSelection('/path/to/file2.md');
      state = core.getContextMenuState();
      expect(state.canDelete).toBe(true);
      expect(state.canRename).toBe(false); // Only single selection can rename
      expect(state.canExport).toBe(true);
      
      // All selected
      core.selectAll();
      state = core.getContextMenuState();
      expect(state.canSelectAll).toBe(false); // Already all selected
      expect(state.canDeselectAll).toBe(true);
    });
    
    it('should check if operations can be performed', () => {
      const core = new TableCore({ documents: testDocuments });
      
      // No selection
      expect(core.canPerformOperation('delete', [])).toBe(false);
      
      // Single selection
      const singleSelection = ['/path/to/file1.md'];
      expect(core.canPerformOperation('delete', singleSelection)).toBe(true);
      expect(core.canPerformOperation('rename', singleSelection)).toBe(true);
      expect(core.canPerformOperation('edit', singleSelection)).toBe(true);
      expect(core.canPerformOperation('export', singleSelection)).toBe(true);
      expect(core.canPerformOperation('bulk-edit', singleSelection)).toBe(false);
      
      // Multiple selection
      const multiSelection = ['/path/to/file1.md', '/path/to/file2.md'];
      expect(core.canPerformOperation('delete', multiSelection)).toBe(true);
      expect(core.canPerformOperation('rename', multiSelection)).toBe(false);
      expect(core.canPerformOperation('edit', multiSelection)).toBe(false);
      expect(core.canPerformOperation('export', multiSelection)).toBe(true);
      expect(core.canPerformOperation('bulk-edit', multiSelection)).toBe(true);
      
      // Unknown operation
      expect(core.canPerformOperation('unknown', singleSelection)).toBe(false);
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
      
      core.toggleRowSelection('/path/to/file1.md');
      core.toggleRowSelection('/path/to/file2.md');
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