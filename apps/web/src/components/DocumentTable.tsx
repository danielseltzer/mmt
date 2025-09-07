import { TableView } from '@mmt/table-view';
import { EnhancedDocumentTable } from './EnhancedDocumentTable';
import { useDocumentStore } from '../stores/document-store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles } from 'lucide-react';
import { Loggers } from '@mmt/logger';
import { useCallback, useMemo } from 'react';

const logger = Loggers.web();

export function DocumentTable() {
  const { getActiveTab } = useDocumentStore();
  const currentTab = getActiveTab();

  const documents = currentTab?.documents || [];
  const loading = currentTab?.loading || false;
  const error = currentTab?.error || null;
  const searchQuery = currentTab?.searchQuery || '';
  
  // Get sort state from the tab or use default - memoize to prevent infinite loops
  const sortState = useMemo(() => {
    if (currentTab?.sortBy) {
      return { field: currentTab.sortBy, order: currentTab.sortOrder || 'asc' };
    }
    return { field: 'modified', order: 'desc' as const };
  }, [currentTab?.sortBy, currentTab?.sortOrder]);
  
  const handleSortChange = useCallback((field: string, order: 'asc' | 'desc') => {
    // Only reload if sort actually changed
    if (currentTab && (currentTab.sortBy !== field || currentTab.sortOrder !== order)) {
      const store = useDocumentStore.getState();
      const tabs = store.tabs.map(tab => 
        tab.id === currentTab.id 
          ? { ...tab, sortBy: field, sortOrder: order }
          : tab
      );
      useDocumentStore.setState({ tabs });
      
      // Reload documents with new sort order
      // This will fetch from API with sorting parameters
      store.loadDocuments(currentTab.id);
    }
  }, [currentTab]);

  // For now, use documents directly as filtered documents
  // TODO: Add filtering logic if needed
  const filteredDocuments = documents;
  
  console.log('[DocumentTable] Current tab:', currentTab);
  console.log('[DocumentTable] Loading:', loading, 'Documents:', filteredDocuments.length);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          Loading documents...
        </span>
      </div>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error: {error}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Always render TableView (even with empty documents) to maintain sort state
  // The table will handle empty state internally

  return (
    <div className="flex-1 overflow-hidden" data-testid="document-table">
      <TableView
        documents={filteredDocuments as any}
        onSelectionChange={(selectedIds) => {
          logger.debug('Selected documents:', selectedIds);
        }}
        vaultId={currentTab?.vaultId || ''}
        currentSort={sortState}
        onSortChange={handleSortChange}
      />
    </div>
  );
}