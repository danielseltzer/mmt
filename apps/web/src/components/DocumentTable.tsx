import { TableView } from '@mmt/table-view';
import { EnhancedDocumentTable } from './EnhancedDocumentTable';
import { useDocumentStore, useCurrentTab } from '../stores/document-store';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

export function DocumentTable() {
  const currentTab = useCurrentTab();
  const { setSort, fetchDocuments, vaults } = useDocumentStore();
  
  const vaultId = currentTab?.vaultId;
  const filteredDocuments = currentTab?.filteredDocuments || [];
  const loading = currentTab?.loading || false;
  const error = currentTab?.error || null;
  const sortBy = currentTab?.sortBy;
  const sortOrder = currentTab?.sortOrder || 'asc';
  const searchMode = currentTab?.searchMode || 'text';
  const searchQuery = currentTab?.searchQuery || '';
  
  // Get vault info for error display
  const vault = vaults.find(v => v.id === vaultId);
  
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
    // Check if this is a vault error or a fetch error
    const isVaultError = vault?.status === 'error';
    
    return (
      <div className="flex items-center justify-center py-8">
        <Alert variant="destructive" className="max-w-2xl">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {isVaultError ? 'Vault Error' : 'Failed to Load Documents'}
          </AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-2">
              <p>{error}</p>
              {isVaultError && vault?.error && (
                <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                  <strong>Vault details:</strong>
                  <ul className="list-disc ml-6 mt-1">
                    <li>Vault ID: {vaultId}</li>
                    <li>Vault Name: {vault.name || 'Unknown'}</li>
                    <li>Error: {vault.error}</li>
                  </ul>
                </div>
              )}
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logger.info('Retrying document fetch for vault:', vaultId);
                    fetchDocuments();
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Copy error details to clipboard
                    const errorDetails = `Error loading vault: ${vaultId}\n${error}\n${vault?.error || ''}`;
                    navigator.clipboard.writeText(errorDetails);
                    alert('Error details copied to clipboard');
                  }}
                >
                  Copy Error Details
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
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
        vaultId={vaultId}
        documents={filteredDocuments}
        onSelectionChange={(selectedIds) => {
          logger.debug('Selected documents:', selectedIds);
        }}
        currentSort={sortBy ? { field: sortBy, order: sortOrder } : undefined}
        onSortChange={setSort}
      />
    </div>
  );
}