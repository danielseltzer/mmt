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
export * from './cli.schema.js';

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

// Import the CommandResults helper for re-export
import { CommandResults } from './cli.schema.js';

// Also export the CommandResults helper
export { CommandResults };

// Export API schemas for REST endpoints
export * from './api-schemas.js';

// Export filter criteria schemas
export * from './filter-criteria.js';

// Export natural language parsers
export * from './date-parser.js';
export * from './size-parser.js';

// Export declarative filter schemas
export * from './filter.schema.js';

// Export preview schemas
export * from './preview.schema.js';