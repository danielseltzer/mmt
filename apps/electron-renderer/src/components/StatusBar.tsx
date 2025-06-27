import { useDocumentStore } from '../stores/document-store';
import { useConnectionStatus } from '../hooks/useConnectionStatus';

export function StatusBar() {
  const documents = useDocumentStore((state) => state.documents);
  const selectedDocuments = useDocumentStore((state) => state.selectedDocuments);
  const isConnected = useConnectionStatus();

  return (
    <div className="border-t px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
      <div className="flex items-center gap-4">
        <span>
          {documents.length} document{documents.length !== 1 ? 's' : ''}
        </span>
        {selectedDocuments.length > 0 && (
          <span>
            {selectedDocuments.length} selected
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={`flex items-center gap-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    </div>
  );
}