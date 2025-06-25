import type { Document } from '@mmt/entities';
import type { DocumentSet } from '../document-set.js';

/**
 * Materializes the documents in a DocumentSet.
 * This converts the lazy Arquero table representation into
 * actual Document objects that can be used for mutations.
 * 
 * @param docSet - The DocumentSet to materialize
 * @returns Array of materialized documents
 */
export async function materialize(
  docSet: DocumentSet
): Promise<Document[]> {
  return docSet.materialize();
}

/**
 * Checks if a DocumentSet has been materialized.
 * 
 * @param docSet - The DocumentSet to check
 * @returns True if documents have been materialized
 */
export function isMaterialized(docSet: DocumentSet): boolean {
  return docSet.isMaterialized;
}