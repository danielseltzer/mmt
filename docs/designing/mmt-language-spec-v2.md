# MMT Language Specification v2

## Overview

MMT is fundamentally a domain-specific language for operating on collections of markdown documents. This specification defines the complete vocabulary of objects, operations, and rules that comprise the MMT language.

## Core Principle

Every user action in MMT can be expressed as a fluent chain of operations. The UI is merely a way to construct and execute these operation chains.

## Fluent API Design

The MMT language supports a fluent, chainable API pattern:

```typescript
// Fluent example: Archive old drafts
const result = await vault
  .select({ 'fm:tag': ['draft'], 'fs:path': 'posts/**' })
  .filter(doc => doc.metadata.modified < thirtyDaysAgo)
  .move('archive/2024/')
  .updateMetadata({ archived: new Date() })
  .execute();

// Each operation returns a new immutable context
// Nothing executes until .execute() is called
```

## Core Objects

### Document
```typescript
interface Document {
  path: string;              // Absolute path within vault
  content: string;           // Raw markdown content
  metadata: {
    name: string;            // Filename without extension
    modified: Date;          // Last modification time
    size: number;            // Size in bytes
    frontmatter: Record<string, unknown>;
    tags: string[];          // Extracted from content/frontmatter
    links: string[];         // Outgoing [[wiki-links]]
  };
}
```

### VaultContext
The immutable context that operations build upon:

```typescript
interface VaultContext {
  vault: Vault;                    // Current vault state
  selection: DocumentSet;          // Current document selection
  pendingOps: Operation[];         // Operations to be executed
  
  // Fluent operations return new contexts
  select(query: Query): VaultContext;
  filter(predicate: (doc: Document) => boolean): VaultContext;
  move(destination: string): VaultContext;
  updateMetadata(updates: Partial<Metadata>): VaultContext;
  execute(): Promise<ExecutionResult>;
}
```

## Operations Reference

### select(query: Query): VaultContext

Selects documents matching a query from the vault.

**Parameters:**
- `query`: GitHub-style query with text, path, tags, etc.

**Constraints:**
- Empty query selects all documents
- Query fields are ANDed together
- Path patterns use glob syntax
- Tag matches are case-insensitive

**Testable Assertions:**
```typescript
// Test: Empty query selects all
const all = vault.select({});
assert(all.selection.count === vault.documentCount);

// Test: Path patterns work
const posts = vault.select({ 'fs:path': 'posts/**/*.md' });
assert(posts.selection.documents.every(d => d.path.startsWith('/posts/')));

// Test: Multiple tags are ANDed
const taggedDocs = vault.select({ 'fm:tag': ['draft', 'important'] });
assert(taggedDocs.selection.documents.every(d => 
  d.metadata.tags.includes('draft') && 
  d.metadata.tags.includes('important')
));
```

### filter(predicate: (doc: Document) => boolean): VaultContext

Filters the current selection using a predicate function.

**Parameters:**
- `predicate`: Function that returns true to keep a document

**Constraints:**
- Can only filter existing selection (must call select first)
- Predicate must be pure (no side effects)
- Empty selection remains empty

**Testable Assertions:**
```typescript
// Test: Filter reduces selection
const old = vault
  .select({ 'fs:path': 'posts/**' })
  .filter(doc => doc.metadata.modified < oneYearAgo);
assert(old.selection.count <= vault.select({ 'fs:path': 'posts/**' }).selection.count);

// Test: Filter on empty selection returns empty
const empty = vault
  .select({ 'fm:tag': ['nonexistent'] })
  .filter(doc => true);
assert(empty.selection.count === 0);
```

### move(destination: string): VaultContext

Generates move operations for the current selection.

**Parameters:**
- `destination`: Target directory path (relative to vault)

**Constraints:**
- Destination must be within vault (no .. traversal)
- Cannot overwrite existing files (generates unique names)
- Preserves file extension
- Updates all [[wiki-links]] pointing to moved files
- Creates destination directory if needed
- Maintains frontmatter without modification

