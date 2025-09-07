import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableColumns } from '../useTableColumns.js';
import type { Document } from '../../core/types';

describe('useTableColumns', () => {
  // Sample document for testing
  const mockDocument: Document = {
    path: '/test/path/example.md',
    content: 'This is test content for the document preview',
    metadata: {
      name: 'example',
      modified: new Date('2024-01-01'),
      size: 2048,
      frontmatter: {
        created: new Date('2023-12-01'),
        tags: ['test', 'example'],
      },
      tags: ['test', 'example', 'document'],
      links: [],
    },
  };
  
  describe('initialization', () => {
    it('should initialize with default visible columns', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const expectedVisible = ['filename', 'path', 'modified', 'size', 'tags'];
      const visibleArray = Array.from(result.current.visibleColumns);
      
      expect(visibleArray).toHaveLength(expectedVisible.length);
      expectedVisible.forEach(col => {
        expect(result.current.visibleColumns.has(col)).toBe(true);
      });
    });
    
    it('should respect initial hidden columns', () => {
      const { result } = renderHook(() => 
        useTableColumns({ initialHiddenColumns: ['path', 'size'] })
      );
      
      expect(result.current.visibleColumns.has('filename')).toBe(true);
      expect(result.current.visibleColumns.has('path')).toBe(false);
      expect(result.current.visibleColumns.has('modified')).toBe(true);
      expect(result.current.visibleColumns.has('size')).toBe(false);
      expect(result.current.visibleColumns.has('tags')).toBe(true);
    });
    
    it('should compute hidden columns correctly', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const allColumns = ['filename', 'path', 'extension', 'created', 'modified', 'size', 'tags', 'content'];
      const visibleColumns = Array.from(result.current.visibleColumns);
      const hiddenColumns = Array.from(result.current.hiddenColumns);
      
      // All columns should be either visible or hidden
      allColumns.forEach(col => {
        const isVisible = visibleColumns.includes(col);
        const isHidden = hiddenColumns.includes(col);
        expect(isVisible || isHidden).toBe(true);
        expect(isVisible && isHidden).toBe(false); // Can't be both
      });
    });
  });
  
  describe('column visibility management', () => {
    it('should toggle column visibility', () => {
      const { result } = renderHook(() => useTableColumns());
      
      // Initially visible
      expect(result.current.isColumnVisible('filename')).toBe(true);
      
      act(() => {
        result.current.toggleColumnVisibility('filename');
      });
      
      expect(result.current.isColumnVisible('filename')).toBe(false);
      
      act(() => {
        result.current.toggleColumnVisibility('filename');
      });
      
      expect(result.current.isColumnVisible('filename')).toBe(true);
    });
    
    it('should hide a specific column', () => {
      const { result } = renderHook(() => useTableColumns());
      
      expect(result.current.isColumnVisible('path')).toBe(true);
      
      act(() => {
        result.current.hideColumn('path');
      });
      
      expect(result.current.isColumnVisible('path')).toBe(false);
      
      // Hiding already hidden column should be idempotent
      act(() => {
        result.current.hideColumn('path');
      });
      
      expect(result.current.isColumnVisible('path')).toBe(false);
    });
    
    it('should show a specific column', () => {
      const { result } = renderHook(() => useTableColumns());
      
      // Start with extension hidden (not in default visible)
      expect(result.current.isColumnVisible('extension')).toBe(false);
      
      act(() => {
        result.current.showColumn('extension');
      });
      
      expect(result.current.isColumnVisible('extension')).toBe(true);
      
      // Showing already visible column should be idempotent
      act(() => {
        result.current.showColumn('extension');
      });
      
      expect(result.current.isColumnVisible('extension')).toBe(true);
    });
    
    it('should reset columns to defaults', () => {
      const { result } = renderHook(() => useTableColumns());
      
      // Modify visibility
      act(() => {
        result.current.hideColumn('filename');
        result.current.hideColumn('path');
        result.current.showColumn('extension');
        result.current.showColumn('created');
      });
      
      expect(result.current.isColumnVisible('filename')).toBe(false);
      expect(result.current.isColumnVisible('extension')).toBe(true);
      
      // Reset to defaults
      act(() => {
        result.current.resetColumns();
      });
      
      const expectedVisible = ['filename', 'path', 'modified', 'size', 'tags'];
      expectedVisible.forEach(col => {
        expect(result.current.isColumnVisible(col)).toBe(true);
      });
      
      expect(result.current.isColumnVisible('extension')).toBe(false);
      expect(result.current.isColumnVisible('created')).toBe(false);
    });
    
    it('should reset columns respecting initial hidden columns', () => {
      const { result } = renderHook(() => 
        useTableColumns({ initialHiddenColumns: ['size'] })
      );
      
      // Modify visibility
      act(() => {
        result.current.showColumn('size');
        result.current.hideColumn('filename');
      });
      
      expect(result.current.isColumnVisible('size')).toBe(true);
      expect(result.current.isColumnVisible('filename')).toBe(false);
      
      // Reset should restore initial state
      act(() => {
        result.current.resetColumns();
      });
      
      expect(result.current.isColumnVisible('size')).toBe(false); // Initially hidden
      expect(result.current.isColumnVisible('filename')).toBe(true);
    });
  });
  
  describe('column getters', () => {
    it('should return visible columns array', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const visible = result.current.getVisibleColumns();
      expect(visible).toEqual(['filename', 'path', 'modified', 'size', 'tags']);
      
      act(() => {
        result.current.hideColumn('path');
        result.current.showColumn('extension');
      });
      
      const newVisible = result.current.getVisibleColumns();
      expect(newVisible).toContain('filename');
      expect(newVisible).not.toContain('path');
      expect(newVisible).toContain('extension');
    });
    
    it('should check column visibility correctly', () => {
      const { result } = renderHook(() => useTableColumns());
      
      expect(result.current.isColumnVisible('filename')).toBe(true);
      expect(result.current.isColumnVisible('path')).toBe(true);
      expect(result.current.isColumnVisible('extension')).toBe(false);
      expect(result.current.isColumnVisible('created')).toBe(false);
    });
  });
  
  describe('column definitions', () => {
    it('should return all column definitions', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const columns = result.current.columns;
      expect(columns).toHaveLength(8);
      
      const columnIds = columns.map(col => col.id);
      expect(columnIds).toEqual([
        'filename',
        'path',
        'extension',
        'created',
        'modified',
        'size',
        'tags',
        'content',
      ]);
    });
    
    it('should have proper column properties', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const filenameCol = result.current.columns.find(col => col.id === 'filename');
      expect(filenameCol).toBeDefined();
      expect(filenameCol?.header).toBe('Name');
      expect(filenameCol?.size).toBe(200);
      expect(filenameCol?.minSize).toBe(100);
      expect(filenameCol?.maxSize).toBe(400);
      expect(filenameCol?.enableSorting).toBe(true);
      expect(filenameCol?.enableResizing).toBe(true);
      
      const sizeCol = result.current.columns.find(col => col.id === 'size');
      expect(sizeCol).toBeDefined();
      expect(sizeCol?.header).toBe('Size');
      expect(sizeCol?.size).toBe(80);
      expect(sizeCol?.enableSorting).toBe(true);
      expect(sizeCol?.enableResizing).toBe(false);
    });
    
    it('should generate TanStack Table column definitions', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const definitions = result.current.getColumnDefinitions();
      expect(definitions).toHaveLength(8);
      
      // Check that each definition has required properties
      definitions.forEach(def => {
        expect(def).toHaveProperty('id');
        expect(def).toHaveProperty('header');
        expect(def).toHaveProperty('cell');
        // Either accessorKey or accessorFn should be present
        const anyDef = def as any;
        expect(
          anyDef.accessorKey !== undefined || anyDef.accessorFn !== undefined
        ).toBe(true);
      });
    });
    
    it('should have working accessor functions', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const definitions = result.current.getColumnDefinitions();
      
      // Test filename accessor
      const filenameCol = definitions.find(d => d.id === 'filename') as any;
      expect(filenameCol?.accessorFn).toBeDefined();
      if (filenameCol?.accessorFn) {
        const value = filenameCol.accessorFn(mockDocument);
        expect(value).toBe('example');
      }
      
      // Test path accessor
      const pathCol = definitions.find(d => d.id === 'path') as any;
      expect(pathCol?.accessorKey).toBe('path');
      
      // Test extension accessor
      const extCol = definitions.find(d => d.id === 'extension') as any;
      expect(extCol?.accessorFn).toBeDefined();
      if (extCol?.accessorFn) {
        const value = extCol.accessorFn(mockDocument);
        expect(value).toBe('.md');
      }
      
      // Test size accessor
      const sizeCol = definitions.find(d => d.id === 'size') as any;
      expect(sizeCol?.accessorFn).toBeDefined();
      if (sizeCol?.accessorFn) {
        const value = sizeCol.accessorFn(mockDocument);
        expect(value).toBe(2048);
      }
      
      // Test tags accessor
      const tagsCol = definitions.find(d => d.id === 'tags') as any;
      expect(tagsCol?.accessorFn).toBeDefined();
      if (tagsCol?.accessorFn) {
        const value = tagsCol.accessorFn(mockDocument);
        expect(value).toEqual(['test', 'example', 'document']);
      }
    });
  });
  
  describe('edge cases', () => {
    it('should handle documents without extensions', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const definitions = result.current.getColumnDefinitions();
      const extCol = definitions.find(d => d.id === 'extension') as any;
      
      const docWithoutExt: Document = {
        ...mockDocument,
        path: '/test/path/README',
      };
      
      if (extCol?.accessorFn) {
        const value = extCol.accessorFn(docWithoutExt);
        expect(value).toBe('');
      }
    });
    
    it('should handle missing metadata gracefully', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const definitions = result.current.getColumnDefinitions();
      const createdCol = definitions.find(d => d.id === 'created') as any;
      
      const docWithoutCreated: Document = {
        ...mockDocument,
        metadata: {
          ...mockDocument.metadata,
          frontmatter: {},
        },
      };
      
      if (createdCol?.accessorFn) {
        const value = createdCol.accessorFn(docWithoutCreated);
        expect(value).toBeNull();
      }
    });
    
    it('should handle empty tags array', () => {
      const { result } = renderHook(() => useTableColumns());
      
      const definitions = result.current.getColumnDefinitions();
      const tagsCol = definitions.find(d => d.id === 'tags') as any;
      
      const docWithoutTags: Document = {
        ...mockDocument,
        metadata: {
          ...mockDocument.metadata,
          tags: [],
        },
      };
      
      if (tagsCol?.accessorFn) {
        const value = tagsCol.accessorFn(docWithoutTags);
        expect(value).toEqual([]);
      }
    });
  });
});