import { useState } from 'react';
import { useDocumentStore } from '../stores/document-store';
import { useOperationStore } from '../stores/operation-store';
import { useUIStore } from '../stores/ui-store';
import type { ScriptOperation } from '@mmt/entities';

interface OperationsPanelProps {
  onClose: () => void;
}

export function OperationsPanel({ onClose }: OperationsPanelProps) {
  const selectedDocuments = useDocumentStore((state) => state.selectedDocuments);
  const addOperation = useOperationStore((state) => state.addOperation);
  const showNotification = useUIStore((state) => state.showNotification);
  
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [operationParams, setOperationParams] = useState<Record<string, unknown>>({});
  
  const handlePreview = () => {
    if (!selectedOperation || selectedDocuments.length === 0) return;
    
    // TODO: Implement preview functionality
    showNotification({
      type: 'info',
      title: 'Preview not yet implemented',
      message: 'This feature will show a preview of changes before execution',
      duration: 3000,
    });
  };
  
  const handleExecute = () => {
    if (!selectedOperation || selectedDocuments.length === 0) return;
    
    const operation: ScriptOperation = {
      type: selectedOperation as ScriptOperation['type'],
      ...operationParams,
    };
    
    // Validate operation parameters
    if (selectedOperation === 'move' && !operationParams.destination) {
      showNotification({
        type: 'error',
        title: 'Invalid operation',
        message: 'Please specify a destination folder',
        duration: 3000,
      });
      return;
    }
    
    if (selectedOperation === 'rename' && !operationParams.newName) {
      showNotification({
        type: 'error',
        title: 'Invalid operation',
        message: 'Please specify a new name pattern',
        duration: 3000,
      });
      return;
    }
    
    // Add operation to queue
    addOperation(operation, selectedDocuments);
    
    showNotification({
      type: 'success',
      title: 'Operation queued',
      message: `${selectedOperation} operation added to queue for ${selectedDocuments.length} files`,
      duration: 3000,
    });
    
    // Reset form
    setSelectedOperation('');
    setOperationParams({});
    onClose();
  };

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
                onClick={() => {
                  setSelectedOperation(op.id);
                }}
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
                  value={operationParams.destination as string ?? ''}
                  onChange={(e) => setOperationParams({ ...operationParams, destination: e.target.value })}
                />
              )}
              {selectedOperation === 'rename' && (
                <input
                  type="text"
                  placeholder="New name pattern (use {name} for current name)"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={operationParams.newName as string ?? ''}
                  onChange={(e) => setOperationParams({ ...operationParams, newName: e.target.value })}
                />
              )}
              {selectedOperation === 'updateFrontmatter' && (
                <textarea
                  placeholder="Frontmatter updates (YAML format)"
                  className="w-full px-3 py-2 border rounded-md bg-background h-24"
                  value={operationParams.updates as string ?? ''}
                  onChange={(e) => setOperationParams({ ...operationParams, updates: e.target.value })}
                />
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t space-y-2">
        <button
          disabled={!selectedOperation || selectedDocuments.length === 0}
          onClick={() => handlePreview()}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Preview Changes
        </button>
        <button
          disabled={!selectedOperation || selectedDocuments.length === 0}
          onClick={() => handleExecute()}
          className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Execute Operation
        </button>
      </div>
    </div>
  );
}