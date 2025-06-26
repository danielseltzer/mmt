# @mmt/vault

Vault loading and monitoring for MMT markdown management.

## Purpose

This package provides core vault functionality:
- Loading markdown documents from the filesystem
- Creating vault contexts for querying
- Monitoring file changes in real-time

## Key Features

- **Vault Loading**: Scan and load markdown documents with metadata extraction
- **Index Management**: Efficient lookups by tag, path, and links
- **File Watching**: Real-time monitoring of markdown file changes using chokidar
- **Query Support**: Basic document selection and filtering

## Usage

### Loading a Vault

```typescript
import { loadVault, createVaultContext } from '@mmt/vault';

// Load a vault from filesystem
const vault = await loadVault('/path/to/vault');

// Create a context for operations
const ctx = createVaultContext(vault);

// Query documents
const posts = ctx.select({ 'fs:path': 'posts/**' });
```

### File Watching

```typescript
import { FileWatcher } from '@mmt/vault';

// Create and start file watcher
const watcher = new FileWatcher({
  paths: ['/path/to/vault'],
  debounceMs: 300,
  ignorePatterns: ['*.tmp', '.*']
});

// Listen for changes
watcher.onFileChange((event) => {
  console.log(`File ${event.type}: ${event.path}`);
  // Trigger re-indexing or other operations
});

await watcher.start();

// Later: stop watching
await watcher.stop();
```

## API

### loadVault(basePath, fs?)
Loads all markdown files from a directory tree.

### createVaultContext(vault)
Creates a context for querying the vault.

### FileWatcher
Monitors markdown files for changes with configurable debouncing and ignore patterns.

## File Watching Events

- `created` - New markdown file added
- `modified` - Existing markdown file changed  
- `deleted` - Markdown file removed

Default ignore patterns:
- Hidden files (`.*`)
- Temporary files (`*.tmp`)
- Backup files (`*.backup.*`)
- Trash directories (`.trash/**`)
- Version control (`.git/**`)

## Development

```bash
pnpm build    # Build TypeScript
pnpm test     # Run tests
pnpm dev      # Watch mode
```

## Dependencies

- `@mmt/entities` - Core type definitions
- `@mmt/filesystem-access` - File system abstraction
- `@mmt/query-parser` - Query parsing
- `chokidar` - Cross-platform file watching
- `minimatch` - Glob pattern matching