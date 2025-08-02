import type { 
  Document, 
  ScriptOperation, 
  FilterCollection,
  OperationPreview,
  PipelinePreviewResponse,
  PipelinePreviewSummary,
  ValidationResult
} from '@mmt/entities';
import { expandTemplate } from '@mmt/document-operations';
import path from 'path';

/**
 * Generates human-readable preview information for pipeline operations
 */
export class PreviewGenerator {
  /**
   * Generate a complete preview for a pipeline
   */
  generatePreview(
    documents: Document[],
    operations: ScriptOperation[],
    filters?: FilterCollection
  ): PipelinePreviewResponse {
    const operationPreviews = this.generateOperationPreviews(documents, operations);
    const validation = this.validateOperations(documents, operations);
    
    const summary: PipelinePreviewSummary = {
      documentsAffected: documents.length,
      operations: operationPreviews,
      hasDestructiveOperations: operations.some(op => op.type === 'delete'),
    };

    return {
      preview: true,
      summary,
      documents,
      validation,
      filterDescription: filters ? this.describeFilters(filters) : undefined,
    };
  }

  /**
   * Generate preview information for each operation
   */
  private generateOperationPreviews(
    documents: Document[],
    operations: ScriptOperation[]
  ): OperationPreview[] {
    return operations.map(operation => {
      const examples = this.generateExamples(documents, operation);
      const description = this.describeOperation(operation);
      const warnings = this.getOperationWarnings(operation, documents);
      
      return {
        type: operation.type,
        description,
        examples,
        warnings: warnings.length > 0 ? warnings : undefined,
        affectedCount: documents.length,
      };
    });
  }

  /**
   * Generate human-readable description of an operation
   */
  private describeOperation(operation: ScriptOperation): string {
    switch (operation.type) {
      case 'rename':
        return `Rename files using template: "${(operation as any).newName}"`;
      
      case 'move':
        return `Move files to: ${(operation as any).destination}`;
      
      case 'delete':
        return `Delete files${(operation as any).permanent ? ' permanently' : ' (to trash)'}`;
      
      case 'updateFrontmatter':
        const updates = (operation as any).updates;
        if (!updates) return 'Update frontmatter';
        const updateEntries = Object.entries(updates);
        if (updateEntries.length === 1) {
          const [key, value] = updateEntries[0];
          return `Set frontmatter: ${key} = "${value}"`;
        }
        return `Update ${updateEntries.length} frontmatter fields`;
      
      default:
        return `${operation.type} operation`;
    }
  }

  /**
   * Generate examples showing before/after for an operation
   */
  private generateExamples(
    documents: Document[],
    operation: ScriptOperation
  ): Array<{ from: string; to: string; document?: string }> {
    // Take up to 3 examples
    const sampleDocs = documents.slice(0, 3);
    
    switch (operation.type) {
      case 'rename':
        return sampleDocs.map(doc => {
          const newName = expandTemplate((operation as any).newName || '', {
            name: path.basename(doc.path, path.extname(doc.path)),
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            counter: 1,
          });
          return {
            from: path.basename(doc.path),
            to: newName,
          };
        });
      
      case 'move':
        return sampleDocs.map(doc => ({
          from: doc.path,
          to: path.join((operation as any).destination || '', path.basename(doc.path)),
          document: path.basename(doc.path),
        }));
      
      case 'delete':
        return sampleDocs.map(doc => ({
          from: doc.path,
          to: (operation as any).permanent ? '[Permanently deleted]' : '[Moved to trash]',
          document: path.basename(doc.path),
        }));
      
      case 'updateFrontmatter':
        const frontmatterUpdates = (operation as any).updates;
        if (!frontmatterUpdates || Object.keys(frontmatterUpdates).length === 0) {
          return [];
        }
        
        const [key, value] = Object.entries(frontmatterUpdates)[0];
        return sampleDocs.map(doc => {
          const currentValue = doc.metadata.frontmatter?.[key];
          return {
            from: currentValue ? `${key}: ${currentValue}` : `${key}: [not set]`,
            to: `${key}: ${value}`,
            document: path.basename(doc.path),
          };
        });
      
      default:
        return [];
    }
  }

  /**
   * Get warnings for an operation
   */
  private getOperationWarnings(
    operation: ScriptOperation,
    documents: Document[]
  ): string[] {
    const warnings: string[] = [];
    
    switch (operation.type) {
      case 'delete':
        if ((operation as any).permanent) {
          warnings.push('This operation will permanently delete files and cannot be undone');
        }
        warnings.push(`${documents.length} files will be deleted`);
        break;
      
      case 'move':
        // Check if destination exists
        // Note: In a real implementation, we'd check the filesystem
        if (documents.length > 10) {
          warnings.push(`Moving ${documents.length} files - this may take some time`);
        }
        break;
      
      case 'rename':
        // Check for potential naming conflicts
        const nameMap = new Map<string, number>();
        documents.forEach(doc => {
          const newName = expandTemplate((operation as any).newName || '', {
            name: path.basename(doc.path, path.extname(doc.path)),
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString(),
            counter: 1,
          });
          nameMap.set(newName, (nameMap.get(newName) || 0) + 1);
        });
        
        const conflicts = Array.from(nameMap.entries())
          .filter(([_, count]) => count > 1);
        
        if (conflicts.length > 0) {
          warnings.push('Warning: Template may produce duplicate filenames');
        }
        break;
    }
    
    return warnings;
  }

  /**
   * Validate operations without executing them
   */
  private validateOperations(
    documents: Document[],
    operations: ScriptOperation[]
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic validation
    if (documents.length === 0) {
      warnings.push('No documents selected');
    }
    
    if (operations.length === 0) {
      errors.push('No operations specified');
    }
    
    // Operation-specific validation
    operations.forEach(op => {
      switch (op.type) {
        case 'rename':
          if (!(op as any).newName) {
            errors.push('Rename operation requires a template');
          }
          break;
        
        case 'move':
          if (!(op as any).destination) {
            errors.push('Move operation requires a destination');
          }
          break;
        
        case 'updateFrontmatter':
          if (!(op as any).updates || Object.keys((op as any).updates || {}).length === 0) {
            errors.push('Update frontmatter operation requires at least one field');
          }
          break;
      }
    });
    
    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Generate human-readable description of filters
   */
  private describeFilters(filters: FilterCollection): string {
    if (!filters.conditions || filters.conditions.length === 0) {
      return 'All documents';
    }
    
    const descriptions = filters.conditions.map(condition => {
      switch (condition.field) {
        case 'name':
          return `name ${condition.operator} "${condition.value}"`;
        case 'content':
          return `content ${condition.operator} "${condition.value}"`;
        case 'folders':
          return `in folders: ${Array.isArray(condition.value) ? condition.value.join(', ') : condition.value}`;
        case 'metadata':
          return `has frontmatter: ${condition.value}`;
        case 'modified':
          return `modified ${condition.operator} ${condition.value}`;
        case 'size':
          return `size ${condition.operator} ${condition.value} bytes`;
        default:
          return `${condition.field} ${condition.operator} ${condition.value}`;
      }
    });
    
    return descriptions.join(filters.logic === 'OR' ? ' OR ' : ' AND ');
  }
}