import { TableView } from '@mmt/table-view';
import { EnhancedDocumentTable } from './EnhancedDocumentTable';
import { useDocumentStore, useCurrentTab } from '../stores/document-store';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles } from 'lucide-react';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

export function DocumentTable() {
  const currentTab = useCurrentTab();
  const { setSort } = useDocumentStore();
  
  const filteredDocuments = currentTab?.filteredDocuments || [];
  const loading = currentTab?.loading || false;
  const error = currentTab?.error || null;
  const sortBy = currentTab?.sortBy;
  const sortOrder = currentTab?.sortOrder || 'asc';
  const searchMode = currentTab?.searchMode || 'text';
  const searchQuery = currentTab?.searchQuery || '';
  
  console.log('[DocumentTable] Current tab:', currentTab);
  console.log('[DocumentTable] Loading:', loading, 'Documents:', filteredDocuments.length);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">
          {searchMode === 'similarity' ? 'Searching for similar documents...' : 'Loading documents...'}
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
  
  if (searchMode === 'similarity' && filteredDocuments.length === 0 && searchQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No similar documents found</p>
        <p className="text-sm mt-2">Try adjusting your search query</p>
      </div>
    );
  }
  
  // Use EnhancedDocumentTable for similarity mode, standard TableView otherwise
  if (searchMode === 'similarity') {
    return (
      <div className="flex-1 overflow-hidden" data-testid="document-table">
        <EnhancedDocumentTable documents={filteredDocuments} />
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-hidden" data-testid="document-table">
      <TableView 
        documents={filteredDocuments}
        onSelectionChange={(selectedIds) => {
          logger.debug('Selected documents:', selectedIds);
        }}
        currentSort={sortBy ? { field: sortBy, order: sortOrder } : undefined}
        onSortChange={setSort}
        vaultId={currentTab?.vaultId || ''}
      />
    </div>
  );
}