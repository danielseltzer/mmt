# @mmt/scripting

Declarative scripting API for markdown vault operations with advanced control flow features.

## Basic Usage

```typescript
import { ScriptRunner } from '@mmt/scripting';

// Run a script file
const runner = new ScriptRunner(options);
const result = await runner.runScript('my-script.js');
```

## Advanced Features

The scripting package now supports advanced control flow and error handling:

### Conditional Operations

Execute operations based on document properties:

```typescript
const pipeline = {
  select: { 'metadata.frontmatter.status': 'draft' },
  operations: [{
    type: 'conditional',
    condition: (doc) => doc.metadata.size > 1000,
    then: { type: 'updateFrontmatter', updates: { large: true } },
    else: { type: 'updateFrontmatter', updates: { large: false } }
  }]
};
```

### Try-Catch Error Handling

Handle errors gracefully:

```typescript
const pipeline = {
  operations: [{
    type: 'try-catch',
    try: { type: 'move', targetPath: '/risky/operation' },
    catch: { type: 'updateFrontmatter', updates: { error: true } },
    finally: { type: 'updateFrontmatter', updates: { processed: true } }
  }]
};
```

### Parallel Execution

Process documents concurrently:

```typescript
const pipeline = {
  operations: [/* ... */],
  options: {
    parallel: {
      maxConcurrency: 5,
      batchSize: 10,
      timeout: 5000
    }
  }
};
```

### Map & Reduce Operations

Transform and aggregate documents:

```typescript
const pipeline = {
  operations: [
    {
      type: 'map',
      transform: (doc) => doc.metadata.size,
      outputField: 'fileSize'
    },
    {
      type: 'reduce',
      reducer: (sum, doc) => sum + doc.metadata.size,
      initialValue: 0,
      outputKey: 'totalSize'
    }
  ]
};
```

### Fluent API Builder

Build complex pipelines with a chainable API:

```typescript
import { mmt, operations } from '@mmt/scripting';

const pipeline = mmt()
  .query('tag:process')
  .parallel(5)
  .forEach(async (doc) => {
    return operations()
      .updateMetadata({ processed: true })
      .build();
  })
  .conditional(
    doc => doc.metadata.size > 1000000,
    operations().moveToFolder('large-files').build()[0]
  )
  .build();
```

## API Reference

### Advanced Operation Types

- `conditional` - Execute operations based on conditions
- `try-catch` - Error handling with fallback operations
- `parallel` - Concurrent operation execution
- `forEach` - Apply operations to each document
- `map` - Transform documents
- `reduce` - Aggregate document data
- `branch` - Create conditional pipelines

### Configuration Options

- `maxConcurrency` - Maximum parallel operations (default: 5)
- `batchSize` - Process documents in batches
- `timeout` - Operation timeout in milliseconds
- `errorStrategy` - How to handle errors: 'fail-fast', 'continue', 'collect'
- `progress` - Show progress for long operations
