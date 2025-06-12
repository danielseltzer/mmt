# @mmt/entities

Zod schemas that define the contracts between all MMT packages. These schemas serve as the single source of truth for data structures across the entire application.

## Purpose

This package contains ONLY Zod schemas - no business logic, no utilities, just type definitions. All other packages depend on these schemas to ensure type safety and consistency.

## Key Schemas

- **Config**: Application configuration (vault path, optional QM service URL)
- **DocumentMetadata**: Core document information (path, frontmatter, tags, links)
- **Query**: GitHub-style query syntax for filtering documents
- **DocumentSet**: Named collection of documents with query
- **Operation**: File operations (move, update-frontmatter) 
- **Snapshot**: Backup snapshot information
- **TableViewConfig**: Table display configuration

## Usage

```typescript
import { ConfigSchema, type Config } from '@mmt/entities';

// Validate configuration
const config = ConfigSchema.parse({
  vaultPath: '/path/to/vault',
  qmServiceUrl: 'http://localhost:8080'
});

// Type-safe operations
const doc: DocumentMetadata = {
  path: '/vault/note.md',
  relativePath: 'note.md',
  name: 'note',
  modified: new Date(),
  size: 1024
};
```

## Development

```bash
pnpm build    # Build TypeScript
pnpm test     # Run tests
pnpm dev      # Watch mode
```