/**
 * @fileoverview UI configuration schemas for table views and display settings.
 * 
 * This file defines schemas for UI-related configurations, particularly for
 * the table view component that displays document collections. These schemas
 * enable persistent view configurations and customizable displays.
 */

import { z } from 'zod';

/**
 * Configuration for a single table column.
 * 
 * Columns are configurable to show different document properties with
 * custom widths and visibility. This allows users to create personalized
 * views of their document collections.
 * 
 * @example
 * ```typescript
 * const column: ColumnConfig = {
 *   id: 'title',
 *   label: 'Title',
 *   field: 'metadata.frontmatter.title',
 *   width: 300,
 *   visible: true
 * };
 * ```
 */
export const ColumnConfigSchema = z.object({
  /** Unique identifier for this column */
  id: z.string().describe('Column identifier'),
  
  /** Display name shown in column header */
  label: z.string().describe('Display label'),
  
  /** Dot-notation path to the document field to display */
  field: z.string().describe('Document field to display'),
  
  /** Column width in pixels (optional, auto-sizes if not specified) */
  width: z.number().optional().describe('Column width'),
  
  /** Whether this column is currently visible */
  visible: z.boolean().default(true).describe('Column visibility'),
});

export type ColumnConfig = z.infer<typeof ColumnConfigSchema>;

/**
 * Complete table view configuration.
 * 
 * This schema defines all aspects of how a document table is displayed,
 * including which columns to show, row heights, and performance settings.
 * Configurations can be saved and restored to maintain user preferences.
 * 
 * @example Default configuration
 * ```typescript
 * const config: TableViewConfig = {
 *   columns: [
 *     { id: 'name', label: 'Name', field: 'metadata.name', visible: true },
 *     { id: 'modified', label: 'Modified', field: 'metadata.modified', visible: true },
 *     { id: 'tags', label: 'Tags', field: 'metadata.tags', visible: true }
 *   ],
 *   rowHeight: 32,
 *   maxRows: 500
 * };
 * ```
 * 
 * @example Custom configuration with frontmatter fields
 * ```typescript
 * const config: TableViewConfig = {
 *   columns: [
 *     { id: 'title', label: 'Title', field: 'metadata.frontmatter.title', width: 400 },
 *     { id: 'status', label: 'Status', field: 'metadata.frontmatter.status', width: 100 },
 *     { id: 'priority', label: 'Priority', field: 'metadata.frontmatter.priority', width: 80 },
 *     { id: 'size', label: 'Size', field: 'metadata.size', width: 100 }
 *   ],
 *   rowHeight: 40,
 *   maxRows: 1000
 * };
 * ```
 */
export const TableViewConfigSchema = z.object({
  /** Ordered array of column configurations */
  columns: z.array(ColumnConfigSchema).describe('Column configurations'),
  
  /** Height of each row in pixels (affects density and readability) */
  rowHeight: z.number().default(32).describe('Row height in pixels'),
  
  /** Maximum number of rows to render (for performance with large datasets) */
  maxRows: z.number().default(500).describe('Maximum rows to display'),
});

export type TableViewConfig = z.infer<typeof TableViewConfigSchema>;