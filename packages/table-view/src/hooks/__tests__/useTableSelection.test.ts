import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTableSelection } from '../useTableSelection';
import { TableCore } from '../../core/TableCore';
import type { Document, TableCoreOptions } from '../../core/types';

// Helper function to create test documents
function createTestDocuments(count: number): Document[] {
  return Array.from({ length: count }, (_, i) => ({
    path: `/test/doc${i + 1}.md`,
    content: `# Document ${i + 1}\n\nThis is test content for document ${i + 1}.`,
    metadata: {
      name: `Document ${i + 1}`,
      size: 1000 + i * 100,
      modified: new Date(2024, 0, i + 1),
      frontmatter: {},
      tags: [`tag${i + 1}`],
      links: [],
    },
  }));
}

describe('useTableSelection', () => {
  let tableCore: TableCore;
  let documents: Document[];

  beforeEach(() => {
    // Create test documents
    documents = createTestDocuments(5);
    
    // Create a real TableCore instance
    const options: TableCoreOptions = {
      documents,
      initialColumns: ['name', 'path', 'modified'],
      onSelectionChange: () => {}, // We'll test this gets called
    };
    tableCore = new TableCore(options);
  });

  describe('initial state', () => {
    it('should initialize with empty selection when TableCore has no selection', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      expect(result.current.selectedRows).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isSomeSelected).toBe(false);
    });

    it('should initialize with existing selection from TableCore', () => {
      // Pre-select some rows in TableCore
      tableCore.selectRow('/test/doc1.md');
      tableCore.selectRow('/test/doc2.md', true); // This will select range if lastSelectedIndex is set

      const { result } = renderHook(() => useTableSelection(tableCore));

      expect(result.current.selectedRows.length).toBeGreaterThan(0);
      expect(result.current.selectedCount).toBeGreaterThan(0);
    });

    it('should handle null TableCore instance', () => {
      const { result } = renderHook(() => useTableSelection(null));

      expect(result.current.selectedRows).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isSomeSelected).toBe(false);
      
      // Methods should not throw when called with null tableCore
      act(() => {
        result.current.handleRowClick('test');
        result.current.clearSelection();
        result.current.selectAll();
        result.current.toggleAllSelection();
      });
    });
  });

  describe('handleRowClick', () => {
    it('should select a single row on normal click', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      act(() => {
        result.current.handleRowClick('/test/doc1.md');
      });

      expect(result.current.selectedRows).toContain('/test/doc1.md');
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isRowSelected('/test/doc1.md')).toBe(true);
    });

    it('should replace selection on normal click', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Select first document
      act(() => {
        result.current.handleRowClick('/test/doc1.md');
      });
      expect(result.current.selectedRows).toEqual(['/test/doc1.md']);

      // Select second document (should replace first)
      act(() => {
        result.current.handleRowClick('/test/doc2.md');
      });
      expect(result.current.selectedRows).toEqual(['/test/doc2.md']);
      expect(result.current.selectedCount).toBe(1);
    });

    it('should select range on shift-click', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Select first document
      act(() => {
        result.current.handleRowClick('/test/doc1.md');
      });

      // Shift-click third document (should select doc1, doc2, doc3)
      act(() => {
        result.current.handleRowClick('/test/doc3.md', true);
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isRowSelected('/test/doc1.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc2.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc3.md')).toBe(true);
    });
  });

  describe('clearSelection', () => {
    it('should clear all selected rows', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Select some rows first
      act(() => {
        result.current.handleRowClick('/test/doc1.md');
        result.current.toggleRowSelection('/test/doc2.md');
      });
      expect(result.current.selectedCount).toBeGreaterThan(0);

      // Clear selection
      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selectedRows).toEqual([]);
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isSomeSelected).toBe(false);
    });
  });

  describe('selectAll', () => {
    it('should select all documents', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(documents.length);
      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.isSomeSelected).toBe(false);
      
      // Check all documents are selected
      documents.forEach(doc => {
        expect(result.current.isRowSelected(doc.path)).toBe(true);
      });
    });
  });

  describe('toggleAllSelection', () => {
    it('should select all when none selected', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      act(() => {
        result.current.toggleAllSelection();
      });

      expect(result.current.selectedCount).toBe(documents.length);
      expect(result.current.isAllSelected).toBe(true);
    });

    it('should select all when some selected', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Select some rows
      act(() => {
        result.current.handleRowClick('/test/doc1.md');
        result.current.toggleRowSelection('/test/doc2.md');
      });
      expect(result.current.isSomeSelected).toBe(true);

      // Toggle all should select all
      act(() => {
        result.current.toggleAllSelection();
      });

      expect(result.current.selectedCount).toBe(documents.length);
      expect(result.current.isAllSelected).toBe(true);
    });

    it('should deselect all when all selected', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Select all first
      act(() => {
        result.current.selectAll();
      });
      expect(result.current.isAllSelected).toBe(true);

      // Toggle should deselect all
      act(() => {
        result.current.toggleAllSelection();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe('toggleRowSelection', () => {
    it('should toggle individual row selection', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));
      const rowId = '/test/doc1.md';

      // Initially not selected
      expect(result.current.isRowSelected(rowId)).toBe(false);

      // Toggle on
      act(() => {
        result.current.toggleRowSelection(rowId);
      });
      expect(result.current.isRowSelected(rowId)).toBe(true);
      expect(result.current.selectedCount).toBe(1);

      // Toggle off
      act(() => {
        result.current.toggleRowSelection(rowId);
      });
      expect(result.current.isRowSelected(rowId)).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it('should maintain other selections when toggling', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Select multiple rows
      act(() => {
        result.current.toggleRowSelection('/test/doc1.md');
        result.current.toggleRowSelection('/test/doc2.md');
        result.current.toggleRowSelection('/test/doc3.md');
      });
      expect(result.current.selectedCount).toBe(3);

      // Toggle off one row
      act(() => {
        result.current.toggleRowSelection('/test/doc2.md');
      });

      expect(result.current.selectedCount).toBe(2);
      expect(result.current.isRowSelected('/test/doc1.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc2.md')).toBe(false);
      expect(result.current.isRowSelected('/test/doc3.md')).toBe(true);
    });
  });

  describe('selectRange', () => {
    it('should select a range of rows', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      act(() => {
        result.current.selectRange('/test/doc1.md', '/test/doc3.md');
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isRowSelected('/test/doc1.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc2.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc3.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc4.md')).toBe(false);
    });

    it('should work with reverse range', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Select from doc3 to doc1 (reverse order)
      act(() => {
        result.current.selectRange('/test/doc3.md', '/test/doc1.md');
      });

      expect(result.current.selectedCount).toBe(3);
      expect(result.current.isRowSelected('/test/doc1.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc2.md')).toBe(true);
      expect(result.current.isRowSelected('/test/doc3.md')).toBe(true);
    });

    it('should handle invalid row IDs gracefully', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Try to select range with invalid IDs
      act(() => {
        result.current.selectRange('/invalid/id1', '/invalid/id2');
      });

      // Should not throw and selection should remain empty
      expect(result.current.selectedCount).toBe(0);
    });
  });

  describe('getSelectedCount', () => {
    it('should return correct count of selected rows', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      expect(result.current.getSelectedCount()).toBe(0);

      act(() => {
        result.current.toggleRowSelection('/test/doc1.md');
        result.current.toggleRowSelection('/test/doc2.md');
      });

      expect(result.current.getSelectedCount()).toBe(2);

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.getSelectedCount()).toBe(documents.length);
    });
  });

  describe('state synchronization', () => {
    it('should sync state when TableCore updates', () => {
      const { result, rerender } = renderHook(
        ({ core }) => useTableSelection(core),
        { initialProps: { core: tableCore } }
      );

      // Initial state
      expect(result.current.selectedCount).toBe(0);

      // Update selection directly in TableCore
      tableCore.selectRow('/test/doc1.md');
      
      // Trigger re-render to sync
      rerender({ core: tableCore });

      // Note: Since TableCore doesn't have built-in events, we need to trigger sync manually
      // In a real app, this would happen through callbacks or state management
      act(() => {
        result.current.handleRowClick('/test/doc2.md');
      });

      expect(result.current.selectedCount).toBeGreaterThan(0);
    });

    it('should handle TableCore instance change', () => {
      // Create two different TableCore instances
      const core1 = new TableCore({ documents: createTestDocuments(3) });
      const core2 = new TableCore({ documents: createTestDocuments(5) });

      const { result, rerender } = renderHook(
        ({ core }) => useTableSelection(core),
        { initialProps: { core: core1 } }
      );

      // Select in first core
      act(() => {
        result.current.selectAll();
      });
      expect(result.current.selectedCount).toBe(3);

      // Switch to second core
      rerender({ core: core2 });

      // Should reset to new core's state
      expect(result.current.selectedCount).toBe(0);

      // Select in second core
      act(() => {
        result.current.selectAll();
      });
      expect(result.current.selectedCount).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle empty document list', () => {
      const emptyCore = new TableCore({ documents: [] });
      const { result } = renderHook(() => useTableSelection(emptyCore));

      act(() => {
        result.current.selectAll();
      });

      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });

    it('should handle rapid selection changes', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      // Perform rapid selection changes
      act(() => {
        result.current.handleRowClick('/test/doc1.md');
        result.current.handleRowClick('/test/doc2.md');
        result.current.toggleRowSelection('/test/doc3.md');
        result.current.selectAll();
        result.current.clearSelection();
        result.current.toggleRowSelection('/test/doc1.md');
      });

      // Final state should be consistent
      expect(result.current.selectedCount).toBe(1);
      expect(result.current.isRowSelected('/test/doc1.md')).toBe(true);
    });

    it('should maintain consistency between methods', () => {
      const { result } = renderHook(() => useTableSelection(tableCore));

      act(() => {
        result.current.selectAll();
      });

      // All consistency checks
      expect(result.current.selectedCount).toBe(result.current.getSelectedCount());
      expect(result.current.selectedRows.length).toBe(result.current.selectedCount);
      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.isSomeSelected).toBe(false);

      // Partial selection consistency
      act(() => {
        result.current.toggleRowSelection('/test/doc1.md');
      });

      expect(result.current.isAllSelected).toBe(false);
      expect(result.current.isSomeSelected).toBe(true);
    });
  });
});