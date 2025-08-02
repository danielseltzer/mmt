import { z } from 'zod';
import { DocumentSchema } from './document.schema.js';
import { ScriptOperationSchema } from './scripting.schema.js';

/**
 * Example showing before/after for an operation
 */
export const OperationExampleSchema = z.object({
  from: z.string().describe('Original value'),
  to: z.string().describe('Result after operation'),
  document: z.string().optional().describe('Document name for context'),
});

/**
 * Description of a single operation with examples
 */
export const OperationPreviewSchema = z.object({
  type: z.string().describe('Operation type'),
  description: z.string().describe('Human-readable description'),
  examples: z.array(OperationExampleSchema).describe('Example transformations'),
  warnings: z.array(z.string()).optional().describe('Potential issues or risks'),
  affectedCount: z.number().describe('Number of documents affected'),
});

/**
 * Validation result for an operation
 */
export const ValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

/**
 * Preview summary for the entire pipeline
 */
export const PipelinePreviewSummarySchema = z.object({
  documentsAffected: z.number().describe('Total documents that will be modified'),
  operations: z.array(OperationPreviewSchema).describe('Preview of each operation'),
  hasDestructiveOperations: z.boolean().describe('Whether pipeline includes delete operations'),
  estimatedDuration: z.number().optional().describe('Estimated time in milliseconds'),
});

/**
 * Complete preview response
 */
export const PipelinePreviewResponseSchema = z.object({
  preview: z.literal(true).describe('Indicates this is a preview response'),
  summary: PipelinePreviewSummarySchema,
  documents: z.array(DocumentSchema).describe('Documents that will be affected'),
  validation: ValidationResultSchema,
  filterDescription: z.string().optional().describe('Human-readable description of filters applied'),
});

// Type exports
export type OperationExample = z.infer<typeof OperationExampleSchema>;
export type OperationPreview = z.infer<typeof OperationPreviewSchema>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
export type PipelinePreviewSummary = z.infer<typeof PipelinePreviewSummarySchema>;
export type PipelinePreviewResponse = z.infer<typeof PipelinePreviewResponseSchema>;