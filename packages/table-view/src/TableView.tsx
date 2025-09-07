import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  RowSelectionState,
  VisibilityState,
  ColumnOrderState,
  ColumnSizingState,
} from '@tanstack/react-table';
import type { Document as BaseDocument } from '@mmt/entities';
import { Loggers } from '@mmt/logger';
import { clsx } from 'clsx';

// Components
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { ColumnConfig } from './ColumnConfig.js';
import { SortConfig } from './SortConfig.js';
import { ContextMenu } from './components';

// Core
import { TableCore } from './core/TableCore';
import type { Document } from './core/types';

// Hooks
import { useTableSelection } from './hooks/useTableSelection';
import { useContextMenu } from './hooks/useContextMenu';
import { useContentLoading } from './hooks/useContentLoading';
import { getApiEndpoint } from './config/api';

// Column definitions
import { createTableColumns } from './columns';

const logger = Loggers.web();

export interface TableViewProps {
  documents: Document[];
  onSelectionChange?: (selectedPaths: string[]) => void;
  onOperationRequest?: (request: { operation: string; documentPaths: string[] }) => void;
  onLoadContent?: (path: string) => Promise<string>;
  initialColumns?: string[];
  currentSort?: { field: string; order: 'asc' | 'desc' };
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  vaultId?: string;
}

