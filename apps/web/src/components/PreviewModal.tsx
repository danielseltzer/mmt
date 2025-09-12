import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, Wand2, FileOutput, Loader2 } from 'lucide-react';
import { Loggers } from '@mmt/logger';
import { getApiEndpoint } from '../config/api';
import { API_ROUTES } from '@mmt/entities';

const logger = Loggers.web();

export function PreviewModal({ 
  isOpen, 
  onClose, 
  filters, 
  operations, 
  outputFormat,
  onExecute 
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch preview data when modal opens
  useEffect(() => {
    if (isOpen && operations.length > 0) {
      fetchPreview();
    }
  }, [isOpen, filters, operations]);

  const fetchPreview = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Build pipeline request
      const pipeline = {
        select: {
          // In a real implementation, this would come from the filter bar
          // For now, we'll select all documents that match the filters
          all: true
        },
        filter: filters,
        operations: operations.map(op => {
          // Convert UI operation format to API format
          const apiOp = { type: op.type };
          
          switch (op.type) {
            case 'rename':
              apiOp.newName = op.pattern || '';
              break;
            case 'move':
              apiOp.destination = op.targetPath || '';
              break;
            case 'delete':
              apiOp.permanent = op.permanent || false;
              break;
            case 'updateFrontmatter':
              apiOp.updates = { [op.key]: op.value };
              apiOp.mode = 'merge';
              break;
          }
          
          return apiOp;
        }),
        options: {
          destructive: false // Preview mode
        }
      };

      const response = await fetch(getApiEndpoint(API_ROUTES.pipelines.execute()), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pipeline),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch preview: ${response.statusText}`);
      }

      const data = await response.json();
      setPreviewData(data);
    } catch (err) {
      logger.error('Failed to fetch preview:', err);
      setError(err.message || 'Failed to generate preview');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      // Pass the actual execution flag
      await onExecute(true);
      onClose();
    } catch (error) {
      logger.error('Execution failed:', error);
      setIsExecuting(false);
    }
  };

  if (!isOpen) return null;

  // Loading state
  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Generating preview...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Error state
  if (error) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Error</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // No preview data
  if (!previewData) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Preview Pipeline Execution</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center text-muted-foreground">
            No preview data available. Please ensure you have selected documents and operations.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const { summary, validation, filterDescription, documents } = previewData;
  const hasErrors = validation && !validation.valid;
  const hasWarnings = validation?.warnings && validation.warnings.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Pipeline Execution</DialogTitle>
          <DialogDescription>
            Review the operations that will be performed on your documents.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Selection Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4" />
              Selection
            </div>
            <div className="ml-6 text-sm text-muted-foreground">
              <p>{filterDescription || 'All documents'}</p>
              <p className="font-medium text-foreground mt-1">
                {summary.documentsAffected} document{summary.documentsAffected !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>

          {/* Operations Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4" />
              Operations ({summary.operations.length})
            </div>
            {summary.operations.length === 0 ? (
              <div className="ml-6 text-sm text-muted-foreground">
                No operations configured
              </div>
            ) : (
              <div className="ml-6 space-y-3">
                {summary.operations.map((op, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <span className="text-sm text-muted-foreground">{index + 1}.</span>
                      <div className="flex-1">
                        <p className={`text-sm ${op.type === 'delete' ? 'text-destructive' : ''}`}>
                          {op.description}
                        </p>
                        
                        {/* Examples */}
                        {op.examples && op.examples.length > 0 && (
                          <div className="mt-1 space-y-1">
                            {op.examples.slice(0, 3).map((example, i) => (
                              <div key={i} className="text-xs text-muted-foreground">
                                <span className="font-mono">{example.from}</span>
                                <span className="mx-1">→</span>
                                <span className="font-mono">{example.to}</span>
                              </div>
                            ))}
                            {op.examples.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                ... and {op.examples.length - 3} more
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Warnings */}
                        {op.warnings && op.warnings.map((warning, i) => (
                          <div key={i} className="flex items-start gap-1 mt-1">
                            <AlertCircle className="h-3 w-3 text-warning mt-0.5" />
                            <span className="text-xs text-warning">{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Output Format */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileOutput className="h-4 w-4" />
              Output Format
            </div>
            <div className="ml-6 text-sm text-muted-foreground">
              {outputFormat.toUpperCase()} format
            </div>
          </div>

          {/* Validation Errors */}
          {hasErrors && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Validation Errors</p>
                <ul className="list-disc list-inside mt-1">
                  {validation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="flex items-start gap-2 p-3 bg-warning/10 text-warning rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Warnings</p>
                <ul className="list-disc list-inside mt-1">
                  {validation.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Destructive operations warning */}
          {summary.hasDestructiveOperations && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Warning: Destructive operations</p>
                <p>This pipeline includes operations that cannot be undone.</p>
              </div>
            </div>
          )}

          {/* No documents warning */}
          {summary.documentsAffected === 0 && (
            <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p>No documents match the current filters.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            Cancel
          </Button>
          <Button 
            onClick={handleExecute} 
            disabled={isExecuting || hasErrors || summary.documentsAffected === 0 || summary.operations.length === 0}
            variant={summary.hasDestructiveOperations ? "destructive" : "default"}
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              'Execute'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}