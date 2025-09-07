import React, { useState, useCallback, useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import type { Document } from '../core/types';

export interface ColumnDefinition {
  id: string;
  header: string;
  accessorKey?: string;
  accessorFn?: (doc: Document) => any;
  size?: number;
  minSize?: number;
  maxSize?: number;
  enableSorting?: boolean;
  enableResizing?: boolean;
  cell?: (props: any) => React.ReactNode;
}

export interface UseTableColumnsOptions {
  initialHiddenColumns?: string[];
}

export interface UseTableColumnsReturn {
  columns: ColumnDefinition[];
  visibleColumns: Set<string>;
  hiddenColumns: Set<string>;
  toggleColumnVisibility: (columnId: string) => void;
  hideColumn: (columnId: string) => void;
  showColumn: (columnId: string) => void;
  resetColumns: () => void;
  getVisibleColumns: () => string[];
  getColumnDefinitions: () => ColumnDef<Document>[];
  isColumnVisible: (columnId: string) => boolean;
}

// Default column definitions with all possible columns
const DEFAULT_COLUMN_DEFINITIONS: ColumnDefinition[] = [
  {
    id: 'filename',
    header: 'Name',
    accessorFn: (doc) => doc.metadata.name,
    size: 200,
    minSize: 100,
    maxSize: 400,
    enableSorting: true,
    enableResizing: true,
  },
  {
    id: 'path',
    header: 'Path',
    accessorKey: 'path',
    size: 300,
    minSize: 150,
    maxSize: 500,
    enableSorting: true,
    enableResizing: true,
  },
  {
    id: 'extension',
    header: 'Extension',
    accessorFn: (doc) => {
      const parts = doc.path.split('.');
      return parts.length > 1 ? `.${parts[parts.length - 1]}` : '';
    },
    size: 80,
    minSize: 60,
    maxSize: 120,
    enableSorting: true,
    enableResizing: false,
  },
  {
    id: 'created',
    header: 'Created',
    accessorFn: (doc) => doc.metadata.frontmatter?.created || null,
    size: 120,
    minSize: 100,
    maxSize: 200,
    enableSorting: true,
    enableResizing: true,
  },
  {
    id: 'modified',
    header: 'Modified',
    accessorFn: (doc) => doc.metadata.modified,
    size: 120,
    minSize: 100,
    maxSize: 200,
    enableSorting: true,
    enableResizing: true,
  },
  {
    id: 'size',
    header: 'Size',
    accessorFn: (doc) => doc.metadata.size,
    size: 80,
    minSize: 60,
    maxSize: 120,
    enableSorting: true,
    enableResizing: false,
  },
  {
    id: 'tags',
    header: 'Tags',
    accessorFn: (doc) => doc.metadata.tags,
    size: 200,
    minSize: 100,
    maxSize: 400,
    enableSorting: false,
    enableResizing: true,
  },
  {
    id: 'content',
    header: 'Content Preview',
    accessorKey: 'content',
    size: 300,
    minSize: 200,
    maxSize: 600,
    enableSorting: false,
    enableResizing: true,
  },
];

// Default visible columns
const DEFAULT_VISIBLE_COLUMNS = ['filename', 'path', 'modified', 'size', 'tags'];

/**
 * Custom hook for managing table column definitions and visibility
 * 
 * @param options - Configuration options for the hook
 * @returns Column management utilities and state
 */
export function useTableColumns(options: UseTableColumnsOptions = {}): UseTableColumnsReturn {
  const { initialHiddenColumns = [] } = options;
  
  // Initialize visible columns state
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(() => {
    const initial = new Set(DEFAULT_VISIBLE_COLUMNS);
    // Remove any initially hidden columns
    initialHiddenColumns.forEach(col => initial.delete(col));
    return initial;
  });
  
  // Compute hidden columns
  const hiddenColumns = useMemo(() => {
    const hidden = new Set<string>();
    DEFAULT_COLUMN_DEFINITIONS.forEach(col => {
      if (!visibleColumns.has(col.id)) {
        hidden.add(col.id);
      }
    });
    return hidden;
  }, [visibleColumns]);
  
  /**
   * Toggle visibility of a specific column
   */
  const toggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        newSet.add(columnId);
      }
      return newSet;
    });
  }, []);
  
  /**
   * Hide a specific column
   */
  const hideColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      newSet.delete(columnId);
      return newSet;
    });
  }, []);
  
  /**
   * Show a specific column
   */
  const showColumn = useCallback((columnId: string) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      newSet.add(columnId);
      return newSet;
    });
  }, []);
  
  /**
   * Reset columns to default visibility
   */
  const resetColumns = useCallback(() => {
    const defaults = new Set(DEFAULT_VISIBLE_COLUMNS);
    // Remove any initially hidden columns
    initialHiddenColumns.forEach(col => defaults.delete(col));
    setVisibleColumns(defaults);
  }, [initialHiddenColumns]);
  
  /**
   * Get array of visible column IDs
   */
  const getVisibleColumns = useCallback(() => {
    return Array.from(visibleColumns);
  }, [visibleColumns]);
  
  /**
   * Check if a column is visible
   */
  const isColumnVisible = useCallback((columnId: string) => {
    return visibleColumns.has(columnId);
  }, [visibleColumns]);
  
  /**
   * Get column definitions for TanStack Table
   * This returns the raw definitions that can be further customized
   */
  const getColumnDefinitions = useCallback(() => {
    return DEFAULT_COLUMN_DEFINITIONS.map(col => ({
      id: col.id,
      header: col.header,
      accessorKey: col.accessorKey,
      accessorFn: col.accessorFn,
      size: col.size,
      minSize: col.minSize,
      maxSize: col.maxSize,
      enableSorting: col.enableSorting,
      enableResizing: col.enableResizing,
      cell: col.cell || (({ getValue }: any) => {
        const value = getValue();
        
        // Default cell renderers for different column types
        switch (col.id) {
          case 'filename':
            return (
              <span className="block truncate text-sm" title={value}>
                {value}
              </span>
            );
            
          case 'path':
            return (
              <span className="text-xs text-muted-foreground truncate block" title={value}>
                {value}
              </span>
            );
            
          case 'extension':
            return (
              <span className="text-xs font-mono">
                {value || '-'}
              </span>
            );
            
          case 'created':
          case 'modified':
            const date = value ? new Date(value) : null;
            return (
              <span className="text-sm">
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
            
          case 'size':
            return (
              <span className="text-sm">
                {typeof value === 'number' ? `${(value / 1024).toFixed(1)}K` : '-'}
              </span>
            );
            
          case 'tags':
            const tags = Array.isArray(value) ? value : [];
            if (tags.length === 0) return null;
            return (
              <div className="flex gap-1 items-center" title={tags.join(', ')}>
                {tags.slice(0, 2).map((tag: string) => {
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
            
          case 'content':
            const preview = value ? String(value).substring(0, 200) : '';
            return (
              <span className="text-xs text-muted-foreground truncate block">
                {preview ? `${preview}...` : '-'}
              </span>
            );
            
          default:
            return <span>{value}</span>;
        }
      }),
    } as ColumnDef<Document>));
  }, []);
  
  return {
    columns: DEFAULT_COLUMN_DEFINITIONS,
    visibleColumns,
    hiddenColumns,
    toggleColumnVisibility,
    hideColumn,
    showColumn,
    resetColumns,
    getVisibleColumns,
    getColumnDefinitions,
    isColumnVisible,
  };
}