export function TableView({
  documents,
  onSelectionChange,
  onOperationRequest,
  onLoadContent,
  initialColumns = ['name', 'path', 'modified', 'size', 'tags'],
  currentSort,
  onSortChange,
  vaultId = '',
}: TableViewProps) {
  // Initialize TableCore
  const [tableCore] = useState(() => new TableCore({
    documents,
    initialColumns,
    initialSort: currentSort ? { field: currentSort.field, order: currentSort.order } : null,
    onSelectionChange: (paths) => onSelectionChange?.(paths),
    onOperationRequest: (req) => onOperationRequest?.(req),
    onSortChange: (field, order) => onSortChange?.(field, order),
  }));

  // Update documents when they change
  useEffect(() => {
    tableCore.updateDocuments(documents);
  }, [documents]); // Remove tableCore from dependencies - it's a stable reference

  // Use custom hooks
  const selection = useTableSelection(tableCore);
  const contextMenu = useContextMenu();
  const contentLoading = useContentLoading(tableCore, getApiEndpoint(''));
  
  // Track TanStack Table state (these need to stay in sync with TableCore)
  const [sorting, setSorting] = useState<SortingState>(() => {
    const sort = tableCore.getSorting();
    return sort ? [{ id: sort.field, desc: sort.order === 'desc' }] : [];
  });
  
  const [rowSelection, setRowSelection] = useState<RowSelectionState>(() => {
    const selected: RowSelectionState = {};
    tableCore.getSelectedRows().forEach(id => { selected[id] = true; });
    return selected;
  });

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const visibility: VisibilityState = {};
    ['name', 'path', 'modified', 'size', 'tags', 'preview'].forEach((col) => {
      visibility[col] = tableCore.isColumnVisible(col);
    });
    return visibility;
  });

  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [previewModal, setPreviewModal] = useState<{ 
    isOpen: boolean; 
    documentPath: string | null 
  }>({ 
    isOpen: false, 
    documentPath: null 
  });

  // Sync external sort with internal table state
  useEffect(() => {
    if (currentSort) {
      setSorting([{
        id: currentSort.field,
        desc: currentSort.order === 'desc'
      }]);
      tableCore.setSorting(currentSort.field, currentSort.order);
    } else {
      setSorting([]);
      tableCore.setSorting(null);
    }
  }, [currentSort]); // Remove tableCore from dependencies - it's a stable reference

  // Sync selection state with TanStack Table
  useEffect(() => {
    const selected: RowSelectionState = {};
    selection.selectedRows.forEach(id => { selected[id] = true; });
    setRowSelection(selected);
  }, [selection.selectedRows]);

  // Load content when preview column is visible
  useEffect(() => {
    if (columnVisibility.preview && onLoadContent) {
      documents.forEach(async (doc) => {
        if (!contentLoading.hasContent(doc.path)) {
          const content = await onLoadContent(doc.path);
          if (content) {
            tableCore.cacheContent(doc.path, content);
          }
        }
      });
    }
  }, [columnVisibility.preview, documents, onLoadContent]); // Remove unstable deps

  // Create column definitions
  const columns = useMemo(
    () => createTableColumns(selection, contentLoading),
    [selection, contentLoading]
  );

  // Create table instance
  const table = useReactTable({
    data: documents,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnOrder,
      columnSizing,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      
      // Update TableCore and notify parent
      if (newSorting.length > 0) {
        const sort = newSorting[0];
        tableCore.setSorting(sort.id, sort.desc ? 'desc' : 'asc');
      } else {
        tableCore.setSorting(null);
      }
    },
    onRowSelectionChange: (updater) => {
      const newSelection = typeof updater === 'function' ? updater(rowSelection) : updater;
      setRowSelection(newSelection);
      
      // Update TableCore selections
      tableCore.clearSelection();
      Object.keys(newSelection).forEach(id => {
        if (newSelection[id]) {
          tableCore.selectRow(id);
        }
      });
    },
    onColumnVisibilityChange: (updater) => {
      const newVisibility = typeof updater === 'function' ? updater(columnVisibility) : updater;
      setColumnVisibility(newVisibility);
      
      // Update TableCore column visibility
      Object.keys(newVisibility).forEach(col => {
        tableCore.setColumnVisibility(col, newVisibility[col]);
      });
    },
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: (updater) => {
      const newSizing = typeof updater === 'function' ? updater(columnSizing) : updater;
      setColumnSizing(newSizing);
      
      // Update TableCore column sizes
      Object.keys(newSizing).forEach(col => {
        tableCore.setColumnSize(col, newSizing[col]);
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.fullPath || row.path,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // Get table rows
  const { rows } = table.getRowModel();

  // Handle notification of selection changes
  useEffect(() => {
    onSelectionChange?.(selection.selectedRows);
  }, [selection.selectedRows, onSelectionChange]);

  // Context menu handlers
  const handleColumnContextMenu = useCallback((e: React.MouseEvent, columnId: string) => {
    contextMenu.showContextMenu(e, 'column', columnId);
  }, [contextMenu]);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, rowId: string) => {
    contextMenu.showContextMenu(e, 'row', rowId);
  }, [contextMenu]);

  const handleRowClick = useCallback((index: number, shiftKey: boolean) => {
    const row = rows[index];
    if (row) {
      selection.handleRowClick(row.id, shiftKey);
    }
  }, [rows, selection]);

  const handleDoubleClick = useCallback((row: any) => {
    const doc = row.original;
    if (doc) {
      // Use the fullPath if available, otherwise construct from metadata
      const documentPath = doc.fullPath || doc.path || `${doc.metadata?.name}.md`;
      setPreviewModal({ isOpen: true, documentPath });
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Column and Sort config */}
      <div className="flex justify-end gap-1 mb-1">
        {onSortChange && (
          <SortConfig
            options={[
              { id: 'name', label: 'File' },
              { id: 'path', label: 'Path' },
              { id: 'modified', label: 'Modified' },
              { id: 'size', label: 'Size' },
            ]}
            currentSort={currentSort}
            onSortChange={onSortChange}
          />
        )}
        <ColumnConfig
          columns={[
            { id: 'name', label: 'Name' },
            { id: 'path', label: 'Path' },
            { id: 'modified', label: 'Modified' },
            { id: 'size', label: 'Size' },
            { id: 'tags', label: 'Metadata' },
          ]}
          visibility={columnVisibility}
          onVisibilityChange={setColumnVisibility}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse">
          <thead className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    data-testid={`column-header-${header.id}`}
                    className={clsx(
                      'text-left p-1 text-xs relative border-b',
                      header.column.getCanSort() && 'cursor-pointer select-none'
                    )}
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                    onContextMenu={(e) => handleColumnContextMenu(e, header.id)}
                  >
                    <div className="flex items-center">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() && (
                        <span className="ml-1">
                          {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                    {header.column.getCanResize() && (
                      <div
                        className="absolute right-0 top-0 h-full w-1 bg-border cursor-col-resize hover:bg-primary"
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr
                key={row.id}
                data-testid={`row-${row.id}`}
                className={clsx(
                  'border-b hover:bg-muted/50 transition-colors',
                  selection.isRowSelected(row.id) && 'bg-muted/30'
                )}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'INPUT') {
                    handleRowClick(index, e.shiftKey);
                  }
                }}
                onDoubleClick={() => handleDoubleClick(row)}
                onContextMenu={(e) => handleRowContextMenu(e, row.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td 
                    key={cell.id} 
                    className="p-1 text-sm overflow-hidden"
                    style={{ width: cell.column.getSize(), maxWidth: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Context menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        items={contextMenu.getMenuItems(
          contextMenu.menuType!,
          contextMenu.targetId || undefined,
          {
            documents,
            table,
            vaultId: vaultId || '',
            onPreview: (documentPath: string) => {
              setPreviewModal({ isOpen: true, documentPath });
            },
            onHideColumn: (columnId: string) => {
              setColumnVisibility((prev) => ({ ...prev, [columnId]: false }));
              tableCore.setColumnVisibility(columnId, false);
            },
            onOperation: (operation: string, documentPaths: string[]) => {
              tableCore.requestOperation(operation);
            },
            rowSelection,
          }
        )}
        onClose={contextMenu.hideContextMenu}
      />

      {/* Document Preview Modal */}
      {previewModal.isOpen && previewModal.documentPath && (
        <DocumentPreviewModal
          isOpen={previewModal.isOpen}
          onClose={() => setPreviewModal({ isOpen: false, documentPath: null })}
          documentPath={previewModal.documentPath}
          vaultId={vaultId}
        />
      )}
    </div>
  );
}