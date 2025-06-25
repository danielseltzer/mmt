/**
 * @mmt/document-set - Core DocumentSet abstraction for MMT
 * 
 * This package provides DocumentSet, the central abstraction for working with
 * collections of documents in MMT. A DocumentSet represents "a set of documents
 * that can be operated on" and serves as the common currency between different
 * parts of the system.
 * 
 * Key features:
 * - Multiple builders (from query, documents, or table)
 * - Lazy evaluation with on-demand materialization
 * - Rich metadata about the set
 * - Operations for filtering and limiting
 * - Conversion between formats
 */

// Core class
export { DocumentSet } from './document-set.js';

// Builders
export { fromDocuments, type FromDocumentsOptions } from './builders/from-documents.js';
export { fromQuery, type FromQueryOptions } from './builders/from-query.js';
export { fromTable, type FromTableOptions } from './builders/from-table.js';

// Operations
export { filter, filters, type FilterFunction } from './operations/filter.js';
export { limit } from './operations/limit.js';
export { materialize, isMaterialized } from './operations/materialize.js';

// Converters
export { documentsToTable } from './converters/documents-to-table.js';

// Re-export types from entities that are commonly used with DocumentSet
export type {
  Document,
  OperationReadyDocumentSet,
  ToDocumentSetOptions,
} from '@mmt/entities';