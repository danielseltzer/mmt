# Unified Filter Design for MMT

## 1. Complete Filter Catalog for MVP

Based on analysis of the current implementation, here are all filters needed for MVP:

### Text Filters
- **name**: Search within filename
- **content**: Search within document body
- **search**: Global search across all text fields

### Hierarchical Filters
- **folders**: Filter by folder paths (multi-select)

### Classification Filters
- **tags**: Filter by tags extracted from content
- **metadata**: Filter by frontmatter key:value pairs

### Temporal Filters
- **modified**: Filter by modification date
- **created**: Filter by creation date

### Size Filters
- **size**: Filter by file size

## 2. Proposed Zod Schemas

```typescript
// Base types for all filters
const FilterOperatorSchema = z.enum([
  'equals', 'not_equals',
  'contains', 'not_contains',
  'starts_with', 'ends_with',
  'matches', // for regex/glob
  'gt', 'gte', 'lt', 'lte',
  'between', 'not_between',
  'in', 'not_in'
]);

const FilterLogicSchema = z.enum(['AND', 'OR']);

// Individual filter schemas
const TextFilterSchema = z.object({
  field: z.enum(['name', 'content', 'search']),
  operator: z.enum(['contains', 'not_contains', 'equals', 'not_equals', 'matches']),
  value: z.string(),
  caseSensitive: z.boolean().optional().default(false)
});

const FolderFilterSchema = z.object({
  field: z.literal('folders'),
  operator: z.enum(['in', 'not_in']),
  value: z.array(z.string()) // array of folder paths
});

const TagFilterSchema = z.object({
  field: z.literal('tags'),
  operator: z.enum(['contains', 'not_contains', 'contains_all', 'contains_any']),
  value: z.array(z.string())
});

const MetadataFilterSchema = z.object({
  field: z.literal('metadata'),
  key: z.string(), // frontmatter field name
  operator: FilterOperatorSchema,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])
});

const DateFilterSchema = z.object({
  field: z.enum(['modified', 'created']),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'between', 'not_between']),
  value: z.union([
    z.string(), // ISO date string
    z.number(), // Unix timestamp
    z.object({ from: z.string(), to: z.string() }) // for between
  ])
});

const SizeFilterSchema = z.object({
  field: z.literal('size'),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'between']),
  value: z.union([
    z.number(), // bytes
    z.object({ from: z.number(), to: z.number() }) // for between
  ])
});

// Combined filter schema
const FilterConditionSchema = z.discriminatedUnion('field', [
  TextFilterSchema,
  FolderFilterSchema,
  TagFilterSchema,
  MetadataFilterSchema,
  DateFilterSchema,
  SizeFilterSchema
]);

// Filter collection schema
const FilterCollectionSchema = z.object({
  conditions: z.array(FilterConditionSchema),
  logic: FilterLogicSchema.optional().default('AND')
});

// Natural language parsers (for client-side conversion)
const NaturalDateSchema = z.string().transform((val) => {
  // Parse "< 7 days", "last month", etc. into DateFilter
  // This would use the existing parseNaturalDate utility
});

const NaturalSizeSchema = z.string().transform((val) => {
  // Parse "over 1mb", "under 10k" into SizeFilter
  // This would use the existing parseNaturalSize utility
});
```

## 3. Unified Client Design

### API (Server-Side)
- Accepts only `FilterCollectionSchema` objects
- No JavaScript functions, no natural language - pure declarative
- All filtering happens in the indexer/query system

