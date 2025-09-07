import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { Document } from './core/types';
import type { UseTableSelectionReturn } from './hooks/useTableSelection';
import type { UseContentLoadingReturn } from './hooks/useContentLoading';

/**
 * Create table column definitions with selection and content loading support
 */
export function createTableColumns(
  selection: UseTableSelectionReturn,
  contentLoading: UseContentLoadingReturn
): ColumnDef<Document>[] {
  return [
    {
      id: 'select',
      size: 30,
      enableSorting: false,
      header: ({ table }) => (
        <input
          type="checkbox"
          className="h-3 w-3"
          data-testid="select-all-checkbox"
          checked={selection.isAllSelected}
          ref={(el) => {
            if (el) {
              el.indeterminate = selection.isSomeSelected && !selection.isAllSelected;
            }
          }}
          onChange={() => selection.toggleAllSelection()}
        />
      ),
      cell: ({ row, table }) => {
        const index = table.getRowModel().rows.findIndex(r => r.id === row.id);
        return (
          <input
            type="checkbox"
            className="h-3 w-3"
            checked={selection.isRowSelected(row.id)}
            onChange={(e) => {
              if (e.nativeEvent instanceof MouseEvent && e.nativeEvent.shiftKey) {
                selection.handleRowClick(row.id, true);
              } else {
                selection.toggleRowSelection(row.id);
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
        const content = contentLoading.getContent(row.original.path);
        return (
          <span className="text-sm text-muted-foreground truncate">
            {contentLoading.isLoading(row.original.path) ? 'Loading...' : content || ''}
          </span>
        );
      },
    },
  ];
}