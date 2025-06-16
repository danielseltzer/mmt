# ADR-008: Indexer Architecture

## Status

Proposed

## Context

The indexer package is a critical component of MMT that enables fast querying of markdown vaults. After analyzing Obsidian Dataview's mature implementation, we need to decide between:

1. A simple, naive implementation that's easier to build but may not scale
2. A sophisticated multi-index architecture proven to handle large vaults

The indexer must:
- Support 5000+ files with <5 second initial indexing
- Enable <100ms query response times
- Handle real-time updates efficiently
- Provide a foundation for the scripting and GUI packages

## Decision

Adopt a Dataview-inspired multi-index architecture with the following components:

### 1. Multi-Index Storage
- **Primary index**: `Map<path, PageMetadata>` for complete file metadata
- **Secondary indices**: Specialized structures for query performance
  - Tag index for tag queries
  - Title index for name resolution
  - Prefix tree for path pattern matching
  - Link cache for graph queries
- **Revision tracking**: Simple counter for change propagation

### 2. Worker-Based Processing
- Parse files in Web Worker threads
- Batch processing to prevent blocking
- Keep UI responsive during large indexing operations

### 3. Persistent Caching
- Cache metadata between sessions
- Only re-parse changed files (mtime/size comparison)
- Critical for startup performance with large vaults

### 4. Incremental Updates
- File watcher integration with debouncing
- Update only affected indices
- Queue-based processing for efficiency

## Rationale

### Why Complexity is Justified

1. **Proven Performance**: Dataview handles vaults with 10,000+ files effectively
2. **Query Speed**: Specialized indices enable sub-100ms queries
3. **User Experience**: Responsive UI during indexing is non-negotiable
4. **Future-Proof**: Architecture scales with vault size

### Why Not Simple First?

1. **Refactoring Cost**: Changing architecture later would break dependent packages
2. **Performance Wall**: Simple Map-based approach hits limits around 1000 files
3. **User Expectations**: Users expect Obsidian-level performance

### Key Trade-offs

- **Complexity**: More code, more testing, longer development
- **Memory Usage**: Multiple indices increase memory footprint
- **Dependencies**: Adds chokidar, better-sqlite3, worker threads

## Implementation Details

### Data Structures

```typescript
interface PageMetadata {
  path: string;
  title: string;
  ctime: number;
  mtime: number;
  size: number;
  tags: string[];
  frontmatter: Record<string, any>;
  headings: Heading[];
  hash: string;  // For change detection
}

class VaultIndexer {
  private pages: Map<string, PageMetadata>;
  private tags: Map<string, Set<string>>;
  private titles: Map<string, string>;
  private prefixTree: PrefixIndex;
  private links: LinkCache;
  private revision: number = 0;
  private cache: MetadataCache;
  private workers: Worker[];
}
```

### Query Execution Strategy

1. Analyze query to determine optimal index
2. Use specialized index if possible
3. Fall back to filtering primary index
4. Cache frequent queries (future enhancement)

### Change Management

1. File watcher detects changes
2. Queue updates with debouncing
3. Check cache validity
4. Parse only changed files
5. Update affected indices
6. Increment revision

## Consequences

### Positive

- **Performance**: Meets aggressive performance targets
- **Scalability**: Handles vaults with 10,000+ files
- **User Experience**: Responsive during all operations
- **Query Flexibility**: Supports complex query combinations
- **Future Features**: Foundation for advanced features like full-text search

### Negative

- **Development Time**: 3 weeks vs 1 week for simple version
- **Complexity**: More moving parts, harder to debug
- **Memory Usage**: ~50MB for 5000 files (vs ~20MB simple)
- **Dependencies**: External libraries increase bundle size
- **Testing**: Requires sophisticated test infrastructure

### Mitigation

- **Phased Implementation**: Core first, optimizations later
- **Extensive Testing**: Performance benchmarks from day 1
- **Documentation**: Clear architecture diagrams and examples
- **Monitoring**: Built-in performance metrics

## Alternatives Considered

### 1. Simple Map-Based Index
- Single `Map<path, Document>` with full content
- Filter on every query
- **Rejected**: Too slow for large vaults

### 2. SQLite-Only Solution  
- All data in SQLite, no in-memory indices
- **Rejected**: Query performance suffers, complex SQL

### 3. External Search Engine
- Use Elasticsearch or similar
- **Rejected**: Too heavy, deployment complexity

## References

- [Dataview FullIndex](https://github.com/blacksmithgu/obsidian-dataview/blob/master/src/data-index/index.ts)
- [VSCode File Watcher](https://github.com/microsoft/vscode/blob/main/src/vs/platform/files/node/watcher/nsfw/nsfwWatcherService.ts)
- [Obsidian Vault Architecture](https://forum.obsidian.md/t/obsidian-sync-backend-architecture/3372)