import type { Document } from '@mmt/entities';
import { DocumentSet } from '../document-set.js';
import { documentsToTable } from '../converters/documents-to-table.js';

export interface FromDocumentsOptions {
  /**
   * Maximum number of documents to include in the set.
   * Default: 500
   */
  limit?: number;
  
  /**
   * Allow exceeding the default limit.
   * Default: false
   */
  overrideLimit?: boolean;
  
  /**
   * Materialize documents immediately.
   * Default: false (lazy loading)
   */
  materialize?: boolean;
}

/**
 * Creates a DocumentSet from an array of documents.
 * This is the simplest way to create a DocumentSet when you
 * already have documents in memory.
 * 
 * @param documents - Array of documents to include
 * @param options - Options for creating the set
 * @returns A new DocumentSet
 * @throws Error if document count exceeds limit and overrideLimit is false
 */
export async function fromDocuments(
  documents: Document[],
  options: FromDocumentsOptions = {}
): Promise<DocumentSet> {
  const {
    limit = 500,
    overrideLimit = false,
    materialize = false,
  } = options;
  
  // Check document count against limit
  if (documents.length > limit && !overrideLimit) {
    throw new Error(
      `Document array contains ${documents.length} documents, exceeding the limit of ${limit}. ` +
      `Use overrideLimit: true to proceed anyway.`
    );
  }
  
  // Convert to table
  const table = documentsToTable(documents);
  
  // Create the document set
  const docSet = new DocumentSet({
    tableRef: table,
    limit,
  });
  
  // Materialize if requested
  if (materialize) {
    await docSet.materialize();
  }
  
  return docSet;
}