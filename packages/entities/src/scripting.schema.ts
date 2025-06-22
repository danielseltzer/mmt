import { z } from 'zod';
import { DocumentSchema } from './document.schema.js';

/**
 * Selection criteria for finding documents
 */
export const SelectCriteriaSchema = z.union([
  // Query-based selection (e.g., { 'fm:status': 'draft' })
  z.record(z.string(), z.any()),
  
  // Explicit file list
  z.object({
    files: z.array(z.string()).min(1),
  }),
  
  // Combined selection
  z.intersection(
    z.record(z.string(), z.any()),
    z.object({
      files: z.array(z.string()).optional(),
    })
  ),
]).describe('Criteria for selecting documents');

/**
 * Operation types that can be performed on documents
 */
export const OperationTypeSchema = z.enum([
  // Mutations (require destructive: true)
  'move',
  'rename', 
  'updateFrontmatter',
  'delete',
  // Analysis (always safe)
  'analyze',
  'transform',
  'aggregate',
  // Legacy
  'custom',
]).describe('Type of operation to perform');

/**
 * Script operation structure (distinct from vault operations)
 */
export const ScriptOperationSchema = z.object({
  type: OperationTypeSchema,
}).passthrough().describe('Operation to perform on selected documents');

/**
 * Output format preferences
 */
export const OutputFormatSchema = z.enum([
  'summary',
  'detailed',
  'csv',
  'json',
  'table',
]).describe('Output format for results');

/**
 * Single output specification
 */
export const OutputSpecSchema = z.object({
  format: OutputFormatSchema,
  destination: z.enum(['console', 'file']).default('console'),
  path: z.string().optional().describe('File path when destination is file'),
  fields: z.array(z.string()).optional().describe('Fields to include in csv/json output'),
}).refine(
  (data) => data.destination === 'console' || (data.destination === 'file' && data.path),
  { message: 'Path is required when destination is file' }
).describe('Single output specification');

/**
 * Output configuration - array of output specifications
 */
export const OutputConfigSchema = z.array(OutputSpecSchema).min(1)
  .describe('Output configuration - one or more output destinations');

/**
 * Execution options for mutation operations
 */
export const ExecuteOptionsSchema = z.object({
  destructive: z.boolean().default(false).describe('Actually perform mutations (default is preview)'),
  confirmCount: z.boolean().default(false).describe('Fail if document count changes unexpectedly'),
  maxDocuments: z.number().optional().describe('Maximum documents to affect (fails if exceeded)'),
  continueOnError: z.boolean().default(false).describe('Continue processing after errors'),
}).describe('Execution options for mutations');

/**
 * Legacy execution options (deprecated)
 */
export const ExecutionOptionsSchema = z.object({
  executeNow: z.boolean().default(false).describe('Execute operations (default is preview-only)'),
  failFast: z.boolean().default(false).describe('Stop on first error'),
  parallel: z.boolean().default(false).describe('Execute operations in parallel'),
}).describe('Execution options');

/**
 * Operation pipeline - the core schema that scripts produce
 */
export const OperationPipelineSchema = z.object({
  select: SelectCriteriaSchema,
  filter: z.function().optional()
    .describe('Optional filter function to further refine selection'),
  operations: z.array(ScriptOperationSchema).min(1).describe('Operations to perform'),
  output: OutputConfigSchema.optional(),
  options: ExecutionOptionsSchema.optional(),
}).describe('Complete operation pipeline definition');

/**
 * Script context provided to scripts
 */
export const ScriptContextSchema = z.object({
  vaultPath: z.string().describe('Absolute path to the vault'),
  indexPath: z.string().describe('Absolute path to the index'),
  scriptPath: z.string().describe('Path to the executing script'),
  cliOptions: z.record(z.string(), z.any()).describe('Options passed from CLI'),
  indexer: z.any().describe('Vault indexer instance for queries'),
}).describe('Context provided to scripts');

/**
 * Result item for successful operations
 */
export const SuccessResultSchema = z.object({
  item: DocumentSchema,
  operation: ScriptOperationSchema,
  details: z.any().optional(),
});

/**
 * Result item for failed operations
 */
export const FailureResultSchema = z.object({
  item: DocumentSchema,
  operation: ScriptOperationSchema,
  error: z.instanceof(Error),
});

/**
 * Result item for skipped operations
 */
export const SkippedResultSchema = z.object({
  item: DocumentSchema,
  operation: ScriptOperationSchema,
  reason: z.string(),
});

/**
 * Execution statistics
 */
export const ExecutionStatsSchema = z.object({
  duration: z.number().describe('Execution time in milliseconds'),
  startTime: z.date(),
  endTime: z.date(),
});

/**
 * Script execution result
 */
export const ScriptExecutionResultSchema = z.object({
  attempted: z.array(DocumentSchema),
  succeeded: z.array(SuccessResultSchema),
  failed: z.array(FailureResultSchema),
  skipped: z.array(SkippedResultSchema),
  stats: ExecutionStatsSchema,
}).describe('Complete execution result');

// Type exports
export type SelectCriteria = z.infer<typeof SelectCriteriaSchema>;
export type ScriptOperation = z.infer<typeof ScriptOperationSchema>;
export type OperationType = z.infer<typeof OperationTypeSchema>;
export type OutputFormat = z.infer<typeof OutputFormatSchema>;
export type OutputSpec = z.infer<typeof OutputSpecSchema>;
export type OutputConfig = z.infer<typeof OutputConfigSchema>;
export type ExecuteOptions = z.infer<typeof ExecuteOptionsSchema>;
export type ExecutionOptions = z.infer<typeof ExecutionOptionsSchema>;
export type OperationPipeline = z.infer<typeof OperationPipelineSchema>;
export type ScriptContext = z.infer<typeof ScriptContextSchema>;
export type SuccessResult = z.infer<typeof SuccessResultSchema>;
export type FailureResult = z.infer<typeof FailureResultSchema>;
export type SkippedResult = z.infer<typeof SkippedResultSchema>;
export type ExecutionStats = z.infer<typeof ExecutionStatsSchema>;
export type ScriptExecutionResult = z.infer<typeof ScriptExecutionResultSchema>;