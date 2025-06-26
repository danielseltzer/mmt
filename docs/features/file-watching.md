# File Watching

MMT supports automatic index updates when files change in your vault through file watching functionality.

## Overview

When file watching is enabled, the indexer automatically detects and processes:
- New markdown files added to the vault
- Modified markdown files
- Deleted markdown files

This ensures your index stays in sync without manual refreshes.

## Configuration

### Via Configuration File

Add the `fileWatching` section to your MMT config file:

```yaml
vaultPath: /path/to/your/vault
indexPath: /path/to/index

fileWatching:
  enabled: true              # Enable/disable file watching
  debounceMs: 100           # Delay in ms to batch rapid changes (default: 100)
  ignorePatterns:           # Glob patterns to ignore
    - .git/**
    - .obsidian/**
    - .trash/**
    - node_modules/**
```

### Via CLI Flag

Use the `--watch` flag to enable file watching for a single session:

```bash
mmt --config=config.yaml --watch script my-script.mmt.ts
```

The CLI flag overrides the configuration file setting.

## How It Works

1. **Initial Index**: When the indexer starts, it performs a full scan of your vault
2. **Watch Mode**: If file watching is enabled, it monitors for changes
3. **Debouncing**: Rapid changes are batched together based on `debounceMs`
4. **Selective Updates**: Only changed files are re-indexed, not the entire vault

## Performance Considerations

- File watching has minimal overhead for vaults under 10,000 files
- Each file change triggers a single file re-index operation
- Debouncing prevents excessive updates during bulk operations
- Ignore patterns reduce unnecessary processing

## Use Cases

### Development Workflow
Enable file watching during active note-taking or development:
```bash
mmt --config=config.yaml --watch script analyze-recent.mmt.ts
```

### Batch Operations
Disable file watching when performing bulk operations:
```yaml
fileWatching:
  enabled: false
```

### Selective Watching
Use ignore patterns to exclude temporary or build directories:
```yaml
fileWatching:
  ignorePatterns:
    - .git/**
    - build/**
    - "*.tmp"
    - "*.bak"
```

## Technical Details

- Uses [chokidar](https://github.com/paulmillr/chokidar) for cross-platform file watching
- Events are processed through the vault package's FileWatcher
- Link references are automatically updated when files move
- Cache is updated alongside the index when enabled

## Troubleshooting

### Files Not Being Detected

1. Check if the file has a `.md` extension
2. Verify the file isn't matched by ignore patterns
3. Ensure file watching is enabled in config or via CLI
4. Check console output for indexing errors

### High CPU Usage

- Increase `debounceMs` to reduce update frequency
- Add more specific ignore patterns
- Consider disabling for very large vaults (>10,000 files)

### Changes Not Reflected

- File watching only works while MMT is running
- Restart MMT if file watching stops responding
- Check for file permission issues

## API Reference

### Configuration Schema

```typescript
fileWatching?: {
  enabled: boolean;        // Enable/disable file watching
  debounceMs?: number;     // Debounce delay in milliseconds (default: 100)
  ignorePatterns?: string[]; // Glob patterns to ignore
}
```

### Indexer Options

```typescript
interface IndexerOptions {
  // ... other options
  fileWatching?: {
    enabled: boolean;
    debounceMs?: number;
    ignorePatterns?: string[];
  };
}
```