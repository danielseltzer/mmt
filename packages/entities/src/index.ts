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

// Base document metadata (shared fields)
export const BaseDocumentMetadataSchema = z.object({
  name: z.string().describe('File name without extension'),
  modified: z.date().describe('Last modified date'),
  size: z.number().describe('File size in bytes'),
  frontmatter: z.record(z.unknown()).default({}).describe('Parsed frontmatter'),
  tags: z.array(z.string()).default([]).describe('Extracted tags'),
  links: z.array(z.string()).default([]).describe('Outgoing links'),
});

export type BaseDocumentMetadata = z.infer<typeof BaseDocumentMetadataSchema>;

// Document metadata schema (for indexing)
export const DocumentMetadataSchema = BaseDocumentMetadataSchema.extend({
  path: z.string().describe('Absolute file path'),
  relativePath: z.string().describe('Path relative to vault'),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

// Full document schema (includes content)
export const DocumentSchema = z.object({
  path: z.string().describe('Absolute file path'),
  content: z.string().describe('Raw markdown content'),
  metadata: BaseDocumentMetadataSchema.describe('Document metadata'),
});

export type Document = z.infer<typeof DocumentSchema>;

// Query operator schemas
export const QueryOperatorSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.array(z.any()),
  z.object({
    $gt: z.union([z.string(), z.number()]).optional(),
    $gte: z.union([z.string(), z.number()]).optional(),
    $lt: z.union([z.string(), z.number()]).optional(),
    $lte: z.union([z.string(), z.number()]).optional(),
    $eq: z.any().optional(),
    $ne: z.any().optional(),
    $in: z.array(z.any()).optional(),
    $nin: z.array(z.any()).optional(),
    $exists: z.boolean().optional(),
    $contains: z.any().optional(),
    $containsAll: z.array(z.any()).optional(),
    $containsAny: z.array(z.any()).optional(),
    $match: z.string().optional(),
    $regex: z.string().optional(),
    $between: z.tuple([z.number(), z.number()]).optional(),
  }),
]);

export type QueryOperator = z.infer<typeof QueryOperatorSchema>;

// User-facing query schema with namespace:property format
export const QueryInputSchema = z.object({
  // Sort options (no namespace needed)
  sort: z.enum(['name', 'modified', 'created', 'size']).optional()
    .describe('Sort field'),
  order: z.enum(['asc', 'desc']).optional()
    .describe('Sort order'),
})
.catchall(QueryOperatorSchema)
.describe('Query using namespace:property format')
.refine(
  (obj) => {
    const namespacePattern = /^(fs|fm|content|inline):[a-zA-Z_][a-zA-Z0-9_]*$/;
    return Object.keys(obj).every(key => 
      key === 'sort' || key === 'order' || namespacePattern.test(key)
    );
  },
  { message: 'Query properties must use namespace:property format (e.g., "fs:path", "fm:status")' }
);

export type QueryInput = z.infer<typeof QueryInputSchema>;

// Structured query schema (internal representation after parsing)
export const StructuredQuerySchema = z.object({
  filesystem: z.object({
    path: QueryOperatorSchema.optional(),
    name: QueryOperatorSchema.optional(),
    ext: QueryOperatorSchema.optional(),
    modified: QueryOperatorSchema.optional(),
    created: QueryOperatorSchema.optional(),
    size: QueryOperatorSchema.optional(),
  }).optional().describe('Filesystem metadata queries'),
  
  frontmatter: z.record(z.string(), QueryOperatorSchema).optional()
    .describe('Frontmatter property queries'),
  
  content: z.object({
    text: z.string().optional(),
    regex: z.string().optional(),
  }).optional().describe('Content search queries'),
  
  inline: z.object({
    tags: QueryOperatorSchema.optional(),
    mentions: QueryOperatorSchema.optional(),
    tasks: QueryOperatorSchema.optional(),
  }).optional().describe('Inline metadata queries'),
  
  sort: z.object({
    field: z.enum(['name', 'modified', 'created', 'size']),
    order: z.enum(['asc', 'desc']).default('asc'),
  }).optional().describe('Sort configuration'),
});

export type StructuredQuery = z.infer<typeof StructuredQuerySchema>;

// For backward compatibility, export QueryInput as Query
export const QuerySchema = QueryInputSchema;
export type Query = QueryInput;

// Document set schema (defined after operations)
// Will be properly defined after OperationSchema

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

export const RemoveFrontmatterOperationSchema = z.object({
  type: z.literal('remove-frontmatter'),
  path: z.string().describe('File path'),
  keys: z.array(z.string()).describe('Keys to remove'),
});

export type RemoveFrontmatterOperation = z.infer<typeof RemoveFrontmatterOperationSchema>;

export const DeleteOperationSchema = z.object({
  type: z.literal('delete'),
  path: z.string().describe('File path to delete'),
});

export type DeleteOperation = z.infer<typeof DeleteOperationSchema>;

export const CreateOperationSchema = z.object({
  type: z.literal('create'),
  path: z.string().describe('File path to create'),
  content: z.string().describe('File content'),
  metadata: BaseDocumentMetadataSchema.partial().optional().describe('Initial metadata'),
});

export type CreateOperation = z.infer<typeof CreateOperationSchema>;

