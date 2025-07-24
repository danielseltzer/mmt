import { z } from 'zod';

/**
 * Declarative filter schemas for MMT
 * These define all filtering capabilities supported by the API
 */

// Base types for all filters
export const FilterOperatorSchema = z.enum([
  'equals', 'not_equals',
  'contains', 'not_contains',
  'starts_with', 'ends_with',
  'matches', // for regex/glob
  'gt', 'gte', 'lt', 'lte',
  'between', 'not_between',
  'in', 'not_in',
  'contains_all', 'contains_any'
]);
export type FilterOperator = z.infer<typeof FilterOperatorSchema>;

export const FilterLogicSchema = z.enum(['AND', 'OR']);
export type FilterLogic = z.infer<typeof FilterLogicSchema>;

// Individual filter schemas
export const TextFilterSchema = z.object({
  field: z.enum(['name', 'content', 'search']),
  operator: z.enum(['contains', 'not_contains', 'equals', 'not_equals', 'matches']),
  value: z.string(),
  caseSensitive: z.boolean().optional().default(false)
});
export type TextFilter = z.infer<typeof TextFilterSchema>;

export const FolderFilterSchema = z.object({
  field: z.literal('folders'),
  operator: z.enum(['in', 'not_in']),
  value: z.array(z.string()) // array of folder paths
});
export type FolderFilter = z.infer<typeof FolderFilterSchema>;

export const TagFilterSchema = z.object({
  field: z.literal('tags'),
  operator: z.enum(['contains', 'not_contains', 'contains_all', 'contains_any']),
  value: z.array(z.string())
});
export type TagFilter = z.infer<typeof TagFilterSchema>;

export const MetadataFilterSchema = z.object({
  field: z.literal('metadata'),
  key: z.string(), // frontmatter field name
  operator: z.literal('equals'), // MVP: only equals for metadata
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
});
export type MetadataFilter = z.infer<typeof MetadataFilterSchema>;

export const DateConditionSchema = z.object({
  field: z.enum(['modified', 'created']),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'between', 'not_between']),
  value: z.union([
    z.string(), // ISO date string
    z.number(), // Unix timestamp
    z.object({ from: z.string(), to: z.string() }) // for between
  ])
});
export type DateCondition = z.infer<typeof DateConditionSchema>;

export const SizeConditionSchema = z.object({
  field: z.literal('size'),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'between']),
  value: z.union([
    z.number(), // bytes
    z.object({ from: z.number(), to: z.number() }) // for between
  ])
});
export type SizeCondition = z.infer<typeof SizeConditionSchema>;

// Combined filter schema using discriminated union
export const FilterConditionSchema = z.discriminatedUnion('field', [
  TextFilterSchema,
  FolderFilterSchema,
  TagFilterSchema,
  MetadataFilterSchema,
  DateConditionSchema,
  SizeConditionSchema
]);
export type FilterCondition = z.infer<typeof FilterConditionSchema>;

// Filter collection schema
export const FilterCollectionSchema = z.object({
  conditions: z.array(FilterConditionSchema),
  logic: FilterLogicSchema.optional().default('AND')
});
export type FilterCollection = z.infer<typeof FilterCollectionSchema>;