import { TableView } from '@mmt/table-view';
import { useDocumentStore } from '../stores/document-store';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function DocumentTable() {
  const { documents, loading, error } = useDocumentStore();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading documents...</span>
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
  
  return (
    <Card>
      <CardContent className="p-0">
        <TableView 
          documents={documents}
          onSelectionChange={(selectedIds) => {
            console.log('Selected:', selectedIds);
          }}
        />
      </CardContent>
    </Card>
  );
}