export const OperationSchema = z.discriminatedUnion('type', [
  MoveOperationSchema,
  UpdateFrontmatterOperationSchema,
  RemoveFrontmatterOperationSchema,
  DeleteOperationSchema,
  CreateOperationSchema,
]);

export type Operation = z.infer<typeof OperationSchema>;

// Now we can define DocumentSet with OperationSchema
export const DocumentSetSchema = z.object({
  id: z.string().describe('Unique identifier'),
  documents: z.array(DocumentSchema).describe('Documents in this set'),
  source: z.union([
    QuerySchema,
    z.string().describe('Operation that created this set'),
  ]).optional().describe('How this set was created'),
});

export type DocumentSet = z.infer<typeof DocumentSetSchema>;

// Vault schemas
export const VaultIndexSchema = z.object({
  byTag: z.map(z.string(), z.array(z.string())).describe('Tag to document paths'),
  byPath: z.map(z.string(), z.array(z.string())).describe('Directory to document paths'),
  links: z.map(z.string(), z.array(z.string())).describe('Document to outgoing links'),
  backlinks: z.map(z.string(), z.array(z.string())).describe('Document to incoming links'),
});

export type VaultIndex = z.infer<typeof VaultIndexSchema>;

export const VaultSchema = z.object({
  basePath: z.string().describe('Root directory of vault'),
  documents: z.map(z.string(), DocumentSchema).describe('Path to document map'),
  index: VaultIndexSchema.describe('Derived search structures'),
});

export type Vault = z.infer<typeof VaultSchema>;

// Fluent API context
export const VaultContextSchema = z.object({
  vault: VaultSchema.describe('Current vault state'),
  selection: DocumentSetSchema.describe('Current document selection'),
  pendingOperations: z.array(OperationSchema).describe('Operations to execute'),
});

export type VaultContext = z.infer<typeof VaultContextSchema>;

// Execution result schemas
export const LinkUpdateSchema = z.object({
  inFile: z.string().describe('File containing the link'),
  oldTarget: z.string().describe('Original link target'),
  newTarget: z.string().describe('Updated link target'),
});

export type LinkUpdate = z.infer<typeof LinkUpdateSchema>;

export const ExecutionResultSchema = z.object({
  success: z.boolean().describe('Whether execution succeeded'),
  vault: VaultSchema.optional().describe('New vault state if successful'),
  error: z.instanceof(Error).optional().describe('Error if failed'),
  executed: z.array(OperationSchema).describe('Operations that were executed'),
  movedFiles: z.record(z.string(), z.string()).describe('Old path to new path mapping'),
  updatedLinks: z.array(LinkUpdateSchema).describe('Links that were updated'),
  modifiedFiles: z.array(z.string()).describe('Files with metadata changes'),
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

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

// Query parser function
export function parseQuery(input: QueryInput): StructuredQuery {
  const structured: any = {};
  
  for (const [key, value] of Object.entries(input)) {
    if (key === 'sort' || key === 'order') {
      // Handle sort options
      if (input.sort) {
        structured.sort = { 
          field: input.sort, 
          order: input.order || 'asc' 
        };
      }
      continue;
    }
    
    // Parse namespace:property
    const colonIndex = key.indexOf(':');
    if (colonIndex === -1) continue; // Skip invalid keys
    
    const namespace = key.substring(0, colonIndex);
    const property = key.substring(colonIndex + 1);
    
    switch (namespace) {
      case 'fs':
        structured.filesystem ??= {};
        structured.filesystem[property] = value;
        break;
      case 'fm':
        structured.frontmatter ??= {};
        structured.frontmatter[property] = value;
        break;
      case 'content':
        structured.content ??= {};
        structured.content[property] = value;
        break;
      case 'inline':
        structured.inline ??= {};
        structured.inline[property] = value;
        break;
    }
  }
  
  return StructuredQuerySchema.parse(structured);
}

// Export all schemas for convenience
export const schemas = {
  // Core objects
  Config: ConfigSchema,
  BaseDocumentMetadata: BaseDocumentMetadataSchema,
  DocumentMetadata: DocumentMetadataSchema,
  Document: DocumentSchema,
  DocumentSet: DocumentSetSchema,
  
  // Query and operations
  QueryOperator: QueryOperatorSchema,
  QueryInput: QueryInputSchema,
  Query: QuerySchema, // Alias for QueryInput
  StructuredQuery: StructuredQuerySchema,
  MoveOperation: MoveOperationSchema,
  UpdateFrontmatterOperation: UpdateFrontmatterOperationSchema,
  RemoveFrontmatterOperation: RemoveFrontmatterOperationSchema,
  DeleteOperation: DeleteOperationSchema,
  CreateOperation: CreateOperationSchema,
  Operation: OperationSchema,
  
  // Vault and execution
  VaultIndex: VaultIndexSchema,
  Vault: VaultSchema,
  VaultContext: VaultContextSchema,
  LinkUpdate: LinkUpdateSchema,
  ExecutionResult: ExecutionResultSchema,
  
  // UI and persistence
  Snapshot: SnapshotSchema,
  ColumnConfig: ColumnConfigSchema,
  TableViewConfig: TableViewConfigSchema,
  
  // Events and results
  FileOperationResult: FileOperationResultSchema,
  IndexUpdateEvent: IndexUpdateEventSchema,
} as const;