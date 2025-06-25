import type { DocumentSet } from '../document-set.js';

/**
 * Applies a limit to a DocumentSet, creating a new set with
 * at most the specified number of documents.
 * 
 * @param docSet - The DocumentSet to limit
 * @param maxDocuments - Maximum number of documents to include
 * @returns A new limited DocumentSet
 */
export function limit(
  docSet: DocumentSet,
  maxDocuments: number
): DocumentSet {
  if (maxDocuments < 1) {
    throw new Error('Limit must be at least 1');
  }
  
  // If already within limit, return as-is
  if (docSet.size <= maxDocuments) {
    return docSet;
  }
  
  // Create new limited set
  return docSet.withLimit(maxDocuments);
}