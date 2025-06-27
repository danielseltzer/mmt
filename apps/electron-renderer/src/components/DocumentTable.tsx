import { useDocumentStore } from '../stores/document-store';

export function DocumentTable() {
  const documents = useDocumentStore((state) => state.documents);
  const selectedDocuments = useDocumentStore((state) => state.selectedDocuments);
  const toggleDocument = useDocumentStore((state) => state.toggleDocument);
  const selectAll = useDocumentStore((state) => state.selectAll);
  const clearSelection = useDocumentStore((state) => state.clearSelection);

  const allSelected = documents.length > 0 && selectedDocuments.length === documents.length;
  const someSelected = selectedDocuments.length > 0 && selectedDocuments.length < documents.length;

  return (
    <div className="h-full">
      {documents.length === 0 ? (
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
                  indeterminate={someSelected}
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
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Path</th>
              <th className="text-left p-2">Modified</th>
              <th className="text-left p-2">Tags</th>
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
                    onChange={() => toggleDocument(doc.path)}
                    className="rounded"
                  />
                </td>
                <td className="p-2 font-medium">{doc.metadata.name}</td>
                <td className="p-2 text-sm text-muted-foreground">{doc.path}</td>
                <td className="p-2 text-sm">
                  {new Date(doc.metadata.modified).toLocaleDateString()}
                </td>
                <td className="p-2">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}