**Testable Assertions:**
```typescript
// Test: Cannot move outside vault
assert.throws(() => 
  vault.select({ 'fs:path': 'doc.md' }).move('../outside/')
);

// Test: No overwrites - generates unique names
const result = vault
  .select({ 'fs:path': 'a.md' })
  .move('folder/') // folder/a.md exists
  .execute();
assert(result.movedFiles['a.md'] === 'folder/a-1.md');

// Test: Links are updated
const withLinks = vault
  .select({ 'fs:path': 'doc-with-links.md' })
  .move('new-folder/')
  .execute();
// All documents linking to doc-with-links.md now link to new-folder/doc-with-links.md
assert(withLinks.updatedLinks.length > 0);

// Test: Preserves extensions
const docs = vault
  .select({ 'fs:path': '*.md' })
  .move('archive/');
assert(docs.pendingOps.every(op => 
  op.type === 'move' && op.to.endsWith('.md')
));
```

### updateMetadata(updates: Partial<Metadata>, mode: 'merge' | 'replace' = 'merge'): VaultContext

Updates frontmatter for selected documents.

**Parameters:**
- `updates`: Properties to add/update
- `mode`: Whether to merge with or replace existing frontmatter

**Constraints:**
- Merge mode: Deep merges objects, concatenates arrays
- Replace mode: Completely replaces frontmatter
- Must produce valid YAML
- Cannot update system properties (path, size, modified)
- Null values remove properties in merge mode

**Testable Assertions:**
```typescript
// Test: Merge adds new properties
const merged = vault
  .select({ 'fs:path': 'doc.md' }) // has {title: 'Old'}
  .updateMetadata({ tags: ['new'] }, 'merge')
  .execute();
assert(merged.documents['doc.md'].metadata.frontmatter.title === 'Old');
assert(merged.documents['doc.md'].metadata.frontmatter.tags.includes('new'));

// Test: Replace removes old properties  
const replaced = vault
  .select({ 'fs:path': 'doc.md' }) // has {title: 'Old', tags: ['a']}
  .updateMetadata({ status: 'new' }, 'replace')
  .execute();
assert(replaced.documents['doc.md'].metadata.frontmatter.title === undefined);
assert(replaced.documents['doc.md'].metadata.frontmatter.status === 'new');

// Test: Null removes in merge mode
const removed = vault
  .select({ 'fs:path': 'doc.md' })
  .updateMetadata({ unwanted: null }, 'merge')
  .execute();
assert(!('unwanted' in removed.documents['doc.md'].metadata.frontmatter));
```

### union(otherSelection: VaultContext): VaultContext

Combines two selections (OR operation).

**Constraints:**
- Both selections must be from same vault
- Deduplicates documents (by path)
- Preserves operation order

**Testable Assertions:**
```typescript
// Test: Union combines selections
const drafts = vault.select({ 'fm:tag': ['draft'] });
const recent = vault.select({ 'fs:path': 'posts/2024/**' });
const combined = drafts.union(recent);
assert(combined.selection.count >= Math.max(drafts.selection.count, recent.selection.count));

// Test: No duplicates
const tagA = vault.select({ 'fm:tag': ['a'] }); // doc1, doc2
const tagB = vault.select({ 'fm:tag': ['b'] }); // doc2, doc3
const union = tagA.union(tagB);
assert(union.selection.count === 3); // doc1, doc2, doc3 (no duplicate doc2)
```

### intersect(otherSelection: VaultContext): VaultContext

Finds documents in both selections (AND operation).

**Constraints:**
- Both selections must be from same vault
- Result is subset of both inputs
- Empty if no overlap

**Testable Assertions:**
```typescript
// Test: Intersect finds common documents
const posts = vault.select({ 'fs:path': 'posts/**' });
const drafts = vault.select({ 'fm:tag': ['draft'] });
const draftPosts = posts.intersect(drafts);
assert(draftPosts.selection.documents.every(d => 
  d.path.startsWith('/posts/') && d.metadata.tags.includes('draft')
));

// Test: Empty intersection
const tagA = vault.select({ 'fm:tag': ['only-a'] });
const tagB = vault.select({ 'fm:tag': ['only-b'] });
assert(tagA.intersect(tagB).selection.count === 0);
```

### difference(otherSelection: VaultContext): VaultContext

