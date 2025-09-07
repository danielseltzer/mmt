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
  private contentCache: Map<string, string>;
  
  constructor(options: TableCoreOptions) {
    this.options = options;
    this.documents = options.documents;
    this.contentCache = new Map<string, string>();
    
    // Initialize state
    const initialColumns = options.initialColumns || ['name', 'path', 'modified', 'size', 'tags'];
    
    // Default to sorting by modified date descending if no initial sort is explicitly provided
    // Allow null to be passed explicitly to disable default sorting
    let initialSort = options.initialSort;
    if (initialSort === undefined) {
      initialSort = { field: 'modified', order: 'desc' as const };
    }
    
    this.state = {
      sorting: initialSort,
      selectedRows: new Set<string>(),
      visibleColumns: new Set(initialColumns),
      columnOrder: [],
      columnSizes: {},
      lastSelectedIndex: -1
    };
    
    // Don't notify about initial sort in constructor to avoid infinite loops
    // The parent component should handle the initial state
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
  
  selectRow(id: string, shiftKey?: boolean): void {
    if (shiftKey && this.state.lastSelectedIndex !== -1) {
      // Get index of the clicked document
      const sortedDocs = this.getSortedDocuments();
      const clickedIndex = sortedDocs.findIndex(doc => getDocumentId(doc) === id);
      
      if (clickedIndex !== -1) {
        // Clear existing selection and select range
        this.state.selectedRows.clear();
        const start = Math.min(this.state.lastSelectedIndex, clickedIndex);
        const end = Math.max(this.state.lastSelectedIndex, clickedIndex);
        
        for (let i = start; i <= end; i++) {
          const doc = sortedDocs[i];
          if (doc) {
            this.state.selectedRows.add(getDocumentId(doc));
          }
        }
        this.state.lastSelectedIndex = clickedIndex;
      }
    } else {
      // Regular selection (no shift)
      this.state.selectedRows.clear();
      this.state.selectedRows.add(id);
      
      // Update last selected index
      const sortedDocs = this.getSortedDocuments();
      const index = sortedDocs.findIndex(doc => getDocumentId(doc) === id);
      if (index !== -1) {
        this.state.lastSelectedIndex = index;
      }
    }
    this.notifySelectionChange();
  }
  
  deselectRow(documentId: string): void {
    this.state.selectedRows.delete(documentId);
    this.notifySelectionChange();
  }
  
  selectRange(fromId: string, toId: string): void {
    const sortedDocs = this.getSortedDocuments();
    const fromIndex = sortedDocs.findIndex(doc => getDocumentId(doc) === fromId);
    const toIndex = sortedDocs.findIndex(doc => getDocumentId(doc) === toId);
    
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }
    
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    
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
      // Shift-click: select range by getting IDs from indices
      const lastDoc = sortedDocs[this.state.lastSelectedIndex];
      if (lastDoc) {
        const lastDocId = getDocumentId(lastDoc);
        this.selectRange(lastDocId, documentId);
      }
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
  
  clearSelection(): void {
    this.deselectAll();
  }
  
  getSelectedRows(): string[] {
    return Array.from(this.state.selectedRows);
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
  
  // --- Content Management ---
  
  cacheContent(docId: string, content: string): void {
    this.contentCache.set(docId, content);
  }
  
  getCachedContent(docId: string): string | undefined {
    return this.contentCache.get(docId);
  }
  
  clearContentCache(): void {
    this.contentCache.clear();
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
    } else if (this.state.sorting.order === 'desc') {
      // Same field, descending -> clear
      this.setSorting(null);
    } else {
      // Shouldn't happen, but default to ascending as fallback
      this.setSorting(field, 'asc');
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
  
  // --- Export Functionality ---
  
  exportSelectedRows(format: 'json' | 'csv'): string {
    const selectedDocs = this.getSelectedDocuments();
    if (format === 'json') {
      return JSON.stringify(selectedDocs, null, 2);
    } else {
      return this.convertToCSV(selectedDocs);
    }
  }
  
  exportAllRows(format: 'json' | 'csv'): string {
    const docs = this.getSortedDocuments();
    if (format === 'json') {
      return JSON.stringify(docs, null, 2);
    } else {
      return this.convertToCSV(docs);
    }
  }
  
  private convertToCSV(documents: Document[]): string {
    if (documents.length === 0) {
      return '';
    }
    
    // Define CSV headers
    const headers = ['Path', 'Name', 'Size', 'Modified', 'Tags'];
    const rows = [headers];
    
    // Convert each document to a CSV row
    documents.forEach(doc => {
      const row = [
        doc.path,
        doc.metadata.name || '',
        (doc.metadata.size || 0).toString(),
        doc.metadata.modified ? new Date(doc.metadata.modified).toISOString() : '',
        (doc.metadata.tags || []).join(';')
      ];
      rows.push(row);
    });
    
    // Convert rows to CSV string with proper escaping
    return rows.map(row => 
      row.map(cell => {
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        const escaped = cell.replace(/"/g, '""');
        return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
      }).join(',')
    ).join('\n');
  }
  
  // --- Context Menu State ---
  
  getContextMenuState(rowId?: string, columnId?: string): {
    canDelete: boolean;
    canRename: boolean;
    canExport: boolean;
    canSelectAll: boolean;
    canDeselectAll: boolean;
  } {
    const hasSelection = this.state.selectedRows.size > 0;
    const hasDocuments = this.documents.length > 0;
    
    return {
      canDelete: hasSelection,
      canRename: this.state.selectedRows.size === 1,
      canExport: hasSelection,
      canSelectAll: hasDocuments && !this.isAllSelected(),
      canDeselectAll: hasSelection
    };
  }
  
  canPerformOperation(operation: string, selection: string[]): boolean {
    if (!selection || selection.length === 0) {
      return false;
    }
    
    switch (operation) {
      case 'delete':
      case 'export':
        return selection.length > 0;
      case 'rename':
      case 'edit':
        return selection.length === 1;
      case 'bulk-edit':
        return selection.length > 1;
      default:
        return false;
    }
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