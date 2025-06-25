import type { DocumentSet } from '../document-set.js';
import * as aq from 'arquero';

/**
 * Filter function that operates on table rows.
 * Returns true to keep the row, false to exclude it.
 */
export type FilterFunction = (row: Record<string, any>) => boolean;

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
  // Apply filter to the table using escaped function for Arquero
  const filtered = (docSet.tableRef as any).filter(aq.escape(predicate));
  
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
      const tags = row.tags || '';
      return tags.includes(tag);
    },
  
  /**
   * Filter by frontmatter field value.
   */
  frontmatter: (field: string, value: any): FilterFunction =>
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
    (row) => new Date(row.modified) > date,
  
  /**
   * Filter by path pattern.
   */
  pathMatches: (pattern: RegExp): FilterFunction =>
    (row) => pattern.test(row.path),
};