/**
 * Typed utility functions for working with Arquero tables
 * 
 * These utilities provide type safety when working with Arquero's
 * dynamically typed API. They act as a boundary between our typed
 * domain and Arquero's untyped operations.
 */

import * as aq from 'arquero';
import type { DocumentRow } from './types.js';

// Arquero doesn't export Table type properly, so we use the instance type
type Table = ReturnType<typeof aq.table>;

/**
 * Extract typed document rows from an Arquero table
 */
export function getDocumentRows(table: Table): DocumentRow[] {
  return table.objects() as DocumentRow[];
}

/**
 * Filter a table with a typed predicate function
 */
export function filterDocuments(
  table: Table, 
  predicate: (row: DocumentRow) => boolean
): Table {
  // Cast needed because Arquero's filter returns untyped result
  // Arquero's filter method is not properly typed
  const filtered = table.filter(aq.escape(predicate));
  return filtered as unknown as Table;
}

/**
 * Slice a table to get a subset of rows
 */
export function sliceTable(table: Table, start: number, end?: number): Table {
  // Arquero's slice method is not properly typed
  const sliced = table.slice(start, end);
  return sliced as unknown as Table;
}

/**
 * Get the first row from a table as a typed document row
 */
export function getFirstRow(table: Table): DocumentRow | undefined {
  const rows = getDocumentRows(table);
  return rows[0];
}

/**
 * Count the number of rows in a table
 */
export function getRowCount(table: Table): number {
  return table.numRows();
}

/**
 * Count the number of columns in a table
 */
export function getColumnCount(table: Table): number {
  return table.numCols();
}

/**
 * Get column names from a table
 */
export function getColumnNames(table: Table): string[] {
  return table.columnNames();
}