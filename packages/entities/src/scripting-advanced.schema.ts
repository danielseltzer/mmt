import { z } from 'zod';
import { ScriptOperationSchema, SelectCriteriaSchema, ExecuteOptionsSchema } from './scripting.schema.js';
import { DocumentSchema } from './document.schema.js';

/**
 * Conditional operation that executes based on a predicate
 */
export const ConditionalOperationSchema = z.object({
  type: z.literal('conditional'),
  condition: z.function().args(DocumentSchema).returns(z.boolean())
    .describe('Predicate function that determines if operation should execute'),
  then: ScriptOperationSchema.describe('Operation to execute if condition is true'),
  else: ScriptOperationSchema.optional().describe('Optional operation to execute if condition is false'),
}).describe('Conditional operation based on document properties');

/**
 * Try-catch operation for error handling
 */
export const TryCatchOperationSchema = z.object({
  type: z.literal('try-catch'),
  try: ScriptOperationSchema.describe('Operation to attempt'),
  catch: ScriptOperationSchema.describe('Operation to execute if try fails'),
  finally: ScriptOperationSchema.optional().describe('Optional operation to always execute'),
}).describe('Error handling operation with try-catch-finally semantics');

/**
 * Parallel execution configuration
 */
export const ParallelConfigSchema = z.object({
  maxConcurrency: z.number().min(1).max(100).default(5)
    .describe('Maximum number of concurrent operations'),
  batchSize: z.number().min(1).optional()
    .describe('Process documents in batches of this size'),
  timeout: z.number().min(1000).optional()
    .describe('Timeout per operation in milliseconds'),
}).describe('Configuration for parallel execution');

/**
 * Parallel operation that processes multiple documents concurrently
 */
export const ParallelOperationSchema = z.object({
  type: z.literal('parallel'),
  operations: z.array(ScriptOperationSchema).min(1)
    .describe('Operations to execute in parallel'),
  config: ParallelConfigSchema.optional(),
}).describe('Execute operations in parallel with configurable concurrency');

/**
 * For-each loop operation
 */
export const ForEachOperationSchema = z.object({
  type: z.literal('forEach'),
  operation: ScriptOperationSchema
    .describe('Operation to execute for each document'),
  parallel: ParallelConfigSchema.optional()
    .describe('Optional parallel execution config'),
}).describe('Execute operation for each document in the set');

/**
 * Map operation that transforms documents
 */
export const MapOperationSchema = z.object({
  type: z.literal('map'),
  transform: z.function().args(DocumentSchema).returns(z.any())
    .describe('Transform function to apply to each document'),
  outputField: z.string().optional()
    .describe('Field name to store result in document metadata'),
}).describe('Map transformation over document set');

/**
 * Reduce operation for aggregation
 */
export const ReduceOperationSchema = z.object({
  type: z.literal('reduce'),
  reducer: z.function().args(z.any(), DocumentSchema).returns(z.any())
    .describe('Reducer function (accumulator, document) => newAccumulator'),
  initialValue: z.any().describe('Initial accumulator value'),
  outputKey: z.string().describe('Key to store result in pipeline context'),
}).describe('Reduce documents to a single value');

/**
 * Pipeline branching for complex workflows
 */
export const BranchOperationSchema: z.ZodType<any> = z.object({
  type: z.literal('branch'),
  branches: z.array(z.object({
    name: z.string().describe('Branch name for identification'),
    condition: z.function().args(DocumentSchema).returns(z.boolean())
      .describe('Condition for documents to enter this branch'),
    pipeline: z.any() // Will be AdvancedOperationPipelineSchema
      .describe('Sub-pipeline to execute for matching documents'),
  })).min(1).describe('Branch definitions'),
  merge: z.enum(['union', 'intersection', 'first']).optional()
    .describe('How to merge results from branches'),
}).describe('Branch pipeline based on conditions');

/**
 * Extended operation type that includes advanced operations
 */
export const AdvancedScriptOperationSchema: z.ZodType<any> = z.union([
  ScriptOperationSchema,
  ConditionalOperationSchema,
  TryCatchOperationSchema,
  ParallelOperationSchema,
  ForEachOperationSchema,
  MapOperationSchema,
  ReduceOperationSchema,
  BranchOperationSchema,
]);

/**
 * Advanced execution options
 */
export const AdvancedExecuteOptionsSchema = ExecuteOptionsSchema.extend({
  parallel: ParallelConfigSchema.optional()
    .describe('Global parallel execution configuration'),
  errorStrategy: z.enum(['fail-fast', 'continue', 'collect']).default('fail-fast')
    .describe('How to handle errors during execution'),
  progress: z.boolean().default(false)
    .describe('Show progress during long-running operations'),
});

/**
 * Advanced operation pipeline with all new features
 */
export const AdvancedOperationPipelineSchema: z.ZodType<any> = z.object({
  select: SelectCriteriaSchema,
  filter: z.function().optional()
    .describe('Optional filter function to further refine selection'),
  operations: z.array(AdvancedScriptOperationSchema).min(1)
    .describe('Operations to perform (including advanced operations)'),
  output: z.any().optional(), // Reuse OutputConfigSchema from base
  options: AdvancedExecuteOptionsSchema.optional(),
  context: z.record(z.string(), z.any()).optional()
    .describe('Pipeline context for storing intermediate values'),
}).describe('Advanced operation pipeline with control flow and error handling');

// Type exports
export type ConditionalOperation = z.infer<typeof ConditionalOperationSchema>;
export type TryCatchOperation = z.infer<typeof TryCatchOperationSchema>;
export type ParallelConfig = z.infer<typeof ParallelConfigSchema>;
export type ParallelOperation = z.infer<typeof ParallelOperationSchema>;
export type ForEachOperation = z.infer<typeof ForEachOperationSchema>;
export type MapOperation = z.infer<typeof MapOperationSchema>;
export type ReduceOperation = z.infer<typeof ReduceOperationSchema>;
export type BranchOperation = z.infer<typeof BranchOperationSchema>;
export type AdvancedScriptOperation = z.infer<typeof AdvancedScriptOperationSchema>;
export type AdvancedExecuteOptions = z.infer<typeof AdvancedExecuteOptionsSchema>;
export type AdvancedOperationPipeline = z.infer<typeof AdvancedOperationPipelineSchema>;
