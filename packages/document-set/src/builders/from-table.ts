import * as aq from 'arquero';
import { DocumentSet } from '../document-set.js';
import { getRowCount, sliceTable } from '../table-utils.js';

// Arquero doesn't export Table type properly, so we use the instance type
type Table = ReturnType<typeof aq.table>;

export interface FromTableOptions {
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
   * The original query that produced this table (if any).
   */
  sourceQuery?: import('@mmt/entities').QueryInput;
  
  /**
   * Query execution time in milliseconds.
   */
  executionTime?: number;
  
  /**
   * Materialize documents immediately.
   * Default: false (lazy loading)
   */
  materialize?: boolean;
}

/**
 * Creates a DocumentSet from an Arquero table.
 * This is typically used when converting analysis results back
 * into a DocumentSet for further operations.
 * 
 * @param table - Arquero table containing document data
 * @param options - Options for creating the set
 * @returns A new DocumentSet
 * @throws Error if row count exceeds limit and overrideLimit is false
 */
export async function fromTable(
  table: Table,
  options: FromTableOptions = {}
): Promise<DocumentSet> {
  const {
    limit = 500,
    overrideLimit = false,
    sourceQuery,
    executionTime,
    materialize = false,
  } = options;
  
  const rowCount = getRowCount(table);
  
  // Apply limit if needed
  const limitedTable = rowCount > limit && !overrideLimit 
    ? sliceTable(table, 0, limit)
    : table;
  
  // Create the document set
  const docSet = new DocumentSet({
    tableRef: limitedTable,
    sourceQuery,
    limit,
    executionTime,
  });
  
  // Materialize if requested
  if (materialize) {
    await docSet.materialize();
  }
  
  return docSet;
}