import type { DocumentSet } from '../document-set.js';
import type { DocumentRow } from '../types.js';
import { filterDocuments } from '../table-utils.js';

/**
 * Filter function that operates on table rows.
 * Returns true to keep the row, false to exclude it.
 */
export type FilterFunction = (row: DocumentRow) => boolean;

/**
 * Filters a DocumentSet based on a predicate function.
 * This creates a new DocumentSet containing only the documents
 * that match the filter criteria.
 * 
 * @param docSet - The DocumentSet to filter
 * @param predicate - Function that returns true for documents to keep
 * @returns A new filtered DocumentSet
 */
export function filter(
  docSet: DocumentSet,
  predicate: FilterFunction
): DocumentSet {
  // Apply filter to the table using typed utility
  const filtered = filterDocuments(docSet.tableRef, predicate);
  
  // Create new DocumentSet with filtered table
  return docSet.withTable(filtered);
}

/**
 * Common filter predicates for convenience.
 */
export const filters = {
  /**
   * Filter by tag.
   */
  hasTag: (tag: string): FilterFunction => 
    (row) => {
      const { tags } = row;
      if (typeof tags === 'string') {
        return tags.includes(tag);
      }
      if (Array.isArray(tags)) {
        return tags.includes(tag);
      }
      return false;
    },
  
  /**
   * Filter by frontmatter field value.
   */
  frontmatter: (field: string, value: unknown): FilterFunction =>
    (row) => row[`fm_${field}`] === value,
  
  /**
   * Filter by file size.
   */
  sizeGreaterThan: (bytes: number): FilterFunction =>
    (row) => row.size > bytes,
  
  /**
   * Filter by modification date.
   */
  modifiedAfter: (date: Date): FilterFunction =>
    (row) => {
      const { modified } = row;
      if (modified instanceof Date) {
        return modified > date;
      }
      if (typeof modified === 'string') {
        return new Date(modified) > date;
      }
      return false;
    },
  
  /**
   * Filter by path pattern.
   */
  pathMatches: (pattern: RegExp): FilterFunction =>
    (row) => pattern.test(row.path),
};