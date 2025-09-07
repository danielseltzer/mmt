import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useContextMenu } from '../useContextMenu';
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

// Helper to create a mouse event (no mocks, just tracking)
function createMouseEvent(x: number, y: number): React.MouseEvent {
  let preventDefaultCalled = false;
  let stopPropagationCalled = false;
  
  return {
    clientX: x,
    clientY: y,
    preventDefault: () => { preventDefaultCalled = true; },
    stopPropagation: () => { stopPropagationCalled = true; },
    _preventDefaultCalled: () => preventDefaultCalled,
    _stopPropagationCalled: () => stopPropagationCalled,
  } as unknown as React.MouseEvent;
}

describe('useContextMenu', () => {
  let tableCore: TableCore;
  let documents: Document[];

  beforeEach(() => {
    // Create test documents
    documents = createTestDocuments(5);
    
    // Create a real TableCore instance
    const options: TableCoreOptions = {
      documents,
      initialColumns: ['name', 'path', 'modified'],
      onSelectionChange: () => {},
    };
    tableCore = new TableCore(options);
  });

  describe('initial state', () => {
    it('should initialize with closed menu', () => {
      const { result } = renderHook(() => useContextMenu());

      expect(result.current.isOpen).toBe(false);
      expect(result.current.position).toEqual({ x: 0, y: 0 });
      expect(result.current.menuType).toBeNull();
      expect(result.current.targetId).toBeNull();
    });
  });

  describe('showContextMenu', () => {
    it('should open column context menu at mouse position', () => {
      const { result } = renderHook(() => useContextMenu());
      const event = createMouseEvent(100, 200);

      act(() => {
        result.current.showContextMenu(event, 'column', 'name');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.position).toEqual({ x: 100, y: 200 });
      expect(result.current.menuType).toBe('column');
      expect(result.current.targetId).toBe('name');
      expect((event as any)._preventDefaultCalled()).toBe(true);
      expect((event as any)._stopPropagationCalled()).toBe(true);
    });

    it('should open row context menu at mouse position', () => {
      const { result } = renderHook(() => useContextMenu());
      const event = createMouseEvent(150, 250);

      act(() => {
        result.current.showContextMenu(event, 'row', '/test/doc1.md');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.position).toEqual({ x: 150, y: 250 });
      expect(result.current.menuType).toBe('row');
      expect(result.current.targetId).toBe('/test/doc1.md');
    });

    it('should work without an id parameter', () => {
      const { result } = renderHook(() => useContextMenu());
      const event = createMouseEvent(50, 75);

      act(() => {
        result.current.showContextMenu(event, 'column');
      });

      expect(result.current.isOpen).toBe(true);
      expect(result.current.position).toEqual({ x: 50, y: 75 });
      expect(result.current.menuType).toBe('column');
      expect(result.current.targetId).toBeNull();
    });

    it('should update position when showing menu multiple times', () => {
      const { result } = renderHook(() => useContextMenu());
      
      // First show
      act(() => {
        result.current.showContextMenu(createMouseEvent(10, 20), 'column', 'col1');
      });
      expect(result.current.position).toEqual({ x: 10, y: 20 });
      expect(result.current.targetId).toBe('col1');

      // Second show with different position
      act(() => {
        result.current.showContextMenu(createMouseEvent(30, 40), 'row', 'row1');
      });
      expect(result.current.position).toEqual({ x: 30, y: 40 });
      expect(result.current.targetId).toBe('row1');
    });
  });

  describe('hideContextMenu', () => {
    it('should close the menu and reset type and targetId', () => {
      const { result } = renderHook(() => useContextMenu());
      
      // Open menu first
      act(() => {
        result.current.showContextMenu(createMouseEvent(100, 200), 'row', 'doc1');
      });
      expect(result.current.isOpen).toBe(true);

      // Hide menu
      act(() => {
        result.current.hideContextMenu();
      });

      expect(result.current.isOpen).toBe(false);
      expect(result.current.menuType).toBeNull();
      expect(result.current.targetId).toBeNull();
      // Position should remain for potential animation purposes
      expect(result.current.position).toEqual({ x: 100, y: 200 });
    });
  });

  describe('getMenuItems', () => {
    describe('column menu items', () => {
      it('should return hide column item when column id is provided', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const mockContext = {
          documents: [],
          table: {},
          vaultId: 'test-vault',
          onPreview: () => {},
          onHideColumn: () => {},
          onOperation: () => {},
          rowSelection: {}
        };
        const items = result.current.getMenuItems('column', 'name', mockContext);
        
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({
          id: 'hide-column',
          label: 'Hide Column',
        });
        expect(typeof items[0].action).toBe('function');
      });

      it('should return empty array when no column id is provided', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const items = result.current.getMenuItems('column');
        
        expect(items).toHaveLength(0);
      });
    });

    describe('row menu items', () => {
      it('should return all row menu items when row id is provided', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const mockContext = {
          documents: [],
          table: {},
          vaultId: 'test-vault',
          onPreview: () => {},
          onHideColumn: () => {},
          onOperation: () => {},
          rowSelection: {}
        };
        const items = result.current.getMenuItems('row', '/test/doc1.md', mockContext);
        
        // Check we have all expected items
        const nonSeparatorItems = items.filter(item => !item.separator);
        const separatorItems = items.filter(item => item.separator);
        
        expect(nonSeparatorItems).toHaveLength(7); // All action items (preview, open-obsidian, reveal-finder, quicklook, move-to, rename, delete)
        expect(separatorItems).toHaveLength(3); // Separators
        
        // Check specific items exist
        const itemIds = nonSeparatorItems.map(item => item.id);
        expect(itemIds).toContain('preview');
        expect(itemIds).toContain('open-obsidian');
        expect(itemIds).toContain('reveal-finder');
        expect(itemIds).toContain('quicklook');
        expect(itemIds).toContain('move-to');
        expect(itemIds).toContain('rename');
        expect(itemIds).toContain('delete');
      });

      it('should return menu items with proper structure', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const mockContext = {
          documents: [{
            path: '/test/doc1.md',
            fullPath: '/test/doc1.md',
            metadata: { name: 'doc1' }
          }],
          table: {
            getRowModel: () => ({
              rowsById: {
                '/test/doc1.md': {
                  original: {
                    path: '/test/doc1.md',
                    fullPath: '/test/doc1.md'
                  }
                }
              }
            })
          },
          vaultId: 'test-vault',
          onPreview: () => {},
          onHideColumn: () => {},
          onOperation: () => {},
          rowSelection: {}
        };
        const items = result.current.getMenuItems('row', '/test/doc1.md', mockContext);
        
        // Check preview item structure
        const previewItem = items.find(item => item.id === 'preview');
        expect(previewItem).toBeDefined();
        expect(previewItem).toMatchObject({
          id: 'preview',
          label: 'Preview',
          icon: 'eye',
        });
        expect(typeof previewItem?.action).toBe('function');
        
        // Check separator structure
        const separator = items.find(item => item.separator);
        expect(separator).toBeDefined();
        expect(separator).toMatchObject({
          label: '',
          separator: true,
        });
      });

      it('should return empty array when no row id is provided', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const items = result.current.getMenuItems('row');
        
        expect(items).toHaveLength(0);
      });

      it('should work without context parameter', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const items = result.current.getMenuItems('row', '/test/doc1.md');
        
        // Should return empty array without context
        expect(items.length).toBe(0);
      });
    });

    describe('menu item actions', () => {
      it('should have callable actions for all non-separator items', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const mockContext = {
          documents: [{
            path: '/test/doc1.md',
            fullPath: '/test/doc1.md',
            metadata: { name: 'doc1' }
          }],
          table: {
            getRowModel: () => ({
              rowsById: {
                '/test/doc1.md': {
                  original: {
                    path: '/test/doc1.md',
                    fullPath: '/test/doc1.md'
                  }
                }
              }
            })
          },
          vaultId: 'test-vault',
          onPreview: () => {},
          onHideColumn: () => {},
          onOperation: () => {},
          rowSelection: {}
        };
        const items = result.current.getMenuItems('row', '/test/doc1.md', mockContext);
        const actionItems = items.filter(item => !item.separator);
        
        actionItems.forEach(item => {
          expect(typeof item.action).toBe('function');
          // Note: Cannot test actions that require browser APIs (window.open, alert)
          // These should be tested in integration/e2e tests
        });
      });

      it('should have proper icons for row menu items', () => {
        const { result } = renderHook(() => useContextMenu());
        
        const mockContext = {
          documents: [{
            path: '/test/doc1.md',
            fullPath: '/test/doc1.md',
            metadata: { name: 'doc1' }
          }],
          table: {
            getRowModel: () => ({
              rowsById: {
                '/test/doc1.md': {
                  original: {
                    path: '/test/doc1.md',
                    fullPath: '/test/doc1.md'
                  }
                }
              }
            })
          },
          vaultId: 'test-vault',
          onPreview: () => {},
          onHideColumn: () => {},
          onOperation: () => {},
          rowSelection: {}
        };
        const items = result.current.getMenuItems('row', '/test/doc1.md', mockContext);
        
        const expectedIcons = {
          'preview': 'eye',
          'open-obsidian': 'external-link',
          'reveal-finder': 'folder-open',
          'quicklook': 'search',
          'move-to': 'move',
          'rename': 'edit',
          'delete': 'trash',
        };
        
        Object.entries(expectedIcons).forEach(([id, icon]) => {
          const item = items.find(i => i.id === id);
          expect(item?.icon).toBe(icon);
        });
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle show -> hide -> show workflow', () => {
      const { result } = renderHook(() => useContextMenu());
      
      // Show column menu
      act(() => {
        result.current.showContextMenu(createMouseEvent(10, 20), 'column', 'col1');
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.menuType).toBe('column');
      
      // Hide menu
      act(() => {
        result.current.hideContextMenu();
      });
      expect(result.current.isOpen).toBe(false);
      
      // Show row menu
      act(() => {
        result.current.showContextMenu(createMouseEvent(30, 40), 'row', 'row1');
      });
      expect(result.current.isOpen).toBe(true);
      expect(result.current.menuType).toBe('row');
      expect(result.current.targetId).toBe('row1');
    });

    it('should switch between column and row menus seamlessly', () => {
      const { result } = renderHook(() => useContextMenu());
      
      // Show column menu
      act(() => {
        result.current.showContextMenu(createMouseEvent(10, 20), 'column', 'name');
      });
      const mockContext = {
        documents: [],
        table: {},
        vaultId: 'test-vault',
        onPreview: () => {},
        onHideColumn: () => {},
        onOperation: () => {},
        rowSelection: {}
      };
      const columnItems = result.current.getMenuItems('column', 'name', mockContext);
      expect(columnItems[0].id).toBe('hide-column');
      
      // Switch directly to row menu
      act(() => {
        result.current.showContextMenu(createMouseEvent(50, 60), 'row', '/doc.md');
      });
      const rowItems = result.current.getMenuItems('row', '/doc.md', mockContext);
      expect(rowItems[0].id).toBe('preview');
      expect(result.current.menuType).toBe('row');
    });
  });
});