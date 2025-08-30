import type { Document as BaseDocument } from '@mmt/entities';

// Extend Document type to include fullPath for unique identification
export type Document = BaseDocument & {
  fullPath?: string;
};

export interface TableColumn {
  id: string;
  label: string;
  accessor?: (doc: Document) => any;
  size?: number;
  enableSorting?: boolean;
}

export interface SortState {
  field: string;
  order: 'asc' | 'desc';
}

export interface TableState {
  sorting: SortState | null;
  selectedRows: Set<string>;
  visibleColumns: Set<string>;
  columnOrder: string[];
  columnSizes: Record<string, number>;
  lastSelectedIndex: number;
}

export interface ContextMenuState {
  x: number;
  y: number;
  type: 'column' | 'row' | null;
  columnId?: string;
  rowId?: string;
}

export interface OperationRequest {
  operation: string;
  documentPaths: string[];
}

export interface TableCoreOptions {
  documents: Document[];
  initialColumns?: string[];
  initialSort?: SortState | null;
  onSelectionChange?: (selectedPaths: string[]) => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  onOperationRequest?: (request: OperationRequest) => void;
}