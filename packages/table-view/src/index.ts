export { TableView } from './TableView';
export type { TableViewProps } from './TableView';
export { SortConfig } from './SortConfig';
export type { SortConfigProps, SortOption } from './SortConfig';

// Export core logic for testing
export { TableCore } from './core/TableCore';
export type { 
  Document, 
  TableState, 
  SortState, 
  TableCoreOptions,
  OperationRequest 
} from './core/types';
export * from './core/utils';