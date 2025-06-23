import type { Document } from '@mmt/entities';
import type { 
  DocumentOperation, 
  OperationContext, 
  ValidationResult, 
  OperationPreview, 
  OperationResult 
} from '../types.js';

export interface MoveOperationOptions {
  targetPath: string | ((doc: Document) => string);
  overwrite?: boolean;
}

export class MoveOperation implements DocumentOperation {
  readonly type = 'move' as const;

  constructor(private options: MoveOperationOptions) {}

  async validate(doc: Document, context: OperationContext): Promise<ValidationResult> {
    // TODO: Implement validation
    return { valid: true };
  }

  async preview(doc: Document, context: OperationContext): Promise<OperationPreview> {
    // TODO: Implement preview
    return {
      type: 'move',
      source: doc.path,
      target: this.getTargetPath(doc),
      changes: []
    };
  }

  async execute(doc: Document, context: OperationContext): Promise<OperationResult> {
    // TODO: Implement execution
    return {
      success: true,
      document: doc
    };
  }

  private getTargetPath(doc: Document): string {
    return typeof this.options.targetPath === 'function'
      ? this.options.targetPath(doc)
      : this.options.targetPath;
  }
}