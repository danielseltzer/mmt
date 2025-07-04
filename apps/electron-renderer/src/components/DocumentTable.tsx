import { useDocumentStore } from '../stores/document-store';
import { useViewStore } from '../stores/view-store';
import { useMemo } from 'react';
import type { Document } from '@mmt/entities';

function renderCell(doc: Document, columnId: string): React.ReactNode {
  switch (columnId) {
    case 'name':
      return <span className="font-medium">{doc.metadata.name}</span>;
    case 'path':
      return <span className="text-sm text-muted-foreground">{doc.path}</span>;
    case 'modified':
      return (
        <span className="text-sm">
          {new Date(doc.metadata.modified).toLocaleDateString()}
        </span>
      );
    case 'size':
      return (
        <span className="text-sm">
          {(doc.metadata.size / 1024).toFixed(1)} KB
        </span>
      );
    case 'tags':
      return (
        <div className="flex gap-1 flex-wrap">
          {doc.metadata.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 text-xs bg-secondary rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export function DocumentTable() {
  const documents = useDocumentStore((state) => state.documents);
  const selectedDocuments = useDocumentStore((state) => state.selectedDocuments);
  const toggleDocument = useDocumentStore((state) => state.toggleDocument);
  const selectAll = useDocumentStore((state) => state.selectAll);
  const clearSelection = useDocumentStore((state) => state.clearSelection);
  const isLoading = useDocumentStore((state) => state.isLoading);
  
  const activeView = useViewStore((state) => state.activeView);
  const visibleColumns = useMemo(
    () => activeView?.columns.filter(col => col.visible).sort((a, b) => a.order - b.order) ?? [],
    [activeView]
  );

  const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;
  const someSelected = selectedDocuments.length > 0 && selectedDocuments.length < documents.length;

  return (
    <div className="h-full">
      {isLoading ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">Loading documents...</p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <div className="text-center">
            <p className="text-lg mb-2">No documents found</p>
            <p className="text-sm">Enter a query above to search your vault</p>
          </div>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-muted sticky top-0">
            <tr>
              <th className="w-10 p-2">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = someSelected;
                    }
                  }}
                  onChange={() => {
                    if (allSelected) {
                      clearSelection();
                    } else {
                      selectAll();
                    }
                  }}
                  className="rounded"
                />
              </th>
              {visibleColumns.map((col) => (
                <th key={col.id} className="text-left p-2">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.path}
                className="border-b hover:bg-muted/50 transition-colors"
              >
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={selectedDocuments.includes(doc.path)}
                    onChange={() => {
                      toggleDocument(doc.path);
                    }}
                    className="rounded"
                  />
                </td>
                {visibleColumns.map((col) => (
                  <td key={col.id} className="p-2">
                    {renderCell(doc, col.id)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}