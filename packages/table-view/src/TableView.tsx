import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
import type { Document } from '@mmt/entities';
import { clsx } from 'clsx';
import { ColumnConfig } from './ColumnConfig.js';

export interface TableViewProps {
  documents: Document[];
  onSelectionChange?: (selectedPaths: string[]) => void;
  onOperationRequest?: (request: { operation: string; documentPaths: string[] }) => void;
  onLoadContent?: (path: string) => Promise<string>;
  initialColumns?: string[];
}

interface ContextMenuState {
  x: number;
  y: number;
  type: 'column' | 'row' | null;
  columnId?: string;
}

const ROW_LIMIT = 500;

export function TableView({
  documents,
  onSelectionChange,
  onOperationRequest,
  onLoadContent,
  initialColumns = ['name', 'path', 'modified', 'size', 'tags'],
}: TableViewProps) {
  // Limit documents to 500
  const displayDocuments = useMemo(() => documents.slice(0, ROW_LIMIT), [documents]);
  const totalCount = documents.length;
  const isLimited = totalCount > ROW_LIMIT;

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
  const lastSelectedIndex = useRef<number>(-1);

  // Load content when preview column is visible
  useEffect(() => {
    if (columnVisibility.preview && onLoadContent) {
      displayDocuments.forEach(async (doc) => {
        if (!contentCache[doc.path]) {
          const content = await onLoadContent(doc.path);
          setContentCache((prev) => ({ ...prev, [doc.path]: content }));
        }
      });
    }
  }, [columnVisibility.preview, displayDocuments, onLoadContent, contentCache]);

  // Handle row click with shift support
  const handleRowClick = useCallback((index: number, shiftKey: boolean) => {
    if (shiftKey && lastSelectedIndex.current !== -1) {
      // Shift-click: select range
      const start = Math.min(index, lastSelectedIndex.current);
      const end = Math.max(index, lastSelectedIndex.current);
      const newSelection: RowSelectionState = {};
      
      for (let i = start; i <= end; i++) {
        const rowId = displayDocuments[i]?.path;
        if (rowId) newSelection[rowId] = true;
      }
      
      setRowSelection((prev) => ({ ...prev, ...newSelection }));
    } else {
      // Regular click
      const rowId = displayDocuments[index]?.path;
      if (rowId) {
        setRowSelection((prev) => ({
          ...prev,
          [rowId]: !prev[rowId],
        }));
      }
    }
    lastSelectedIndex.current = index;
  }, [displayDocuments]);

  // Column definitions
  const columns = useMemo<ColumnDef<Document>[]>(
    () => [
      {
        id: 'select',
        size: 40,
        header: ({ table }) => (
          <input
            type="checkbox"
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
        cell: ({ getValue }) => (
          <span data-testid="name-cell">{getValue() as string}</span>
        ),
      },
      {
        id: 'path',
        accessorKey: 'path',
        header: 'Path',
        cell: ({ getValue }) => (
          <span className="text-sm text-muted-foreground">{getValue() as string}</span>
        ),
      },
      {
        id: 'modified',
        accessorFn: (doc) => doc.metadata.modified,
        header: 'Modified',
        cell: ({ getValue }) => {
          const date = getValue() as Date;
          return (
            <span data-testid="modified-cell">
              {date.toLocaleDateString()}
            </span>
          );
        },
        sortingFn: (rowA, rowB, columnId) => {
          const a = rowA.getValue(columnId) as Date;
          const b = rowB.getValue(columnId) as Date;
          return a.getTime() - b.getTime();
        },
      },
      {
        id: 'size',
        accessorFn: (doc) => doc.metadata.size,
        header: 'Size',
        cell: ({ getValue }) => {
          const size = getValue() as number;
          return (
            <span data-testid="size-cell">
              {(size / 1024).toFixed(1)} KB
            </span>
          );
        },
      },
      {
        id: 'tags',
        accessorFn: (doc) => doc.metadata.tags,
        header: 'Tags',
        cell: ({ getValue }) => {
          const tags = getValue() as string[];
          return (
            <div className="flex gap-1 flex-wrap">
              {tags.map((tag) => (
                <span key={tag} className="px-2 py-1 text-xs bg-secondary rounded-md">
                  {tag}
                </span>
              ))}
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
    data: displayDocuments,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnOrder,
      columnSizing,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnSizingChange: setColumnSizing,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.path,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
  });

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

  const handleRowContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, type: 'row' });
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
      {/* Header with limit message and column config */}
      <div className="flex items-center justify-between p-2 border-b">
        {isLimited && (
          <div className="text-sm text-muted-foreground">
            Showing first {ROW_LIMIT} of {totalCount} results
          </div>
        )}
        <ColumnConfig
          columns={[
            { id: 'name', label: 'Name' },
            { id: 'path', label: 'Path' },
            { id: 'modified', label: 'Modified' },
            { id: 'size', label: 'Size' },
            { id: 'tags', label: 'Tags' },
            { id: 'preview', label: 'Preview' },
          ]}
          visibility={columnVisibility}
          onVisibilityChange={setColumnVisibility}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-muted sticky top-0">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    data-testid={`column-header-${header.id}`}
                    className={clsx(
                      'text-left p-2 relative',
                      header.column.getCanSort() && 'cursor-pointer select-none'
                    )}
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
                    onContextMenu={(e) => handleColumnContextMenu(e, header.id)}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() && (
                      <span className="ml-1">
                        {header.column.getIsSorted() === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                    {header.column.getCanResize() && (
                      <div
                        className="resize-handle absolute right-0 top-0 h-full w-1 bg-border cursor-col-resize hover:bg-primary"
                        onMouseDown={header.getResizeHandler()}
                        onTouchStart={header.getResizeHandler()}
                      />
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
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
                onContextMenu={handleRowContextMenu}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-2">
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