import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, Wand2, FileOutput } from 'lucide-react';
import { expandTemplate } from '../utils/template-utils';

export function PreviewModal({ 
  isOpen, 
  onClose, 
  filters, 
  operations, 
  outputFormat,
  documentCount,
  onExecute 
}) {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute();
      onClose();
    } catch (error) {
      console.error('Execution failed:', error);
      setIsExecuting(false);
    }
  };

  // Generate operation descriptions
  const getOperationDescription = (op) => {
    switch (op.type) {
      case 'rename':
        return `Rename files using template: "${op.config.template}" → Example: "${expandTemplate(op.config.template, { name: 'example' })}"`;
      
      case 'move':
        return `Move files to: ${op.config.destination}`;
      
      case 'delete':
        return `Delete files (this cannot be undone!)`;
      
      case 'update-frontmatter':
        const action = op.config.action;
        if (action === 'add') {
          return `Add frontmatter: ${op.config.key} = "${op.config.value}"`;
        } else if (action === 'update') {
          return `Update frontmatter: ${op.config.key} = "${op.config.value}"`;
        } else if (action === 'remove') {
          return `Remove frontmatter key: ${op.config.key}`;
        }
        return `Update frontmatter`;
      
      default:
        return `Unknown operation: ${op.type}`;
    }
  };

  // Generate filter summary
  const getFilterSummary = () => {
    if (!filters || !filters.conditions || filters.conditions.length === 0) {
      return 'All documents in the vault';
    }

    const summaries = [];
    filters.conditions.forEach(condition => {
      if (condition.field === 'folders' && condition.value?.length > 0) {
        summaries.push(`Documents in ${condition.value.length} folder(s)`);
      } else if (condition.field === 'name') {
        summaries.push(`Name ${condition.operator} "${condition.value}"`);
      } else if (condition.field === 'content') {
        summaries.push(`Content ${condition.operator} "${condition.value}"`);
      } else if (condition.field === 'metadata') {
        summaries.push(`Has frontmatter key: ${condition.value}`);
      } else if (condition.field === 'modified') {
        summaries.push(`Modified ${condition.operator} ${condition.value}`);
      } else if (condition.field === 'size') {
        summaries.push(`Size ${condition.operator} ${condition.value} bytes`);
      }
    });

    return summaries.join(' AND ');
  };

  const hasDestructiveOperations = operations.some(op => op.type === 'delete');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
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
              <p>{getFilterSummary()}</p>
              <p className="font-medium text-foreground mt-1">
                {documentCount} document{documentCount !== 1 ? 's' : ''} selected
              </p>
            </div>
          </div>

          {/* Operations Summary */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wand2 className="h-4 w-4" />
              Operations ({operations.length})
            </div>
            {operations.length === 0 ? (
              <div className="ml-6 text-sm text-muted-foreground">
                No operations configured
              </div>
            ) : (
              <ol className="ml-6 space-y-1 text-sm">
                {operations.map((op, index) => (
                  <li key={op.id} className="flex items-start gap-2">
                    <span className="text-muted-foreground">{index + 1}.</span>
                    <span className={op.type === 'delete' ? 'text-destructive' : ''}>
                      {getOperationDescription(op)}
                    </span>
                  </li>
                ))}
              </ol>
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

          {/* Warning for destructive operations */}
          {hasDestructiveOperations && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Warning: Destructive operations</p>
                <p>This pipeline includes delete operations that cannot be undone.</p>
              </div>
            </div>
          )}

          {/* Info message */}
          {documentCount === 0 && (
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
            disabled={isExecuting || documentCount === 0 || operations.length === 0}
            variant={hasDestructiveOperations ? "destructive" : "default"}
          >
            {isExecuting ? "Executing..." : "Execute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}