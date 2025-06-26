/**
 * @fileoverview Query schemas for document search and filtering.
 * 
 * This file defines the query language for MMT, inspired by Obsidian's Dataview
 * plugin. Queries use a namespace:property syntax to target different aspects
 * of documents (filesystem metadata, frontmatter, content, inline tags).
 */

import { z } from 'zod';

/**
 * Query operators for flexible value matching.
 * 
 * Operators support various comparison types from simple equality to complex
 * pattern matching. The operator used depends on the property being queried
 * and the desired matching behavior.
 * 
 * @example Simple equality
 * ```typescript
 * const op: QueryOperator = "draft"; // Exact string match
 * const op: QueryOperator = 42;      // Exact number match
 * const op: QueryOperator = true;     // Exact boolean match
 * ```
 * 
 * @example Array matching
 * ```typescript
 * const op: QueryOperator = ["blog", "tech"]; // Must have ALL values
 * ```
 * 
 * @example Complex operators
 * ```typescript
 * const op: QueryOperator = { gt: "2024-01-01" };        // Greater than
 * const op: QueryOperator = { contains: "urgent" };      // Array contains
 * const op: QueryOperator = { match: "posts/**.md" };    // Glob pattern
 * const op: QueryOperator = { regex: "TODO|FIXME" };     // Regex match
 * ```
 */
export const QueryOperatorSchema = z.union([
  /** Exact string match */
  z.string(),
  /** Exact number match */
  z.number(),
  /** Exact boolean match */
  z.boolean(),
  /** Array must contain all values */
  z.array(z.any()),
  z.object({
    /** Greater than */
    gt: z.union([z.string(), z.number()]).optional(),
    /** Greater than or equal */
    gte: z.union([z.string(), z.number()]).optional(),
    /** Less than */
    lt: z.union([z.string(), z.number()]).optional(),
    /** Less than or equal */
    lte: z.union([z.string(), z.number()]).optional(),
    /** Equal to (explicit) */
    eq: z.any().optional(),
    /** Not equal to */
    ne: z.any().optional(),
    /** Value in array */
    in: z.array(z.any()).optional(),
    /** Value not in array */
    nin: z.array(z.any()).optional(),
    /** Property exists */
    exists: z.boolean().optional(),
    /** Array contains value */
    contains: z.any().optional(),
    /** Array contains all values */
    containsAll: z.array(z.any()).optional(),
    /** Array contains any value */
    containsAny: z.array(z.any()).optional(),
    /** Glob pattern match */
    match: z.string().optional(),
    /** Regular expression match */
    regex: z.string().optional(),
    /** Value between two numbers */
    between: z.tuple([z.number(), z.number()]).optional(),
  }),
]);

export type QueryOperator = z.infer<typeof QueryOperatorSchema>;

/**
 * User-facing query format using namespace:property syntax.
 * 
 * This is the primary query interface for users. Properties are prefixed
 * with namespaces to indicate what aspect of documents to search:
 * - fs: filesystem metadata (path, name, size, dates)
 * - fm: frontmatter properties
 * - content: document content
 * - inline: inline metadata (tags, mentions, tasks)
 * 
 * @example Basic queries
 * ```typescript
 * const query: QueryInput = {
 *   'fs:path': 'posts/notes',
 *   'fm:status': 'draft',
 *   'fm:priority': { gt: 5 }
 * };
 * ```
 * 
 * @example Content search with sorting
 * ```typescript
 * const query: QueryInput = {
 *   'content:text': 'TODO',
 *   'fm:tag': ['urgent', 'bug'],
 *   sort: 'modified',
 *   order: 'desc'
 * };
 * ```
 */
export const QueryInputSchema = z.object({
  /** Sort results by field (no namespace needed) */
  sort: z.enum(['name', 'modified', 'created', 'size']).optional()
    .describe('Sort field'),
  /** Sort order for results */
  order: z.enum(['asc', 'desc']).optional()
    .describe('Sort order'),
})
.catchall(QueryOperatorSchema)
.describe('Query using namespace:property format')
.refine(
  (obj) => {
    const namespacePattern = /^(fs|fm|content|inline):[a-zA-Z_][a-zA-Z0-9_]*$/u;
    return Object.keys(obj).every(key => 
      key === 'sort' || key === 'order' || namespacePattern.test(key)
    );
  },
  { message: 'Query properties must use namespace:property format (e.g., "fs:path", "fm:status")' }
);

export type QueryInput = z.infer<typeof QueryInputSchema>;

/**
 * Internal structured query representation.
 * 
 * This schema represents the parsed query after namespace:property syntax
 * has been processed. It organizes query criteria by namespace for efficient
 * execution by the indexer.
 * 
 * @internal Used by the query parser and indexer
 */
export const StructuredQuerySchema = z.object({
  /**
   * Filesystem metadata queries.
   * @namespace fs
   */
  filesystem: z.object({
    /** Glob patterns for file paths (uses minimatch) */
    path: QueryOperatorSchema.optional(),
    /** Filename without extension */
    name: QueryOperatorSchema.optional(),
    /** File extension like .md */
    ext: QueryOperatorSchema.optional(),
    /** File modification date */
    modified: QueryOperatorSchema.optional(),
    /** File creation date */
    created: QueryOperatorSchema.optional(),
    /** File size in bytes */
    size: QueryOperatorSchema.optional(),
  }).optional().describe('Filesystem metadata queries'),
  
  /**
   * Frontmatter property queries.
   * @namespace fm
   * @dynamic Any frontmatter field can be queried
   */
  frontmatter: z.record(z.string(), QueryOperatorSchema).optional()
    .describe('Frontmatter property queries'),
  
  /**
   * Document content search.
   * @namespace content
   */
  content: z.object({
    /** Case-insensitive text search */
    text: z.string().optional(),
    /** Regular expression search */
    regex: z.string().optional(),
  }).optional().describe('Content search queries'),
  
  /**
   * Inline metadata queries.
   * @namespace inline
   */
  inline: z.object({
    /** Must have all specified tags */
    tags: QueryOperatorSchema.optional(),
    /** Must have all specified mentions */
    mentions: QueryOperatorSchema.optional(),
    /** Must have all specified task states */
    tasks: QueryOperatorSchema.optional(),
  }).optional().describe('Inline metadata queries'),
  
  /** Sort configuration */
  sort: z.object({
    field: z.enum(['name', 'modified', 'created', 'size']),
    order: z.enum(['asc', 'desc']).default('asc'),
  }).optional().describe('Sort configuration'),
});

export type StructuredQuery = z.infer<typeof StructuredQuerySchema>;