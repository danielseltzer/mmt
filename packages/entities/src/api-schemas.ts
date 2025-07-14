import { z } from 'zod';
import { FilterCriteriaSchema } from './filter-criteria.js';

// Request/Response schemas for REST API

// Documents API
export const DocumentsQuerySchema = z.object({
  q: z.string().optional(),
  limit: z.coerce.number().int().positive().max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'modified', 'size']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  // Filter parameters - sent as JSON string in query param
  filters: z.string().optional().transform((val) => {
    if (!val) return {};
    try {
      return FilterCriteriaSchema.parse(JSON.parse(val));
    } catch {
      return {};
    }
  }),
});

export const DocumentsResponseSchema = z.object({
  documents: z.array(z.object({
    path: z.string(),
    metadata: z.object({
      name: z.string(),
      modified: z.string(), // ISO date string
      size: z.number(),
      frontmatter: z.record(z.unknown()),
      tags: z.array(z.string()),
      links: z.array(z.string()),
    }),
  })),
  total: z.number(),
  vaultTotal: z.number(), // Total documents in vault (unfiltered)
  hasMore: z.boolean(),
});

// Operations API - REST-specific schemas
export const MoveOperationRequestSchema = z.object({
  type: z.literal('move'),
  files: z.array(z.string()),
  destination: z.string(),
  updateLinks: z.boolean().default(true),
});

export const UpdateFrontmatterRequestSchema = z.object({
  type: z.literal('updateFrontmatter'),
  files: z.array(z.string()),
  updates: z.record(z.unknown()),
  mode: z.enum(['merge', 'replace']).default('merge'),
});

export const BulkRenameRequestSchema = z.object({
  type: z.literal('bulkRename'),
  files: z.array(z.string()),
  pattern: z.string(),
  replacement: z.string(),
});

export const OperationRequestSchema = z.discriminatedUnion('type', [
  MoveOperationRequestSchema,
  UpdateFrontmatterRequestSchema,
  BulkRenameRequestSchema,
]);

export const OperationResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  changes: z.array(z.object({
    type: z.string(),
    path: z.string(),
    details: z.record(z.unknown()),
  })),
  errors: z.array(z.object({
    path: z.string(),
    error: z.string(),
  })).optional(),
});

// Batch operations
export const BatchOperationRequestSchema = z.object({
  operations: z.array(OperationRequestSchema),
  stopOnError: z.boolean().default(false),
});

export const BatchOperationResponseSchema = z.object({
  results: z.array(OperationResponseSchema),
  summary: z.object({
    total: z.number(),
    successful: z.number(),
    failed: z.number(),
  }),
});

// Views API
export const SaveViewRequestSchema = z.object({
  name: z.string().min(1).max(100),
  query: z.string(),
  columns: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const ViewResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  query: z.string(),
  columns: z.array(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// Export API
export const ExportRequestSchema = z.object({
  format: z.enum(['csv', 'json']),
  query: z.string().optional(),
  columns: z.array(z.string()).optional(),
});

export const ExportResponseSchema = z.object({
  format: z.string(),
  data: z.string(), // Base64 encoded for binary formats
  filename: z.string(),
  mimeType: z.string(),
});

// Error response
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.unknown().optional(),
  code: z.string().optional(),
});