import { z } from 'zod';
import { DocumentSchema } from './document.schema.js';
import { QuerySchema } from './query.schema.js';

/**
 * Operation-ready document set that can be passed to mutation operations.
 * This represents a collection of documents that have been selected and
 * potentially transformed through analytical operations.
 */
export const OperationReadyDocumentSetSchema = z.object({
  _type: z.literal('DocumentSet'),
  
  // Original query that produced this set
  sourceQuery: QuerySchema.optional(),
  
  // Number of documents in the set
  documentCount: z.number().min(0),
  
  // Maximum number of documents allowed (default 500)
  limit: z.number().default(500),
  
  // Lazy Arquero table reference - validated at runtime
  tableRef: z.custom<any>((val) => {
    // Runtime check that it's a Table-like object
    return val && typeof val === 'object' && 
           'numRows' in val && 
           'numCols' in val &&
           typeof val.filter === 'function';
  }, {
    message: "Expected Arquero Table instance"
  }),
  
  // Only materialized if explicitly requested
  documents: z.array(DocumentSchema).optional(),
  
  // Metadata about the set
  metadata: z.object({
    createdAt: z.date(),
    queryExecutionTime: z.number().describe('Query execution time in ms'),
    isComplete: z.boolean().describe('False if limited by max documents'),
    fields: z.array(z.string()).describe('Available fields in the table'),
  })
});

/**
 * Options for creating a document set from analysis results
 */
export const ToDocumentSetOptionsSchema = z.object({
  limit: z.number().default(500).describe('Maximum documents to include'),
  overrideLimit: z.boolean().default(false).describe('Allow exceeding default limit'),
  materialize: z.boolean().default(false).describe('Materialize documents array immediately'),
});

// Type exports
export type OperationReadyDocumentSet = z.infer<typeof OperationReadyDocumentSetSchema>;
export type ToDocumentSetOptions = z.infer<typeof ToDocumentSetOptionsSchema>;