Documents in current selection but not in other (set difference).

**Constraints:**
- Order matters: A.difference(B) ≠ B.difference(A)
- Result is subset of first selection

**Testable Assertions:**
```typescript
// Test: Difference removes documents
const all = vault.select({});
const drafts = vault.select({ 'fm:tag': ['draft'] });
const nonDrafts = all.difference(drafts);
assert(nonDrafts.selection.documents.every(d => 
  !d.metadata.tags.includes('draft')
));
```

### execute(): Promise<ExecutionResult>

Executes all pending operations atomically.

**Returns:**
```typescript
interface ExecutionResult {
  success: boolean;
  vault?: Vault;              // New vault state if successful
  error?: Error;              // Error if failed
  executed: Operation[];      // Operations that were executed
  rollback?: () => Promise<void>; // Function to undo if needed
  
  // Detailed results
  movedFiles: Record<string, string>;    // oldPath -> newPath
  updatedLinks: Array<{                  // Links that were updated
    inFile: string;
    oldTarget: string;
    newTarget: string;
  }>;
  modifiedFiles: string[];               // Files with metadata changes
}
```

**Constraints:**
- All operations succeed or all fail (atomic)
- Validates all operations before executing any
- Uses temp files + atomic rename for safety
- Provides rollback function for 60 seconds
- Updates vault index after success

**Testable Assertions:**
```typescript
// Test: Atomic execution
const result = await vault
  .select({ path: 'posts/**' })
  .move('invalid/../../path') // This will fail
  .execute();
assert(result.success === false);
assert(result.executed.length === 0); // Nothing was executed

// Test: Rollback works
const before = vault.select({}).selection.documents;
const result = await vault
  .select({ 'fm:tag': ['temp'] })
  .move('archived/')
  .execute();
assert(result.success === true);
await result.rollback();
const after = vault.select({}).selection.documents;
assert.deepEqual(before, after); // State restored
```

## Advanced Patterns

### Conditional Operations

```typescript
// Only archive if more than 100 old drafts
const oldDrafts = vault
  .select({ 'fm:tag': ['draft'] })
  .filter(doc => doc.metadata.modified < thirtyDaysAgo);

if (oldDrafts.selection.count > 100) {
  const result = await oldDrafts
    .move('archive/bulk/')
    .updateMetadata({ archivedDate: new Date() })
    .execute();
}
```

### Multi-step Workflows

```typescript
// 1. Find orphaned images
const images = vault.select({ 'fs:path': 'images/**' });
const orphaned = images.filter(img => {
  const linkedFrom = vault.findIncomingLinks(img.path);
  return linkedFrom.length === 0;
});

// 2. Move to review folder with metadata
const result = await orphaned
  .move('images/to-review/')
  .updateMetadata({ 
    reviewStatus: 'orphaned',
    detectedOn: new Date()
  })
  .execute();

// 3. Create summary document
if (result.success) {
  const summary = `# Orphaned Images Report\n\n${
    result.movedFiles.entries().map(([from, to]) => 
      `- Moved ${from} to ${to}`
    ).join('\n')
  }`;
  
  await vault
    .create('reports/orphaned-images.md', summary)
    .execute();
}
```

### Safe Bulk Operations

```typescript
// Process in batches to avoid memory issues
const BATCH_SIZE = 100;
const largeSe
  = vault.select({ 'fs:path': 'data/**' });

for (let i = 0; i < largeSet.selection.count; i += BATCH_SIZE) {
  const batch = largeSet
    .slice(i, i + BATCH_SIZE)
    .updateMetadata({ processed: true });
    
  const result = await batch.execute();
  if (!result.success) {
    console.error(`Batch ${i} failed:`, result.error);
    break;
  }
}
```

## Implementation Notes

1. **Lazy Evaluation**: Operations build up a plan but don't execute until `.execute()`
2. **Immutability**: Each operation returns a new context object
3. **Type Safety**: Full TypeScript types with generics where appropriate
4. **Performance**: Operations are optimized for bulk processing
5. **Safety**: All operations validated before execution, with automatic rollback

This design enables both simple one-liners and complex multi-step workflows while maintaining safety and predictability.