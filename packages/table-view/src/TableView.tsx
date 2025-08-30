import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
  VisibilityState,
  ColumnOrderState,
  ColumnSizingState,
} from '@tanstack/react-table';
import { Loggers } from '@mmt/logger';
import { clsx } from 'clsx';
import { ColumnConfig } from './ColumnConfig.js';
import { SortConfig } from './SortConfig.js';
import { TableCore } from './core/TableCore.js';
import type { Document, ContextMenuState } from './core/types.js';
import { 
  getRelativePath, 
  formatDate, 
  formatFileSize, 
  getDocumentId, 
  buildObsidianUri, 
  getMetadataDisplay, 
  compareDates 
} from './core/utils.js';

const logger = Loggers.web();

export interface TableViewProps {
  vaultId?: string;
  documents: Document[];
  onSelectionChange?: (selectedPaths: string[]) => void;
  onOperationRequest?: (request: { operation: string; documentPaths: string[] }) => void;
  initialColumns?: string[];
  currentSort?: { field: string; order: 'asc' | 'desc' };
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}


export function TableView({
  vaultId,
  documents,
  onSelectionChange,
  onOperationRequest,
  initialColumns = ['name', 'path', 'modified', 'size', 'tags'],
  currentSort,
  onSortChange,
}: TableViewProps) {
  const totalCount = documents.length;
  
  // Initialize TableCore for business logic
  const [tableCore] = useState(() => new TableCore({
    documents,
    initialColumns,
    initialSort: currentSort ? { field: currentSort.field, order: currentSort.order } : null,
    onSelectionChange,
    onSortChange,
    onOperationRequest
  }));
  
  // Update TableCore when documents change
  useEffect(() => {
    tableCore.updateDocuments(documents);
  }, [documents, tableCore]);

  // UI-specific state (kept in component)
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    const visibility: VisibilityState = {};
    ['name', 'path', 'modified', 'size', 'tags', 'preview'].forEach((col) => {
      visibility[col] = initialColumns.includes(col);
    });
    return visibility;
  });
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ x: 0, y: 0, type: null });
  const [contentCache, setContentCache] = useState<Record<string, string>>({});

  // Sync external sort with internal table state and TableCore
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
  }, [currentSort, tableCore]);
  
  // Sync TableCore selection with React Table state
  // Note: Selection sync removed to prevent infinite loops - selection is managed directly through event handlers

  // Load content when preview column is visible
  useEffect(() => {
    if (columnVisibility.preview && vaultId) {
      // Use a local set to track which paths we're already loading
      const loadingPaths = new Set<string>();
      
      documents.forEach(async (doc) => {
        // Check both cache and loading state to prevent duplicate fetches
        if (!contentCache[doc.path] && !loadingPaths.has(doc.path)) {
          loadingPaths.add(doc.path);
          try {
            // Fetch preview from API
            const response = await fetch(`/api/vaults/${vaultId}/documents/preview/${encodeURIComponent(doc.path)}`);
            if (response.ok) {
              const data = await response.json();
              setContentCache((prev) => ({ ...prev, [doc.path]: data.preview }));
            } else {
              setContentCache((prev) => ({ ...prev, [doc.path]: 'Failed to load preview' }));
            }
          } catch (error) {
            setContentCache((prev) => ({ ...prev, [doc.path]: 'Error loading preview' }));
          }
        }
      });
    }
    // Note: contentCache is intentionally not in dependencies to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnVisibility.preview, documents, vaultId]);

  // Handle row click with shift support (delegates to TableCore)
  const handleRowClick = useCallback((index: number, shiftKey: boolean) => {
    tableCore.handleRowClick(index, shiftKey);
    // Update React Table state
    const newSelection: RowSelectionState = {};
    tableCore.getSelectedPaths().forEach(path => {
      newSelection[path] = true;
    });
    setRowSelection(newSelection);
  }, [tableCore]);

  // Column definitions
  const columns = useMemo<ColumnDef<Document>[]>(
    () => [
      {
        id: 'select',
        size: 30,
        enableSorting: false,
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-3 w-3"
            data-testid="select-all-checkbox"
            checked={table.getIsAllRowsSelected()}
            ref={(el) => {
              if (el) {
                el.indeterminate = table.getIsSomeRowsSelected();
              }
            }}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row, table }) => {
          const index = table.getRowModel().rows.findIndex(r => r.id === row.id);
          return (
            <input
              type="checkbox"
              className="h-3 w-3"
              checked={row.getIsSelected()}
              onChange={(e) => {
                if (e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey) {
                  handleRowClick(index, true);
                } else {
                  const docId = getDocumentId(row.original);
                  tableCore.toggleRowSelection(docId);
                  // Update React Table state
                  const newSelection: RowSelectionState = {};
                  tableCore.getSelectedPaths().forEach(path => {
                    newSelection[path] = true;
                  });
                  setRowSelection(newSelection);
                }
              }}
            />
          );
        },
      },
      {
        id: 'name',
        accessorFn: (doc) => doc.metadata.name,
        header: 'Name',
        size: 200,
        cell: ({ getValue }) => {
          const name = getValue() as string;
          return (
            <span 
              data-testid="name-cell" 
              className="block truncate text-sm"
              title={name}
            >
              {name}
            </span>
          );
        },
      },
      {
        id: 'path',
        accessorKey: 'path',
        header: 'Path',
        size: 300,
        cell: ({ getValue }) => {
          const fullPath = getValue() as string;
          const relativePath = getRelativePath(fullPath);
          return (
            <span className="text-xs text-muted-foreground truncate block" title={fullPath}>
              {relativePath}
            </span>
          );
        },
      },
      {
        id: 'modified',
        accessorFn: (doc) => doc.metadata.modified,
        header: 'Modified',
        size: 80,
        cell: ({ getValue }) => {
          const value = getValue() as string | Date | null | undefined;
          return (
            <span data-testid="modified-cell" className="text-sm">
              {formatDate(value)}
            </span>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const aValue = rowA.getValue(columnId) as string | Date | null | undefined;
          const bValue = rowB.getValue(columnId) as string | Date | null | undefined;
          return compareDates(aValue, bValue);
        },
      },
      {
        id: 'size',
        accessorFn: (doc) => doc.metadata.size,
        header: 'Size',
        size: 60,
        cell: ({ getValue }) => {
          const size = getValue() as number;
          return (
            <span data-testid="size-cell" className="text-sm">
              {formatFileSize(size)}
            </span>
          );
        },
      },
      {
        id: 'tags',
        accessorFn: (doc) => doc.metadata.frontmatter,
        header: 'Metadata',
        size: 200,
        cell: ({ getValue, row }) => {
          const frontmatter = getValue() as Record<string, any> | undefined;
          const tags = row.original.metadata.tags || [];
          const { propertyNames, tooltipText } = getMetadataDisplay(frontmatter, tags);
          
          if (!frontmatter || Object.keys(frontmatter).length === 0) {
            // If no frontmatter, show tags if any
            if (tags.length === 0) return null;
            return (
              <div className="flex gap-1 items-center" title={tags.join(', ')}>
                {tags.slice(0, 2).map((tag) => {
                  const displayTag = tag.length > 15 ? tag.substring(0, 12) + '...' : tag;
                  return (
                    <span key={tag} className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                      #{displayTag}
                    </span>
                  );
                })}
                {tags.length > 2 && (
                  <span className="text-xs text-muted-foreground">
                    +{tags.length - 2}
                  </span>
                )}
              </div>
            );
          }
          
          if (propertyNames.length === 0 && tags.length > 0) {
            // Fallback to showing tag count if no frontmatter
            return (
              <div className="flex gap-1 items-center" title={tags.join(', ')}>
                <span className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                  {tags.length} tag{tags.length !== 1 ? 's' : ''}
                </span>
              </div>
            );
          }
          
          return (
            <div className="flex gap-1 items-center" title={tooltipText}>
              {propertyNames.slice(0, 4).map((propName) => {
                // Property names are usually shorter, so we can show more
                const displayName = propName.length > 12 ? propName.substring(0, 10) + '...' : propName;
                return (
                  <span key={propName} className="px-1.5 py-0.5 text-xs bg-secondary rounded">
                    {displayName}
                  </span>
                );
              })}
              {propertyNames.length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +{propertyNames.length - 4}
                </span>
              )}
            </div>
          );
        },
      },
      {
        id: 'preview',
        header: 'Preview',
        cell: ({ row }) => {
          const content = contentCache[row.original.path];
          return (
            <span className="text-sm text-muted-foreground truncate">
              {content || 'Loading...'}
            </span>
          );
        },
      },
    ],
    [contentCache, handleRowClick, tableCore]
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
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => getDocumentId(row), // Use centralized ID function
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

  // Get table rows
  const { rows } = table.getRowModel();

  // Handle selection changes
  useEffect(() => {
    const selectedPaths = Object.keys(rowSelection).filter((key) => rowSelection[key]);
    onSelectionChange?.(selectedPaths);
  }, [rowSelection, onSelectionChange]);

  // Context menu handlers
  const handleColumnContextMenu = useCallback((e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'column', columnId });
  }, []);

  const handleRowContextMenu = useCallback((e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'row', rowId });
  }, []);

  const handleHideColumn = useCallback(() => {
    if (contextMenu.columnId) {
      setColumnVisibility((prev) => ({ ...prev, [contextMenu.columnId!]: false }));
    }
    setContextMenu({ x: 0, y: 0, type: null });
  }, [contextMenu.columnId]);

  const handleOperation = useCallback((operation: string) => {
    tableCore.requestOperation(operation);
    setContextMenu({ x: 0, y: 0, type: null });
  }, [tableCore]);

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
            { id: 'preview', label: 'Preview' },
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
                  row.getIsSelected() && 'bg-muted/30'
                )}
                onClick={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.tagName !== 'INPUT') {
                    handleRowClick(index, e.shiftKey);
                  }
                }}
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

      {/* Context menus */}
      {contextMenu.type && (
        <div
          className="fixed bg-background border rounded-md shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu({ x: 0, y: 0, type: null })}
        >
          {contextMenu.type === 'column' && (
            <button
              className="w-full px-4 py-2 text-left hover:bg-muted"
              onClick={handleHideColumn}
            >
              Hide column
            </button>
          )}
          {contextMenu.type === 'row' && (
            <>
              <button
                className="w-full px-4 py-2 text-left hover:bg-muted"
                onClick={() => {
                  // Use the row that was right-clicked (from context menu)
                  const targetRowId = contextMenu.rowId;
                  if (targetRowId) {
                    const doc = tableCore.getDocumentById(targetRowId);
                    if (doc) {
                      const obsidianUri = buildObsidianUri(doc);
                      logger.debug('Opening in Obsidian:', obsidianUri);
                      window.open(obsidianUri, '_blank');
                    }
                  }
                  setContextMenu({ x: 0, y: 0, type: null });
                }}
              >
                Open in Obsidian
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-muted"
                onClick={async () => {
                  // Get the right-clicked row's data
                  if (contextMenu.rowId) {
                    const row = table.getRowModel().rowsById[contextMenu.rowId];
                    if (row && row.original) {
                      const fullPath = row.original.path;
                      
                      // Get the current vault ID from the URL
                      const pathSegments = window.location.pathname.split('/');
                      const vaultIndex = pathSegments.indexOf('vaults');
                      const vaultId = vaultIndex !== -1 ? pathSegments[vaultIndex + 1] : null;
                      
                      if (vaultId) {
                        try {
                          const response = await fetch(`/api/vaults/${vaultId}/documents/reveal-in-finder`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ filePath: fullPath }),
                          });
                          
                          if (!response.ok) {
                            const error = await response.json();
                            logger.error('Failed to reveal file:', error);
                          }
                        } catch (error) {
                          logger.error('Error revealing file:', error);
                        }
                      }
                    }
                  }
                  setContextMenu({ x: 0, y: 0, type: null });
                }}
              >
                Reveal in Finder
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-muted"
                onClick={() => handleOperation('move')}
              >
                Move selected
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-muted"
                onClick={() => handleOperation('rename')}
              >
                Rename selected
              </button>
              <button
                className="w-full px-4 py-2 text-left hover:bg-muted"
                onClick={() => handleOperation('delete')}
              >
                Delete selected
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}