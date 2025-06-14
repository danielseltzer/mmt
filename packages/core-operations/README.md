# @mmt/core-operations

Core operations implementing the MMT domain-specific language for markdown document management.

## Purpose

This package provides the fluent API for querying and manipulating markdown documents in a vault. It implements the operations defined in the [MMT Language Specification](../../docs/designing/mmt-language-spec-v2.md).

## Key Features

- **Vault Loading**: Load markdown documents from filesystem with metadata extraction
- **Fluent Query API**: Chain operations to build complex document selections
- **Set Operations**: Union, intersect, and difference on document sets
- **Safe Operations**: All operations validated before execution
- **Index Management**: Efficient lookups by tag, path, and links

## Usage

```typescript
import { loadVault, createVaultContext } from '@mmt/core-operations';

// Load a vault from filesystem
const vault = await loadVault('/path/to/vault');

// Create a context for fluent operations
const ctx = createVaultContext(vault);

// Query and manipulate documents
const result = await ctx
  .select({ 
    'fs:path': 'posts/**',
    'fm:status': 'draft'
  })
  .filter(doc => doc.metadata.modified < thirtyDaysAgo)
  .move('archive/old-drafts/')
  .mergeMetadata({ archived: new Date() })
  .execute();

// Check results
if (result.success) {
  console.log(`Moved ${result.movedFiles.length} files`);
  console.log(`Updated ${result.updatedLinks.length} links`);
}
```

## Query Syntax

Queries use namespace prefixes to distinguish metadata sources:

- `fs:` - Filesystem metadata (path, name, modified, size)
- `fm:` - Frontmatter properties
- `content:` - Content search (text, regex)
- `inline:` - Inline metadata (tags, mentions)

```typescript
// Examples
ctx.select({
  'fs:path': 'projects/**/*.md',     // Glob pattern
  'fs:modified': '>30d',             // Relative date
  'fm:priority': 'high',             // Exact match
  'fm:tags': { $contains: 'urgent' }, // Array operator
  'content:text': 'TODO'             // Text search
});
```

## Operations

### Query Operations
- `select(query)` - Select documents matching criteria
- `filter(predicate)` - Filter current selection
- `union(other)` - Combine with another selection
- `intersect(other)` - Find common documents
- `difference(other)` - Find documents in first but not second

### Transform Operations (coming soon)
- `move(destination)` - Move selected documents
- `mergeMetadata(updates)` - Add/update frontmatter
- `replaceMetadata(metadata)` - Replace all frontmatter
- `removeMetadata(keys)` - Remove frontmatter fields
- `transformMetadata(fn)` - Custom metadata transformation

### Execution
- `execute()` - Execute all pending operations atomically

## Development

```bash
pnpm build    # Build TypeScript
pnpm test     # Run tests
pnpm dev      # Watch mode
```

## Testing

The package includes comprehensive test utilities for creating test vaults:

```typescript
import { TestVault } from '@mmt/core-operations/test/test-utils';

const testVault = new TestVault();
const vaultPath = await testVault.setup(); // Creates test files
// ... run tests
await testVault.cleanup(); // Removes test files
```