# File Watcher Timing Considerations

## Overview

The MMT file watcher uses debouncing to batch rapid file system changes. This introduces a small delay between when a file is created/modified and when it becomes available in the index.

## Timing Breakdown

When a file is created or modified:

1. **File system event** - The OS detects the change (nearly instant)
2. **Chokidar detection** - The file watcher library detects the event (~10-50ms)
3. **Debounce delay** - Events are batched to avoid excessive processing
   - Default: 100ms
   - Test config: 50ms
4. **Indexing time** - File is read, parsed, and added to index (~5-20ms per file)

**Total delay**: ~65-170ms in tests, ~115-170ms in production

## Testing Implications

When writing tests that create files and expect them to be indexed:

```javascript
// Create file
await fs.writeFile(path, content);

// Wait for indexing to complete
await new Promise(resolve => setTimeout(resolve, 200)); // Minimum safe delay

// File should now be available in index
```

### Recommended Wait Times

- **Unit tests**: Not applicable (use mocked file systems)
- **Integration tests**: 200-300ms (accounts for debounce + indexing)
- **E2E tests**: 500ms+ (accounts for network/API overhead)

## Configuration

Adjust debounce timing based on your use case:

```yaml
fileWatching:
  enabled: true
  debounceMs: 100  # Default, good for most cases
  # debounceMs: 50   # Faster response, more CPU usage
  # debounceMs: 300  # Slower response, better for bulk operations
```

## Debugging Tips

If files aren't being indexed:

1. Check if file watching is enabled in config
2. Verify the file has a `.md` extension
3. Ensure the file isn't matched by ignore patterns
4. Add logging to confirm file events are being received
5. Increase wait times in tests to rule out timing issues

## Performance Notes

- The debounce delay is per-file, not global
- Multiple files created simultaneously will be indexed in parallel
- The indexer can handle thousands of file events per second
- Longer debounce delays reduce CPU usage during bulk operations