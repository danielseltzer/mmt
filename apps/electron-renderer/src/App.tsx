import { useState } from 'react';
import { QueryBar } from './components/QueryBar';
import { DocumentTable } from './components/DocumentTable';
import { StatusBar } from './components/StatusBar';
import { OperationsPanel } from './components/OperationsPanel';
import { useDocumentStore } from './stores/document-store';

export function App() {
  const [isOperationsPanelOpen, setIsOperationsPanelOpen] = useState(false);
  const selectedDocuments = useDocumentStore((state) => state.selectedDocuments);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Markdown Management Toolkit</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 text-sm rounded-md bg-secondary hover:bg-secondary/80 transition-colors"
            onClick={() => setIsOperationsPanelOpen(!isOperationsPanelOpen)}
            disabled={selectedDocuments.length === 0}
          >
            Operations ({selectedDocuments.length})
          </button>
        </div>
      </header>

      {/* Query Bar */}
      <div className="border-b">
        <QueryBar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document Table */}
        <div className="flex-1 overflow-auto">
          <DocumentTable />
        </div>

        {/* Operations Panel */}
        {isOperationsPanelOpen && (
          <div className="w-80 border-l overflow-auto">
            <OperationsPanel onClose={() => setIsOperationsPanelOpen(false)} />
          </div>
        )}
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}