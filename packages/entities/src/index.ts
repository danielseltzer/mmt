/**
 * @fileoverview Zod schemas that define the contracts between all MMT packages.
 * These schemas serve as the single source of truth for data structures.
 */

import { z } from 'zod';

// Config schema
export const ConfigSchema = z.object({
  vaultPath: z.string().describe('Absolute path to the markdown vault'),
  qmServiceUrl: z.string().url().optional().describe('Optional URL for QM vector service'),
});

export type Config = z.infer<typeof ConfigSchema>;

// Document metadata schema
export const DocumentMetadataSchema = z.object({
  path: z.string().describe('Absolute file path'),
  relativePath: z.string().describe('Path relative to vault'),
  name: z.string().describe('File name without extension'),
  modified: z.date().describe('Last modified date'),
  size: z.number().describe('File size in bytes'),
  frontmatter: z.record(z.unknown()).optional().describe('Parsed frontmatter'),
  tags: z.array(z.string()).optional().describe('Extracted tags'),
  links: z.array(z.string()).optional().describe('Outgoing links'),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

// Query schema (GitHub-style)
export const QuerySchema = z.object({
  text: z.string().optional().describe('Text search'),
  path: z.string().optional().describe('Path filter'),
  tag: z.array(z.string()).optional().describe('Tag filters'),
  has: z.array(z.string()).optional().describe('Property existence filters'),
  is: z.array(z.string()).optional().describe('State filters'),
  sort: z.enum(['name', 'modified', 'size', 'path']).optional().describe('Sort field'),
  order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
});

export type Query = z.infer<typeof QuerySchema>;

// Document set schema
export const DocumentSetSchema = z.object({
  id: z.string().describe('Unique identifier'),
  name: z.string().describe('User-friendly name'),
  query: QuerySchema.describe('Query that defines this set'),
  documents: z.array(DocumentMetadataSchema).describe('Documents in this set'),
  createdAt: z.date().describe('Creation timestamp'),
  updatedAt: z.date().describe('Last update timestamp'),
});

export type DocumentSet = z.infer<typeof DocumentSetSchema>;

// Operation schemas
export const MoveOperationSchema = z.object({
  type: z.literal('move'),
  sourcePath: z.string().describe('Current file path'),
  targetPath: z.string().describe('New file path'),
});

export type MoveOperation = z.infer<typeof MoveOperationSchema>;

export const UpdateFrontmatterOperationSchema = z.object({
  type: z.literal('update-frontmatter'),
  path: z.string().describe('File path'),
  updates: z.record(z.unknown()).describe('Frontmatter updates'),
  mode: z.enum(['merge', 'replace']).describe('Update mode'),
});

export type UpdateFrontmatterOperation = z.infer<typeof UpdateFrontmatterOperationSchema>;

export const OperationSchema = z.discriminatedUnion('type', [
  MoveOperationSchema,
  UpdateFrontmatterOperationSchema,
]);

export type Operation = z.infer<typeof OperationSchema>;

// Snapshot schema
export const SnapshotSchema = z.object({
  id: z.string().describe('Unique snapshot ID'),
  timestamp: z.date().describe('Creation time'),
  operations: z.array(OperationSchema).describe('Operations in this snapshot'),
  affectedFiles: z.array(z.string()).describe('Files affected'),
  snapshotPath: z.string().describe('Path to snapshot directory'),
});

export type Snapshot = z.infer<typeof SnapshotSchema>;

// Table view schemas
export const ColumnConfigSchema = z.object({
  id: z.string().describe('Column identifier'),
  label: z.string().describe('Display label'),
  field: z.string().describe('Document field to display'),
  width: z.number().optional().describe('Column width'),
  visible: z.boolean().default(true).describe('Column visibility'),
});

export type ColumnConfig = z.infer<typeof ColumnConfigSchema>;

export const TableViewConfigSchema = z.object({
  columns: z.array(ColumnConfigSchema).describe('Column configurations'),
  rowHeight: z.number().default(32).describe('Row height in pixels'),
  maxRows: z.number().default(500).describe('Maximum rows to display'),
});

export type TableViewConfig = z.infer<typeof TableViewConfigSchema>;

// File operation result schemas
export const FileOperationResultSchema = z.object({
  success: z.boolean().describe('Operation success status'),
  path: z.string().describe('File path'),
  error: z.string().optional().describe('Error message if failed'),
});

export type FileOperationResult = z.infer<typeof FileOperationResultSchema>;

// Index update event schema
export const IndexUpdateEventSchema = z.object({
  type: z.enum(['added', 'modified', 'deleted']).describe('Update type'),
  path: z.string().describe('File path'),
  metadata: DocumentMetadataSchema.optional().describe('New metadata if added/modified'),
});

export type IndexUpdateEvent = z.infer<typeof IndexUpdateEventSchema>;

// Export all schemas for convenience
export const schemas = {
  Config: ConfigSchema,
  DocumentMetadata: DocumentMetadataSchema,
  Query: QuerySchema,
  DocumentSet: DocumentSetSchema,
  MoveOperation: MoveOperationSchema,
  UpdateFrontmatterOperation: UpdateFrontmatterOperationSchema,
  Operation: OperationSchema,
  Snapshot: SnapshotSchema,
  ColumnConfig: ColumnConfigSchema,
  TableViewConfig: TableViewConfigSchema,
  FileOperationResult: FileOperationResultSchema,
  IndexUpdateEvent: IndexUpdateEventSchema,
} as const;