# MMT Scripting Cheat Sheet

## Quick Reference for Advanced Scripting Features

### Basic Pipeline Structure

```typescript
const pipeline = {
  select: { /* selection criteria */ },
  operations: [ /* array of operations */ ],
  options: { /* execution options */ }
};
```

### Selection Criteria

```typescript
// By frontmatter field
{ 'metadata.frontmatter.status': 'draft' }

// By file list
{ files: ['/path/to/file1.md', '/path/to/file2.md'] }

// Combined
{ 'metadata.frontmatter.status': 'draft', files: [...] }
```

### Standard Operations

```typescript
// Move/Rename
{ type: 'move', sourcePath: '/old.md', targetPath: '/new.md' }

// Update Frontmatter
{ type: 'updateFrontmatter', updates: { key: 'value' }, mode: 'merge' }

// Delete
{ type: 'delete', path: '/file.md' }
```

### Advanced Operations

#### Conditional (if/else)
```typescript
{
  type: 'conditional',
  condition: (doc) => doc.metadata.size > 1000,
  then: { /* operation if true */ },
  else: { /* operation if false (optional) */ }
}
```

#### Try-Catch Error Handling
```typescript
{
  type: 'try-catch',
  try: { /* operation to attempt */ },
  catch: { /* operation if try fails */ },
  finally: { /* always execute (optional) */ }
}
```

#### Map (Transform)
```typescript
{
  type: 'map',
  transform: (doc) => computeValue(doc),
  outputField: 'computedValue' // optional, stores in metadata
}
```

#### Reduce (Aggregate)
```typescript
{
  type: 'reduce',
  reducer: (accumulator, doc) => accumulator + doc.metadata.size,
  initialValue: 0,
  outputKey: 'totalSize' // stores in pipeline context
}
```

#### ForEach (Loop)
```typescript
{
  type: 'forEach',
  operation: { /* operation to run on each doc */ },
  parallel: { maxConcurrency: 5 } // optional
}
```

### Parallel Execution Options

```typescript
options: {
  parallel: {
    maxConcurrency: 5,     // max operations at once
    batchSize: 10,         // process in batches
    timeout: 5000          // timeout per operation (ms)
  },
  errorStrategy: 'continue', // 'fail-fast' | 'continue' | 'collect'
  destructive: true,         // actually perform mutations
  progress: true             // show progress
}
```

### Fluent API (Builder Pattern)

```typescript
import { mmt, operations } from '@mmt/scripting';

const pipeline = mmt()
  .query('tag:important')              // select documents
  .parallel(5)                         // set concurrency
  .conditional(                        // add conditional
    doc => doc.metadata.size > 1000000,
    operations().moveToFolder('large').build()[0]
  )
  .forEach(async (doc) => {            // process each
    return operations()
      .updateMetadata({ processed: true })
      .addTag('done')
      .build();
  })
  .map(doc => doc.metadata.size)      // transform
  .reduce((sum, doc) => sum + 1, 0, 'count') // aggregate
  .build();
```

### Operations Builder Helpers

```typescript
operations()
  .updateMetadata({ key: 'value' })     // update frontmatter
  .addTag('new-tag')                    // add a tag
  .moveToFolder('/new/location')        // move file
  .build();                             // returns operation array
```

### Error Handling Patterns

```typescript
// Fallback on error
.try(
  operations().moveToFolder('processed').build()[0],
  operations().addTag('move-failed').build()[0]
)

// Multiple error strategies
.forEach(async (doc) => {
  return mmt()
    .try(
      risky_operation,
      safe_fallback
    )
    .conditional(
      doc => hasError(doc),
      cleanup_operation
    )
    .build().operations;
})
```

### Execution Modes

```typescript
// Preview mode (default)
const result = await runner.execute(pipeline, documents);

// Destructive mode
const result = await runner.execute(pipeline, documents, {
  destructive: true
});

// With error collection
const result = await runner.execute(pipeline, documents, {
  errorStrategy: 'collect',
  destructive: true
});
```

### Result Structure

```typescript
interface ScriptExecutionResult {
  attempted: Document[];        // all documents processed
  succeeded: SuccessResult[];   // successful operations
  failed: FailureResult[];      // failed operations
  skipped: SkippedResult[];     // skipped operations
  stats: {
    duration: number;           // execution time (ms)
    startTime: Date;
    endTime: Date;
  };
}
```

## Common Patterns

### Batch Processing with Error Recovery

```typescript
mmt()
  .query('needs-processing:true')
  .parallel(10)
  .forEach(async (doc) => {
    return mmt()
      .try(
        processDocument(doc),
        operations().updateMetadata({ error: true }).build()[0]
      )
      .build().operations;
  })
  .build();
```

### Conditional Bulk Operations

```typescript
mmt()
  .query('*')
  .conditional(
    doc => doc.metadata.frontmatter?.archived,
    operations().moveToFolder('archive').build()[0],
    operations().updateMetadata({ active: true }).build()[0]
  )
  .build();
```

### Data Analysis Pipeline

```typescript
mmt()
  .query('type:blog-post')
  .map(doc => ({
    title: doc.metadata.frontmatter?.title,
    wordCount: doc.content.split(' ').length,
    tags: doc.metadata.tags
  }))
  .reduce((stats, doc) => {
    stats.totalWords += doc.wordCount;
    stats.posts++;
    return stats;
  }, { totalWords: 0, posts: 0 }, 'blogStats')
  .build();
```
