/**
 * @fileoverview Central export point for all MMT entity schemas.
 * 
 * This file re-exports all schemas and types from their respective modules,
 * providing a single import point for consumers of the entities package.
 * It also handles any schemas that require cross-references between modules.
 */

import { z } from 'zod';

// Re-export all schemas and types from individual modules
export * from './config.schema.js';
export * from './document.schema.js';
export * from './document-set.schema.js';
export * from './query.schema.js';
export * from './operation.schema.js';
export * from './vault.schema.js';
export * from './ui.schema.js';
export * from './scripting.schema.js';

// Import schemas needed for cross-references
import { DocumentSchema } from './document.schema.js';
import { QueryInputSchema } from './query.schema.js';

// Define DocumentSetSchema here to avoid circular dependencies
/**
 * Collection of documents with optional source information.
 * 
 * Document sets are the result of queries or operations. They maintain
 * information about how they were created, which is useful for refreshing
 * results or understanding data lineage.
 */
export const DocumentSetSchema = z.object({
  /** Unique identifier for this document set */
  id: z.string().describe('Unique identifier'),
  
  /** Array of documents in this collection */
  documents: z.array(DocumentSchema).describe('Documents in this set'),
  
  /** How this set was created (query or operation description) */
  source: z.union([
    QueryInputSchema,
    z.string().describe('Operation that created this set'),
  ]).optional().describe('How this set was created'),
});

export type DocumentSet = z.infer<typeof DocumentSetSchema>;

// Import all schemas for the convenience export
import { ConfigSchema, AppContextSchema } from './config.schema.js';
import { 
  BaseDocumentMetadataSchema,
  DocumentMetadataSchema,
} from './document.schema.js';
import {
  QueryOperatorSchema,
  QuerySchema,
  StructuredQuerySchema,
} from './query.schema.js';
import {
  MoveOperationSchema,
  UpdateFrontmatterOperationSchema,
  RemoveFrontmatterOperationSchema,
  DeleteOperationSchema,
  CreateOperationSchema,
  OperationSchema,
} from './operation.schema.js';
import {
  VaultIndexSchema,
  VaultSchema,
  VaultContextSchema,
  LinkUpdateSchema,
  ExecutionResultSchema,
  SnapshotSchema,
  FileOperationResultSchema,
  IndexUpdateEventSchema,
} from './vault.schema.js';
import {
  ColumnConfigSchema,
  TableViewConfigSchema,
} from './ui.schema.js';
import {
  SelectCriteriaSchema,
  OperationTypeSchema,
  ScriptOperationSchema,
  OutputFormatSchema,
  OutputConfigSchema,
  ExecuteOptionsSchema,
  ExecutionOptionsSchema,
  OperationPipelineSchema,
  ScriptContextSchema,
  SuccessResultSchema,
  FailureResultSchema,
  SkippedResultSchema,
  ExecutionStatsSchema,
  ScriptExecutionResultSchema,
} from './scripting.schema.js';
import {
  OperationReadyDocumentSetSchema,
  ToDocumentSetOptionsSchema,
} from './document-set.schema.js';

/**
 * Convenience export of all schemas grouped by domain.
 * This maintains backward compatibility with the previous single-file structure.
 */
export const schemas = {
  // Core objects
  Config: ConfigSchema,
  AppContext: AppContextSchema,
  BaseDocumentMetadata: BaseDocumentMetadataSchema,
  DocumentMetadata: DocumentMetadataSchema,
  Document: DocumentSchema,
  DocumentSet: DocumentSetSchema,
  
  // Query and operations
  QueryOperator: QueryOperatorSchema,
  QueryInput: QueryInputSchema,
  Query: QuerySchema, // Alias for QueryInput
  StructuredQuery: StructuredQuerySchema,
  MoveOperation: MoveOperationSchema,
  UpdateFrontmatterOperation: UpdateFrontmatterOperationSchema,
  RemoveFrontmatterOperation: RemoveFrontmatterOperationSchema,
  DeleteOperation: DeleteOperationSchema,
  CreateOperation: CreateOperationSchema,
  Operation: OperationSchema,
  
  // Vault and execution
  VaultIndex: VaultIndexSchema,
  Vault: VaultSchema,
  VaultContext: VaultContextSchema,
  LinkUpdate: LinkUpdateSchema,
  ExecutionResult: ExecutionResultSchema,
  
  // UI and persistence
  Snapshot: SnapshotSchema,
  ColumnConfig: ColumnConfigSchema,
  TableViewConfig: TableViewConfigSchema,
  
  // Events and results
  FileOperationResult: FileOperationResultSchema,
  IndexUpdateEvent: IndexUpdateEventSchema,
  
  // Scripting
  SelectCriteria: SelectCriteriaSchema,
  OperationType: OperationTypeSchema,
  ScriptOperation: ScriptOperationSchema,
  OutputFormat: OutputFormatSchema,
  OutputConfig: OutputConfigSchema,
  ExecuteOptions: ExecuteOptionsSchema,
  ExecutionOptions: ExecutionOptionsSchema,
  OperationPipeline: OperationPipelineSchema,
  ScriptContext: ScriptContextSchema,
  SuccessResult: SuccessResultSchema,
  FailureResult: FailureResultSchema,
  SkippedResult: SkippedResultSchema,
  ExecutionStats: ExecutionStatsSchema,
  ScriptExecutionResult: ScriptExecutionResultSchema,
  
  // Document sets
  OperationReadyDocumentSet: OperationReadyDocumentSetSchema,
  ToDocumentSetOptions: ToDocumentSetOptionsSchema,
} as const;