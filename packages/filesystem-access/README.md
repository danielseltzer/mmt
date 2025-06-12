# @mmt/filesystem-access

Centralized file system access layer for MMT. All file operations in the application must go through this package.

## Purpose

This package provides a single, testable interface for all file system operations. It ensures:
- Consistent error handling across the application
- Centralized path validation and security
- Easy testing with dependency injection
- Support for markdown-specific operations

## Key Features

- Basic file operations (read, write, delete)
- Directory operations (create, list, check existence)
- File metadata (stats)
- File movement and copying (rename, copy, hard links)
- Markdown-specific operations with frontmatter parsing

## Usage

```typescript
import { NodeFileSystem } from '@mmt/filesystem-access';

const fs = new NodeFileSystem();

// Read a file
const content = await fs.readFile('/path/to/file.md');

// Write a file (creates parent directories automatically)
await fs.writeFile('/path/to/new/file.md', 'content');

// Read markdown with frontmatter
const { content, frontmatter } = await fs.readMarkdownFile('/path/to/doc.md');

// Write markdown with frontmatter
await fs.writeMarkdownFile('/path/to/doc.md', '# Content', {
  title: 'My Document',
  tags: ['example']
});

// Check if file exists
const exists = await fs.exists('/path/to/file.md');

// Create hard link for snapshot backups
await fs.hardLink('/source/file.md', '/backup/file.md');
```

## Interface

The `FileSystemAccess` interface defines all available operations:

- `readFile(path)` - Read file content as string
- `writeFile(path, content)` - Write content to file
- `exists(path)` - Check if file/directory exists
- `mkdir(path, options)` - Create directory
- `readdir(path)` - List directory contents
- `stat(path)` - Get file/directory metadata
- `unlink(path)` - Delete file
- `rename(oldPath, newPath)` - Move/rename file
- `copyFile(source, dest)` - Copy file
- `hardLink(source, dest)` - Create hard link
- `readMarkdownFile(path)` - Parse markdown with frontmatter
- `writeMarkdownFile(path, content, frontmatter)` - Write markdown with frontmatter

## Testing

This package is designed for easy testing with dependency injection:

```typescript
class MyService {
  constructor(private fs: FileSystemAccess) {}
  
  async loadData(path: string) {
    return this.fs.readFile(path);
  }
}

// In tests, use real filesystem with temp directories
const tempDir = await mkdtemp(join(tmpdir(), 'test-'));
const fs = new NodeFileSystem();
const service = new MyService(fs);
```

## Development

```bash
pnpm build    # Build TypeScript
pnpm test     # Run tests
pnpm dev      # Watch mode
```