### Web UI (FilterBar)
```typescript
// Current mixed approach
interface FilterCriteria {
  name?: string;
  content?: string;
  folders?: string[];
  metadata?: string[]; // "key:value" strings
  dateExpression?: string; // natural language
  sizeExpression?: string; // natural language
}

// Proposed unified approach
interface FilterBarState {
  // Visual state (what user sees/types)
  name?: string;
  content?: string;
  folders?: string[];
  tags?: string[];
  metadata?: Array<{key: string, value: string}>;
  dateExpression?: string; // natural language input
  sizeExpression?: string; // natural language input
}

// Convert to API format
function convertToFilterCollection(state: FilterBarState): FilterCollection {
  const conditions: FilterCondition[] = [];
  
  if (state.name) {
    conditions.push({
      field: 'name',
      operator: 'contains',
      value: state.name
    });
  }
  
  if (state.content) {
    conditions.push({
      field: 'content',
      operator: 'contains',
      value: state.content
    });
  }
  
  if (state.folders?.length) {
    conditions.push({
      field: 'folders',
      operator: 'in',
      value: state.folders
    });
  }
  
  if (state.tags?.length) {
    conditions.push({
      field: 'tags',
      operator: 'contains_any',
      value: state.tags
    });
  }
  
  if (state.metadata?.length) {
    state.metadata.forEach(({key, value}) => {
      conditions.push({
        field: 'metadata',
        key,
        operator: 'equals',
        value
      });
    });
  }
  
  if (state.dateExpression) {
    const parsed = parseNaturalDate(state.dateExpression);
    conditions.push({
      field: 'modified',
      operator: parsed.operator,
      value: parsed.value
    });
  }
  
  if (state.sizeExpression) {
    const parsed = parseNaturalSize(state.sizeExpression);
    conditions.push({
      field: 'size',
      operator: parsed.operator,
      value: parsed.value
    });
  }
  
  return { conditions, logic: 'AND' };
}
```

### CLI (Script Runner)
```typescript
// Current approach with JS functions
{
  select: { /* query */ },
  filter: (doc) => doc.metadata.size > 100000
}

// Proposed declarative approach
{
  select: { /* query */ },
  filter: {
    conditions: [
      { field: 'size', operator: 'gt', value: 100000 }
    ]
  }
}

// For complex logic, use filter builder helpers
import { filter } from '@mmt/scripting';

{
  select: { /* query */ },
  filter: filter.and(
    filter.size.gt(100000),
    filter.content.contains('TODO'),
    filter.metadata('status').equals('draft')
  )
}
```

### Script Filter Syntax
Scripts will use the declarative filter format directly:

```typescript
{
  select: { /* query */ },
  filter: {
    conditions: [
      { field: 'size', operator: 'gt', value: 100000 },
      { field: 'content', operator: 'contains', value: 'TODO' },
      { field: 'metadata', key: 'status', operator: 'equals', value: 'draft' }
    ],
    logic: 'AND'
  }
}
```

## 4. Design Clarifications

### Multiple Filters of Same Type
- **YES**: The filter collection can contain multiple filters of the same type
- **Example**: Two name filters: `{field: 'name', operator: 'contains', value: 'test'}` AND `{field: 'name', operator: 'not_contains', value: 'draft'}`
- **Contradictory filters**: If a user adds `size > 1MB` AND `size < 1KB`, they'll get no results. The API executes filters as specified without attempting to detect contradictions.

### No Backwards Compatibility
- Remove all function-based filter support immediately
- No deprecation period
- Clean cut-over to declarative filters only

### MVP Scope Decisions
- **NO** nested filter groups - only flat AND/OR at top level
- **NO** metadata filters with operators other than equals
- **NO** "not" modifier at condition level (use not_contains, not_equals, etc.)
- **NO** handling of non-existent metadata fields - they simply won't match

## 5. Benefits of This Design

1. **Single Source of Truth**: API defines all filtering capabilities
2. **Type Safety**: Zod schemas ensure valid filters across all clients
3. **Consistency**: All clients use the same filter model
4. **Extensibility**: Easy to add new filter types
5. **Performance**: All filtering happens server-side in the indexer
6. **User-Friendly**: Natural language parsing happens client-side

## 6. Implementation Steps

1. Create filter schemas in `@mmt/entities`
2. Update `PipelineExecutor` to handle declarative filters
3. Update `FilterBar` to convert to new format
4. Remove all function-based filter support from scripts
5. Update all tests to use new declarative format
6. Update script documentation with new filter syntax