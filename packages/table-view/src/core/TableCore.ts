import type { 
  Document, 
  TableState, 
  SortState, 
  TableCoreOptions, 
  OperationRequest 
} from './types';
import { getDocumentId, compareDates } from './utils';

/**
 * Core table logic - framework agnostic
 * Handles all business logic for table operations
 */
export class TableCore {
  private documents: Document[];
  private state: TableState;
  private options: TableCoreOptions;
  
  constructor(options: TableCoreOptions) {
    this.options = options;
    this.documents = options.documents;
    
    // Initialize state
    const initialColumns = options.initialColumns || ['name', 'path', 'modified', 'size', 'tags'];
    this.state = {
      sorting: options.initialSort || null,
      selectedRows: new Set<string>(),
      visibleColumns: new Set(initialColumns),
      columnOrder: [],
      columnSizes: {},
      lastSelectedIndex: -1
    };
  }
  
  // --- Document Management ---
  
  updateDocuments(documents: Document[]): void {
    this.documents = documents;
    // Clean up selection for documents that no longer exist
    const validIds = new Set(documents.map(getDocumentId));
    const selectedToRemove: string[] = [];
    this.state.selectedRows.forEach(id => {
      if (!validIds.has(id)) {
        selectedToRemove.push(id);
      }
    });
    selectedToRemove.forEach(id => this.state.selectedRows.delete(id));
  }
  
  getDocuments(): Document[] {
    return this.documents;
  }
  
  getSortedDocuments(): Document[] {
    if (!this.state.sorting) {
      return this.documents;
    }
    
    const { field, order } = this.state.sorting;
    const sorted = [...this.documents].sort((a, b) => {
      let result = 0;
      
      switch (field) {
        case 'name':
          result = (a.metadata.name || '').localeCompare(b.metadata.name || '');
          break;
        case 'path':
          result = a.path.localeCompare(b.path);
          break;
        case 'modified':
          result = compareDates(a.metadata.modified, b.metadata.modified);
          break;
        case 'size':
          result = (a.metadata.size || 0) - (b.metadata.size || 0);
          break;
        default:
          result = 0;
      }
      
      return order === 'desc' ? -result : result;
    });
    
    return sorted;
  }
  
  getDocumentById(id: string): Document | undefined {
    return this.documents.find(doc => getDocumentId(doc) === id);
  }
  
  getDocumentIndex(doc: Document): number {
    const sortedDocs = this.getSortedDocuments();
    return sortedDocs.findIndex(d => getDocumentId(d) === getDocumentId(doc));
  }
  
  // --- Selection Management ---
  
  isRowSelected(documentId: string): boolean {
    return this.state.selectedRows.has(documentId);
  }
  
  toggleRowSelection(documentId: string): void {
    if (this.state.selectedRows.has(documentId)) {
      this.state.selectedRows.delete(documentId);
    } else {
      this.state.selectedRows.add(documentId);
    }
    this.notifySelectionChange();
  }
  
  selectRow(documentId: string): void {
    this.state.selectedRows.add(documentId);
    this.notifySelectionChange();
  }
  
  deselectRow(documentId: string): void {
    this.state.selectedRows.delete(documentId);
    this.notifySelectionChange();
  }
  
  selectRange(startIndex: number, endIndex: number): void {
    const sortedDocs = this.getSortedDocuments();
    const start = Math.min(startIndex, endIndex);
    const end = Math.max(startIndex, endIndex);
    
    for (let i = start; i <= end; i++) {
      const doc = sortedDocs[i];
      if (doc) {
        this.state.selectedRows.add(getDocumentId(doc));
      }
    }
    this.notifySelectionChange();
  }
  
  handleRowClick(index: number, shiftKey: boolean): void {
    const sortedDocs = this.getSortedDocuments();
    const doc = sortedDocs[index];
    if (!doc) return;
    
    const documentId = getDocumentId(doc);
    
    if (shiftKey && this.state.lastSelectedIndex !== -1) {
      // Shift-click: select range
      this.selectRange(this.state.lastSelectedIndex, index);
    } else {
      // Regular click: toggle selection
      this.toggleRowSelection(documentId);
    }
    
    this.state.lastSelectedIndex = index;
  }
  
  selectAll(): void {
    this.documents.forEach(doc => {
      this.state.selectedRows.add(getDocumentId(doc));
    });
    this.notifySelectionChange();
  }
  
  deselectAll(): void {
    this.state.selectedRows.clear();
    this.state.lastSelectedIndex = -1;
    this.notifySelectionChange();
  }
  
  toggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.deselectAll();
    } else {
      this.selectAll();
    }
  }
  
  isAllSelected(): boolean {
    return this.documents.length > 0 && 
           this.documents.every(doc => this.state.selectedRows.has(getDocumentId(doc)));
  }
  
  isSomeSelected(): boolean {
    return this.state.selectedRows.size > 0 && !this.isAllSelected();
  }
  
  getSelectedPaths(): string[] {
    return Array.from(this.state.selectedRows);
  }
  
  getSelectedDocuments(): Document[] {
    return this.documents.filter(doc => this.state.selectedRows.has(getDocumentId(doc)));
  }
  
  // --- Sorting ---
  
  setSorting(field: string | null, order: 'asc' | 'desc' = 'asc'): void {
    if (field === null) {
      this.state.sorting = null;
    } else {
      this.state.sorting = { field, order };
      this.options.onSortChange?.(field, order);
    }
  }
  
  toggleSort(field: string): void {
    if (!this.state.sorting || this.state.sorting.field !== field) {
      // New field, default to ascending
      this.setSorting(field, 'asc');
    } else if (this.state.sorting.order === 'asc') {
      // Same field, ascending -> descending
      this.setSorting(field, 'desc');
    } else {
      // Same field, descending -> clear
      this.setSorting(null);
    }
  }
  
  getSorting(): SortState | null {
    return this.state.sorting;
  }
  
  // --- Column Visibility ---
  
  isColumnVisible(columnId: string): boolean {
    return this.state.visibleColumns.has(columnId);
  }
  
  setColumnVisibility(columnId: string, visible: boolean): void {
    if (visible) {
      this.state.visibleColumns.add(columnId);
    } else {
      this.state.visibleColumns.delete(columnId);
    }
  }
  
  toggleColumnVisibility(columnId: string): void {
    this.setColumnVisibility(columnId, !this.isColumnVisible(columnId));
  }
  
  getVisibleColumns(): string[] {
    return Array.from(this.state.visibleColumns);
  }
  
  // --- Column Sizing ---
  
  setColumnSize(columnId: string, size: number): void {
    this.state.columnSizes[columnId] = size;
  }
  
  getColumnSize(columnId: string, defaultSize: number = 100): number {
    return this.state.columnSizes[columnId] || defaultSize;
  }
  
  // --- Operations ---
  
  requestOperation(operation: string): void {
    const request: OperationRequest = {
      operation,
      documentPaths: this.getSelectedPaths()
    };
    this.options.onOperationRequest?.(request);
  }
  
  // --- State Management ---
  
  getState(): Readonly<TableState> {
    return {
      ...this.state,
      selectedRows: new Set(this.state.selectedRows),
      visibleColumns: new Set(this.state.visibleColumns)
    };
  }
  
  // --- Private Methods ---
  
  private notifySelectionChange(): void {
    this.options.onSelectionChange?.(this.getSelectedPaths());
  }
}