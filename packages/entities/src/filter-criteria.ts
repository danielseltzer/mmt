import { z } from 'zod';

// Operators for comparison
export const ComparisonOperatorSchema = z.enum(['<', '>', '<=', '>=', '=']);

// Date filter can be relative or absolute
export const DateFilterSchema = z.object({
  operator: ComparisonOperatorSchema,
  value: z.string(), // "-30d", "2025-01-01", etc.
});

// Size filter with human-readable values
export const SizeFilterSchema = z.object({
  operator: ComparisonOperatorSchema,
  value: z.string(), // "1k", "10.5M", "2G", etc.
});

// Main filter criteria schema
export const FilterCriteriaSchema = z.object({
  // Text search across all fields (existing)
  search: z.string().optional(),
  
  // Text in filename only
  name: z.string().optional(),
  
  // Text in file content only
  content: z.string().optional(),
  
  // Selected folder paths
  folders: z.array(z.string()).optional(),
  
  // Selected tags
  tags: z.array(z.string()).optional(),
  
  // Selected metadata key:value pairs (from frontmatter)
  // Format: ["domain:work", "status:draft"]
  metadata: z.array(z.string()).optional(),
  
  // Date filter
  date: DateFilterSchema.optional(),
  
  // Natural language date expression (alternative to date)
  dateExpression: z.string().optional(),
  
  // File size filter
  size: SizeFilterSchema.optional(),
  
  // Natural language size expression (alternative to size)
  sizeExpression: z.string().optional(),
});

export type FilterCriteria = z.infer<typeof FilterCriteriaSchema>;
export type DateFilter = z.infer<typeof DateFilterSchema>;
export type SizeFilter = z.infer<typeof SizeFilterSchema>;
export type ComparisonOperator = z.infer<typeof ComparisonOperatorSchema>;

// Type for filter condition used in selection
interface FilterConditionForSelection {
  field: string;
  operator: string;
  value: string | string[] | number | Date | { min: number | Date; max: number | Date };
}

// Helper to convert FilterCriteria to a serializable operation selection
export function filterCriteriaToSelection(criteria: FilterCriteria): { conditions: FilterConditionForSelection[] } {
  const conditions: FilterConditionForSelection[] = [];
  
  if (criteria.search) {
    conditions.push({ field: 'any', operator: 'contains', value: criteria.search });
  }
  
  if (criteria.name) {
    conditions.push({ field: 'name', operator: 'contains', value: criteria.name });
  }
  
  if (criteria.content) {
    conditions.push({ field: 'content', operator: 'contains', value: criteria.content });
  }
  
  if (criteria.folders && criteria.folders.length > 0) {
    conditions.push({ field: 'folder', operator: 'in', value: criteria.folders });
  }
  
  if (criteria.tags && criteria.tags.length > 0) {
    conditions.push({ field: 'tags', operator: 'in', value: criteria.tags });
  }
  
  if (criteria.metadata && criteria.metadata.length > 0) {
    conditions.push({ field: 'metadata', operator: 'has_keys', value: criteria.metadata });
  }
  
  if (criteria.date) {
    conditions.push({ 
      field: 'modified', 
      operator: criteria.date.operator, 
      value: criteria.date.value 
    });
  }
  
  if (criteria.size) {
    conditions.push({ 
      field: 'size', 
      operator: criteria.size.operator, 
      value: criteria.size.value 
    });
  }
  
  return { conditions };
}