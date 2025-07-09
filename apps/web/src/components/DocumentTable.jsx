import { TableView } from '@mmt/table-view';
import { useDocumentStore } from '../stores/document-store';

export function DocumentTable() {
  const { documents, loading, error } = useDocumentStore();
  
  if (loading) return <div>Loading documents...</div>;
  if (error) return <div>Error: {error}</div>;
  
  // Transform documents to match TableView expected format
  const tableData = documents.map(doc => ({
    id: doc.path,
    name: doc.metadata.name,
    path: doc.path,
    modified: new Date(doc.metadata.modified || Date.now()).getTime(),
    size: doc.metadata.size || 0,
    tags: doc.metadata.tags || [],
    // Add any other fields expected by TableView
  }));
  
  return (
    <TableView 
      documents={documents}
      onSelectionChange={(selectedIds) => {
        console.log('Selected:', selectedIds);
      }}
    />
  );
}