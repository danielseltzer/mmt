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
import type { Document as BaseDocument } from '@mmt/entities';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

// Extend Document type to include fullPath for unique identification
type Document = BaseDocument & {
  fullPath?: string;
};
import { clsx } from 'clsx';
import { ColumnConfig } from './ColumnConfig.js';
import { SortConfig } from './SortConfig.js';

export interface TableViewProps {
  documents: Document[];
  onSelectionChange?: (selectedPaths: string[]) => void;
  onOperationRequest?: (request: { operation: string; documentPaths: string[] }) => void;
  onLoadContent?: (path: string) => Promise<string>;
  initialColumns?: string[];
  currentSort?: { field: string; order: 'asc' | 'desc' };
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'column' | 'row' | null;
  columnId?: string;
  rowId?: string;
}


export function TableView({
  documents,
  onSelectionChange,
  onOperationRequest,
  onLoadContent,
  initialColumns = ['name', 'path', 'modified', 'size', 'tags'],
  currentSort,
  onSortChange,
}: TableViewProps) {
  const totalCount = documents.length;

  // Table state
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
  
  // Track last selected index for shift-click
  const lastSelectedIndex = React.useRef<number>(-1);

  // Sync external sort with internal table state
  useEffect(() => {
    if (currentSort) {
      setSorting([{
        id: currentSort.field,
        desc: currentSort.order === 'desc'
      }]);
    } else {
      setSorting([]);
    }
  }, [currentSort]);

  // Load content when preview column is visible
  useEffect(() => {
    if (columnVisibility.preview && onLoadContent) {
      documents.forEach(async (doc) => {
        if (!contentCache[doc.path]) {
          const content = await onLoadContent(doc.path);
          setContentCache((prev) => ({ ...prev, [doc.path]: content }));
        }
      });
    }
  }, [columnVisibility.preview, documents, onLoadContent, contentCache]);

  // Handle row click with shift support
  const handleRowClick = useCallback((index: number, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIndex.current !== -1) {
      // Shift-click: select range
      const start = Math.min(index, lastSelectedIndex.current);
      const end = Math.max(index, lastSelectedIndex.current);
      const newSelection: RowSelectionState = {};
      
      for (let i = start; i <= end; i++) {
        const rowId = documents[i]?.path;
        if (rowId) newSelection[rowId] = true;
      }
      
      setRowSelection((prev) => ({ ...prev, ...newSelection }));
    } else {
      // Regular click
      const rowId = documents[index]?.path;
      if (rowId) {
        setRowSelection((prev) => ({
          ...prev,
          [rowId]: !prev[rowId],
        }));
      }
    }
    lastSelectedIndex.current = index;
  }, [documents]);

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
                  row.getToggleSelectedHandler()(e);
                  lastSelectedIndex.current = index;
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
          // Remove vault root path but keep the leading slash
          let relativePath = fullPath
            .replace(/^\/Users\/danielseltzer\/Notes\/Personal-sync-250710/, '')
            .replace(/^\/Users\/[^/]+\/[^/]+\/[^/]+\/test-vault/, '')
            .replace(/^.*\/test-vault/, '')
            .replace(/^.*\/vault/, '');
          
          // Ensure leading slash
          if (!relativePath.startsWith('/')) {
            relativePath = '/' + relativePath;
          }
          
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
          let date: Date | null = null;
          
          // Handle string dates (from API) and Date objects
          if (typeof value === 'string') {
            date = new Date(value);
          } else if (value instanceof Date) {
            date = value;
          }
          
          return (
            <span data-testid="modified-cell" className="text-sm">
              {date && !isNaN(date.getTime()) 
                ? date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric'
                  })
                : '-'
              }
            </span>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const aValue = rowA.getValue(columnId) as string | Date | null | undefined;
          const bValue = rowB.getValue(columnId) as string | Date | null | undefined;
          
          // Convert to dates
          let a: Date | null = null;
          let b: Date | null = null;
          
          if (typeof aValue === 'string') a = new Date(aValue);
          else if (aValue instanceof Date) a = aValue;
          
          if (typeof bValue === 'string') b = new Date(bValue);
          else if (bValue instanceof Date) b = bValue;
          
          // Handle null/undefined dates - put them at the end
          if (!a && !b) return 0;
          if (!a) return 1;
          if (!b) return -1;
          
          // Handle invalid dates
          const aTime = a.getTime();
          const bTime = b.getTime();
          if (isNaN(aTime) && isNaN(bTime)) return 0;
          if (isNaN(aTime)) return 1;
          if (isNaN(bTime)) return -1;
          
          return aTime - bTime;
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
              {(size / 1024).toFixed(1)}K
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
          
          // Show just the property names
          const propertyNames = Object.keys(frontmatter)
            .filter(key => {
              const value = frontmatter[key];
              // Skip complex values, nulls, and empty arrays
              return value !== null && value !== undefined && 
                     !(Array.isArray(value) && value.length === 0);
            });
          
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
          
          const tooltipText = propertyNames.map(key => {
            const value = frontmatter[key];
            let displayValue = value;
            if (Array.isArray(value)) {
              displayValue = value.join(', ');
            } else if (typeof value === 'object' && value !== null) {
              displayValue = JSON.stringify(value);
            }
            return `${key}: ${displayValue}`;
          }).join('\n');
          
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
    [contentCache, handleRowClick]
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
      
      // Notify parent component about sort changes
      if (onSortChange && newSorting.length > 0) {
        const sort = newSorting[0];
        onSortChange(sort.id, sort.desc ? 'desc' : 'asc');
      } else if (onSortChange && newSorting.length === 0) {
        // Clear sorting - though this might need special handling
        // For now, we'll keep the last sort state
      }
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.fullPath || row.path, // Use fullPath for unique ID, fallback to path
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
    const selectedPaths = Object.keys(rowSelection).filter((key) => rowSelection[key]);
    onOperationRequest?.({ operation, documentPaths: selectedPaths });
    setContextMenu({ x: 0, y: 0, type: null });
  }, [rowSelection, onOperationRequest]);

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
                    // Find the document by matching the ID (which is fullPath or path)
                    const doc = documents.find(d => (d.fullPath || d.path) === targetRowId);
                    if (doc) {
                      // Get the document's full path
                      const fullPath = doc.fullPath || doc.path;
                      
                      // Extract vault name and relative path from the full path
                      // The fullPath is like: /Users/danielseltzer/Notes/Personal-sync-250813/Making/Code/file.md
                      let vaultName = '';
                      let filePath = fullPath;
                      
                      if (filePath.includes('/Notes/')) {
                        // Find the position after /Notes/ to get the vault folder and file path
                        const notesIndex = filePath.indexOf('/Notes/');
                        const afterNotes = filePath.substring(notesIndex + 7); // Skip "/Notes/"
                        
                        // The first segment after /Notes/ is the vault folder
                        const firstSlashIndex = afterNotes.indexOf('/');
                        if (firstSlashIndex !== -1) {
                          // Extract vault folder name
                          const vaultFolder = afterNotes.substring(0, firstSlashIndex);
                          
                          // Try to determine the Obsidian vault name from the folder name
                          // Remove date suffixes like -250813 and -sync
                          vaultName = vaultFolder
                            .replace(/-\d{6}$/, '') // Remove date suffix like -250813
                            .replace(/-sync$/, '');  // Remove -sync suffix
                          
                          // Get just the file path relative to the vault
                          filePath = afterNotes.substring(firstSlashIndex + 1);
                        } else {
                          // File is at the root of the vault
                          vaultName = afterNotes.replace(/-\d{6}$/, '').replace(/-sync$/, '');
                          filePath = '';
                        }
                      }
                      
                      // If we couldn't determine the vault name, show an error
                      if (!vaultName) {
                        logger.error('Could not determine Obsidian vault name from path:', fullPath);
                        alert('Could not determine Obsidian vault name. The file may not be in an Obsidian vault.');
                        setContextMenu({ x: 0, y: 0, type: null });
                        return;
                      }
                      
                      // Build Obsidian URI
                      const obsidianUri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(filePath)}`;
                      logger.debug('Opening in Obsidian:', { vaultName, filePath, obsidianUri });
                      
                      // Open in Obsidian
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
                      // Use fullPath if available (contains actual file path), otherwise fall back to path
                      const fullPath = row.original.fullPath || row.original.path;
                      
                      // Get the current vault ID from the URL
                      const pathSegments = window.location.pathname.split('/');
                      const vaultIndex = pathSegments.indexOf('vaults');
                      const vaultId = vaultIndex !== -1 ? pathSegments[vaultIndex + 1] : null;
                      
                      if (vaultId) {
                        try {
                          const response = await fetch(`http://localhost:3001/api/vaults/${vaultId}/documents/reveal-in-finder`, {
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
                onClick={async () => {
                  // Get the right-clicked row's data
                  if (contextMenu.rowId) {
                    const row = table.getRowModel().rowsById[contextMenu.rowId];
                    if (row && row.original) {
                      // Use fullPath if available (contains actual file path), otherwise fall back to path
                      const fullPath = row.original.fullPath || row.original.path;
                      
                      // Get the current vault ID from the URL
                      const pathSegments = window.location.pathname.split('/');
                      const vaultIndex = pathSegments.indexOf('vaults');
                      const vaultId = vaultIndex !== -1 ? pathSegments[vaultIndex + 1] : null;
                      
                      if (vaultId) {
                        try {
                          const response = await fetch(`http://localhost:3001/api/vaults/${vaultId}/documents/quicklook`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ filePath: fullPath }),
                          });
                          
                          if (!response.ok) {
                            const error = await response.json();
                            logger.error('Failed to preview file:', error);
                          }
                        } catch (error) {
                          logger.error('Error previewing file:', error);
                        }
                      }
                    }
                  }
                  setContextMenu({ x: 0, y: 0, type: null });
                }}
              >
                Preview (QuickLook)
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