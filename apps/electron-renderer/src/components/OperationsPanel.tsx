import { useState } from 'react';
import { useDocumentStore } from '../stores/document-store';

interface OperationsPanelProps {
  onClose: () => void;
}

export function OperationsPanel({ onClose }: OperationsPanelProps) {
  const selectedDocuments = useDocumentStore((state) => state.selectedDocuments);
  const [selectedOperation, setSelectedOperation] = useState<string>('');

  const operations = [
    { id: 'move', label: 'Move Files', icon: '📁' },
    { id: 'rename', label: 'Rename Files', icon: '✏️' },
    { id: 'delete', label: 'Delete Files', icon: '🗑️' },
    { id: 'updateFrontmatter', label: 'Update Frontmatter', icon: '📝' },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold">Operations</h2>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 p-4 space-y-4">
        <div>
          <h3 className="text-sm font-medium mb-2">Selected Documents</h3>
          <div className="text-sm text-muted-foreground">
            {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium mb-2">Choose Operation</h3>
          <div className="space-y-2">
            {operations.map((op) => (
              <button
                key={op.id}
                onClick={() => setSelectedOperation(op.id)}
                className={`w-full flex items-center gap-2 p-3 rounded-md border transition-colors ${
                  selectedOperation === op.id
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted border-border'
                }`}
              >
                <span>{op.icon}</span>
                <span>{op.label}</span>
              </button>
            ))}
          </div>
        </div>

        {selectedOperation && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-medium mb-2">Operation Options</h3>
            <div className="space-y-2">
              {selectedOperation === 'move' && (
                <input
                  type="text"
                  placeholder="Destination folder"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              )}
              {selectedOperation === 'rename' && (
                <input
                  type="text"
                  placeholder="New name pattern (use {name} for current name)"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                />
              )}
              {selectedOperation === 'updateFrontmatter' && (
                <textarea
                  placeholder="Frontmatter updates (YAML format)"
                  className="w-full px-3 py-2 border rounded-md bg-background h-24"
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t space-y-2">
        <button
          disabled={!selectedOperation}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Preview Changes
        </button>
        <button
          disabled={!selectedOperation}
          className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Execute Operation
        </button>
      </div>
    </div>
  );
}