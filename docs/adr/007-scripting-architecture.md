# ADR-007: Scripting Architecture

## Status

Accepted

## Context

MMT needs a scripting API that allows users to automate markdown vault operations. Based on Issue #26, we need to decide on:
- API style (fluent/chainable vs functional)
- Operation pipeline architecture
- Result collection and reporting
- Error handling patterns
- Configuration management

This API will be the foundation for both user scripts and the GUI (which constructs scripts behind the scenes).

## Decision

### Scripts as Declarative Schemas

Scripts are not arbitrary code but constrained declarations that implement a simple interface:

```typescript
// Script implements this interface
export interface Script {
  define(context: ScriptContext): OperationPipeline;
}

// Example script: archive-old-posts.mmt.ts
export default class ArchiveOldPosts implements Script {
  define(context: ScriptContext): OperationPipeline {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    return {
      select: { 'fs:path': 'posts/**/*.md' },
      filter: doc => doc.metadata.modified < oneWeekAgo,
      operations: [
        { type: 'move', destination: 'archive/old-posts' }
      ],
      output: { format: 'summary' }
    };
  }
}
```

The script runner handles all bootstrapping, configuration, execution, and output.

### Core Components

1. **Script Interface**: Simple contract that scripts implement
2. **Operation Pipeline Schema**: Declarative structure describing work
3. **Script Runner**: Loads scripts, provides context, executes pipelines
4. **Result Handler**: Formats and outputs results based on script preferences

### Selection Patterns

Scripts can select files in multiple ways:

```typescript
// Pattern-based selection
{ select: { 'fs:path': 'posts/**/*.md' } }

// Query-based selection  
{ select: { 'fm:status': 'draft' } }

// Explicit file list (for cherry-picking)
{ select: { 
  files: [
    'posts/2024/january/post1.md',
    'posts/2024/january/post5.md',
    'posts/2024/february/post3.md'
  ]
}}

// Combined (files matching pattern AND in list)
{ select: {
  'fs:path': 'posts/**/*.md',
  files: ['posts/2024/january/post1.md', 'posts/2024/january/post5.md']
}}

### Operation Pipeline Schema

```typescript
interface OperationPipeline {
  // Selection criteria (required)
  select: SelectCriteria;
  
  // Optional filter function
  filter?: (doc: Document) => boolean;
  
  // Operations to perform (at least one required)
  operations: Operation[];
  
  // Output preferences
  output?: {
    format: 'summary' | 'detailed' | 'csv' | 'json';
    fields?: string[];  // For csv/json
  };
  
  // Execution options
  options?: {
    executeNow?: boolean;  // Default false - must opt-in to execute
    failFast?: boolean;
    parallel?: boolean;
  };
}

interface Operation {
  type: 'move' | 'rename' | 'updateFrontmatter' | 'delete' | 'custom';
  // Type-specific parameters
  [key: string]: any;
}

### Result Structure

All operations return structured results:

```typescript
interface ExecutionResult<T = Document> {
  // What was attempted
  attempted: T[];
  
  // Successful operations
  succeeded: Array<{
    item: T;
    operation: Operation;
    details?: any;
  }>;
  
  // Failed operations
  failed: Array<{
    item: T;
    operation: Operation;
    error: Error;
  }>;
  
  // Skipped (e.g., no changes needed)
  skipped: Array<{
    item: T;
    operation: Operation;
    reason: string;
  }>;
  
  // Execution metadata
  stats: {
    duration: number;
    startTime: Date;
    endTime: Date;
  };
}
```

### Safe by Default

Scripts show what they would do without making changes unless explicitly told to execute:

```typescript
// All scripts are safe by default - no changes without executeNow
export default class CleanupObsolete implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: { 'fm:status': 'obsolete' },
      operations: [{ type: 'delete' }],
      output: { format: 'detailed' }  // Show each file
      // Note: no executeNow, so this is preview-only by default
    };
  }
}
```

Preview output shows exactly what would happen:
```
PREVIEW MODE - No changes made

Selected 47 files matching criteria:
  ✓ notes/old/meeting-2023-01-15.md → DELETE
  ✓ notes/old/meeting-2023-01-22.md → DELETE
  ✓ archive/obsolete/project-x.md → DELETE
  ... 44 more files

Summary:
- Files to delete: 47
- Total size: 1.2 MB

To execute these changes, run with --execute flag
```

### Script Execution

The script runner defaults to preview mode for safety:

```bash
# Default behavior: preview what would happen
mmt script cleanup.mmt.ts --config vault.yaml

# After reviewing, execute the changes
mmt script cleanup.mmt.ts --config vault.yaml --execute

# Scripts can force execution (use with caution!)
export default class AutoArchive implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: { 'fm:autoArchive': true },
      operations: [{ type: 'move', destination: 'archive' }],
      options: { executeNow: true }  // Bypass preview
    };
  }
}
```

The runner:
1. Loads the configuration
2. Creates a script context with vault info
3. Calls script.define(context) to get the pipeline
4. Validates the pipeline schema
5. Checks for executeNow flag (from script or CLI)
6. Shows preview or executes operations
7. Formats and outputs results

### Testing Scripts

Scripts are tested by running them with test vaults:

```typescript
// archive-old-posts.test.ts
import { ScriptRunner } from '@mmt/scripting';
import { createTestVault } from '@mmt/test-utils';
import ArchiveOldPosts from './archive-old-posts.mmt';

test('archives posts older than one week', async () => {
  // Create test vault with old posts
  const { vaultPath, indexPath, cleanup } = await createTestVault({
    'posts/old-post.md': { modified: twoWeeksAgo },
    'posts/new-post.md': { modified: yesterday },
  });
  
  // Run script
  const runner = new ScriptRunner({
    config: { vaultPath, indexPath },
    output: 'none'  // Suppress output in tests
  });
  
  const result = await runner.execute(new ArchiveOldPosts());
  
  expect(result.succeeded).toHaveLength(1);
  expect(result.succeeded[0].item.path).toBe('posts/old-post.md');
  
  cleanup();
});
```

## Consequences

**Positive:**
- Scripts are declarative schemas, not arbitrary code
- Safe by default - must opt-in to execute changes
- Clear contract between scripts and the runner
- GUI can easily generate these schemas
- Scripts can be validated before execution
- Supports explicit file lists for cherry-picking
- Testable with real files
- Scripts are data structures that can be analyzed/transformed
- Eliminates accidental destructive operations

**Negative:**
- Less flexible than arbitrary code
- Must fit operations into the schema model
- Scripts can't do complex conditional logic
- Need to maintain the Script interface contract

**Mitigation:**
- Rich set of built-in operations covers most needs
- Filter functions allow some conditional logic
- Custom operation type for edge cases
- Clear examples for common patterns
- Scripts can be composed by the runner