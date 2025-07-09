import { TableView } from '@mmt/table-view';
import { useDocumentStore } from '../stores/document-store';

export function DocumentTable() {
  const { documents, loading, error } = useDocumentStore();
  
  if (loading) return <div>Loading documents...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <TableView 
      documents={documents}
      onSelectionChange={(selectedIds) => {
        console.log('Selected:', selectedIds);
      }}
    />
  );
}