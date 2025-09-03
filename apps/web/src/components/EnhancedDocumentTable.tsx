import { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDocumentStore, useCurrentTab } from '../stores/document-store';
import type { Document } from '../stores/types';

const columnHelper = createColumnHelper<Document>();

interface EnhancedDocumentTableProps {
  documents: Document[];
}

export function EnhancedDocumentTable({ documents }: EnhancedDocumentTableProps) {
  const { findSimilarDocuments, setSort } = useDocumentStore();
  const currentTab = useCurrentTab();
  const searchMode = currentTab?.searchMode || 'text';
  const [sorting, setSorting] = useState([]);
  const [rowSelection, setRowSelection] = useState({});

  const columns = useMemo(() => {
    const baseColumns = [
      columnHelper.display({
        id: 'select',
        size: 40,
        header: ({ table }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={table.getIsAllRowsSelected()}
            onChange={table.getToggleAllRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      }),
      
      columnHelper.accessor('metadata.name', {
        id: 'name',
        header: 'Name',
        size: 250,
        cell: ({ getValue }) => {
          const name = getValue();
          return (
            <span className="font-medium text-sm truncate block" title={name}>
              {name}
            </span>
          );
        },
      }),
      
      columnHelper.accessor('path', {
        id: 'path',
        header: 'Path',
        size: 300,
        cell: ({ getValue }) => {
          const fullPath = getValue() as string;
          // Clean up path for display
          const cleanPath = fullPath
            .replace(/^\/Users\/[^/]+\/[^/]+\/[^/]+/, '')
            .replace(/^.*\/vault/, '');
          
          return (
            <span className="text-xs text-muted-foreground truncate block" title={fullPath}>
              {cleanPath || '/'}
            </span>
          );
        },
      }),
    ];

    // Add similarity score column when in similarity mode
    if (searchMode === 'similarity') {
      baseColumns.push(
        columnHelper.accessor('similarityScore', {
          id: 'similarity',
          header: ({ column }) => (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Similarity
              {column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-1 h-3 w-3" />
              ) : column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-1 h-3 w-3" />
              ) : (
                <ArrowUpDown className="ml-1 h-3 w-3" />
              )}
            </Button>
          ),
          size: 150,
          cell: ({ getValue }) => {
            const score = getValue() || 0;
            const percentage = Math.round(score * 100);
            
            // Determine color based on score
            let badgeClass = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
            let barColor = 'bg-gray-400';
            
            if (percentage >= 70) {
              badgeClass = 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
              barColor = 'bg-green-500';
            } else if (percentage >= 50) {
              badgeClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
              barColor = 'bg-yellow-500';
            }
            
            return (
              <div className="flex items-center gap-2">
                <Badge className={cn("font-mono text-xs px-2 py-0.5", badgeClass)}>
                  {percentage}%
                </Badge>
                <div className="flex-1 max-w-[60px] bg-secondary rounded-full h-1.5">
                  <div 
                    className={cn("h-full rounded-full transition-all", barColor)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          },
          sortingFn: (rowA: any, rowB: any) => {
            const a = (rowA.original as Document).similarityScore || 0;
            const b = (rowB.original as Document).similarityScore || 0;
            return a - b;
          },
        })
      );
      
      // Add Find Similar action column
      baseColumns.push(
        columnHelper.display({
          id: 'actions',
          header: 'Actions',
          size: 100,
          cell: ({ row }) => (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={(e) => {
                e.stopPropagation();
                findSimilarDocuments(row.original.path);
              }}
              title={`Find documents similar to ${row.original.metadata.name}`}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Similar
            </Button>
          ),
        })
      );
    }
    
    // Add remaining columns
    baseColumns.push(
      columnHelper.accessor('metadata.modified', {
        id: 'modified',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Modified
            {column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-1 h-3 w-3" />
            ) : column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-1 h-3 w-3" />
            ) : (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        ),
        size: 120,
        cell: ({ getValue }) => {
          const value = getValue();
          const date = value ? new Date(value) : null;
          
          return (
            <span className="text-sm text-muted-foreground">
              {date && !isNaN(date.getTime()) 
                ? date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })
                : '-'
              }
            </span>
          );
        },
      }),
      
      columnHelper.accessor('metadata.size', {
        id: 'size',
        header: 'Size',
        size: 80,
        cell: ({ getValue }) => {
          const bytes = getValue() || 0;
          const formatSize = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
          };
          
          return (
            <span className="text-sm text-muted-foreground">
              {formatSize(bytes)}
            </span>
          );
        },
      })
    );
    
    return baseColumns;
  }, [searchMode, findSimilarDocuments]);

  const table = useReactTable({
    data: documents,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      
      // Update store with new sort
      if (newSorting.length > 0) {
        const { id, desc } = newSorting[0];
        setSort(id, desc ? 'desc' : 'asc');
      }
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
    enableMultiSort: false,
  });

  return (
    <div className="w-full h-full flex flex-col">
      <div className="overflow-auto flex-1 border rounded-md">
        <table className="w-full">
          <thead className="bg-muted/50 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="text-left font-medium text-sm py-2 px-3 border-b"
                    style={{ width: header.getSize() }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  No documents found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b hover:bg-muted/50 transition-colors",
                    row.getIsSelected() && "bg-muted/30"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="py-2 px-3"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer with selection info */}
      <div className="flex items-center justify-between px-4 py-2 border-t text-sm text-muted-foreground">
        <div>
          {Object.keys(rowSelection).length} of {documents.length} selected
        </div>
        <div>
          Total: {documents.length} documents
        </div>
      </div>
    </div>
  );
}