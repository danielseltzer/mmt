import type { Document } from '@mmt/entities';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import type { VaultIndexer } from '@mmt/indexer';

/**
 * Supported operation types
 */
export type OperationType = 
  | 'move'
  | 'rename'
  | 'updateFrontmatter'
  | 'delete'
  | 'transform';

/**
 * Result of validating an operation
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  errors?: ValidationError[];
}

/**
 * Validation error details
 */
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
}

/**
 * Preview of what an operation will do
 */
export interface OperationPreview {
  type: OperationType;
  source: string;
  target?: string;
  changes: FileChange[];
}

/**
 * A single change that will be made
 */
export interface FileChange {
  type: 'file-move' | 'file-rename' | 'file-delete' | 'link-update' | 'frontmatter-update';
  file: string;
  description: string;
  before?: string;
  after?: string;
}

/**
 * Result of executing an operation
 */
export interface OperationResult {
  success: boolean;
  document?: Document;
  error?: string;
  dryRun?: boolean;
  backup?: {
    originalPath: string;
    backupPath: string;
  };
  rollback?: () => Promise<void>;
}

/**
 * Options for operation execution
 */
export interface OperationOptions {
  dryRun: boolean;
  updateLinks: boolean;
  createBackup: boolean;
  continueOnError: boolean;
  allowOutsideVault?: boolean;
}

/**
 * Context provided to operations
 */
export interface OperationContext {
  vault: {
    path: string;
  };
  fs: FileSystemAccess;
  indexer: VaultIndexer;
  options: OperationOptions;
}

/**
 * Core interface for all document operations
 */
export interface DocumentOperation {
  readonly type: OperationType;
  
  /**
   * Validate if this operation can be performed
   */
  validate(doc: Document, context: OperationContext): Promise<ValidationResult>;
  
  /**
   * Preview what this operation will do
   */
  preview(doc: Document, context: OperationContext): Promise<OperationPreview>;
  
  /**
   * Execute the operation
   */
  execute(doc: Document, context: OperationContext): Promise<OperationResult>;
}

/**
 * Factory function for creating operations
 */
export type OperationFactory<T = any> = (options: T) => DocumentOperation;