# ADR-009: Scripting Analytical Operations with Arquero

## Status

Accepted - 2025-06-19

## Context

The MMT scripting system was designed with a declarative approach for document operations (move, rename, delete). However, users need to perform analytical operations similar to Dataview queries:

- Count documents by type or other fields
- Group and aggregate data
- Filter and transform result sets
- Generate reports and statistics

Current issues:
1. Custom operations with handler functions don't execute in the script runner
2. No support for aggregation operations (count, sum, avg, etc.)
3. Scripts cannot output analytical results (only operation previews)
4. Test scripts demonstrate these limitations clearly

## Problems to Solve

1. **Dataview parity**: Users expect to perform queries like `GROUP BY type` with counts
2. **Read-only analysis**: Need safe operations that can run without risk
3. **Complex aggregations**: Support for multi-step transformations and calculations
4. **Result presentation**: Output analysis results in various formats (table, CSV, JSON)
5. **Pipeline clarity**: Distinguish between analysis (safe) and mutations (dangerous)

## Decision

We will:

1. **Adopt Arquero** as our dataframe library for analytical operations
2. **Introduce OperationReadyDocumentSet** as an intermediate schema type
3. **Separate analysis from mutation** in the operation pipeline
4. **Implement a 500-document limit** by default (overridable) for document sets

### Architecture

```typescript
// New schema types
const OperationReadyDocumentSetSchema = z.object({
  _type: z.literal('DocumentSet'),
  sourceQuery: QuerySchema.optional(),
  documentCount: z.number(),
  limit: z.number().default(500),
  // Lazy Arquero table reference - validated at runtime
  tableRef: z.custom<Table>((val) => {
    // Runtime check that it's a Table-like object
    return val && typeof val === 'object' && 
           'numRows' in val && 
           'numCols' in val &&
           typeof val.filter === 'function';
  }, "Expected Arquero Table instance"),
  // Only materialized if explicitly requested
  documents: z.array(DocumentSchema).optional(),
  // Metadata about the set
  metadata: z.object({
    createdAt: z.date(),
    queryExecutionTime: z.number(),
    isComplete: z.boolean(), // false if limited
  })
});

// Extended operation types
const OperationTypeSchema = z.enum([
  // Mutations (require --execute)
  'move',
  'rename', 
  'updateFrontmatter',
  'delete',
  // Analysis (always safe)
  'analyze',
  'transform',
  'aggregate'
]);
```

### Usage Examples

```typescript
// Simple analysis
const typeCount = await mmt
  .query('fm:type=*')
  .analyze(table => table
    .groupby('frontmatter.type')
    .rollup({ count: op.count() })
    .orderby(desc('count'))
  )
  .output('table');

// Analysis to mutation pipeline
const oldDrafts = await mmt
  .query('fm:status=draft')
  .analyze(table => table
    .filter(d => d.modified < lastYear)
    .derive({ age: d => daysSince(d.modified) })
  )
  .toDocumentSet({ limit: 100 }); // Explicit limit

// Preview mutations (default behavior - safe)
const preview = await mmt
  .mutate(oldDrafts)
  .move('archive/2023')
  .execute(); // Returns preview of changes

// Execute mutations (must be explicit)
const results = await mmt
  .mutate(oldDrafts)
  .move('archive/2023')
  .execute({ 
    destructive: true,
    confirmCount: true // Fails if count doesn't match
  });

// Safety limits on destructive operations
await mmt
  .mutate(largeDocSet)
  .delete()
  .execute({ 
    destructive: true,
    maxDocuments: 100 // Fails if more than 100 docs
  });
```

### Implementation Details

1. **Lazy evaluation**: The document set holds an Arquero table reference, not materialized data
2. **Safety limits**: Default 500-document limit for `.toDocumentSet()`, requires `overrideLimit: true` for more
3. **Analysis operations**: Always run immediately (safe by nature)
4. **Mutation safety**: All mutations preview by default, require explicit `destructive: true`
5. **Type safety**: Full TypeScript types via @jrwats/arquero-types

```typescript
// Execute options schema
const ExecuteOptionsSchema = z.object({
  destructive: z.boolean().default(false),
  confirmCount: z.boolean().default(false),
  maxDocuments: z.number().optional(),
  continueOnError: z.boolean().default(false)
});
```

## Consequences

### Positive

1. **Powerful analysis**: Full dataframe capabilities without reinventing the wheel
2. **Clear semantics**: Analysis vs mutation is explicit in the API
3. **Safety by default**: Mutations require explicit `destructive: true` in code
4. **Self-documenting**: Script safety is visible in code review, not hidden in CLI flags
5. **Progressive safety**: Can add limits like `maxDocuments` and `confirmCount`
6. **Flexibility**: Can save/load/inspect document sets before mutations
7. **Performance**: Arquero handles large datasets efficiently

### Negative

1. **New dependency**: Adds Arquero and its type definitions
2. **Learning curve**: Users need to learn Arquero's API for complex analysis
3. **API complexity**: Two different operation modes (analysis vs mutation)
4. **Memory consideration**: Document sets up to 500 items could use significant memory

### Neutral

1. **Migration path**: Existing scripts continue to work; new features are additive
2. **Documentation**: Need comprehensive examples of Arquero operations
3. **Testing**: Can now test with fixture document sets without running queries

## Alternatives Considered

1. **Custom aggregation syntax**: Rejected - why reinvent what Arquero does well?
2. **Full materialization always**: Rejected - memory pressure and performance concerns
3. **Danfo.js**: Rejected - larger bundle size due to TensorFlow.js dependency
4. **Data-Forge**: Rejected - less active development, less performant
5. **No separation (unified pipeline)**: Rejected - unclear when operations are safe vs dangerous

## References

- [Arquero Documentation](https://idl.uw.edu/arquero/)
- [Issue #44: Fix example test scripts](https://github.com/danielseltzer/mmt/issues/44)
- [Issue #45: ADR needed: Script execution model](https://github.com/danielseltzer/mmt/issues/45)