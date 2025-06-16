# Indexer Package Implementation Plan

## Overview

The `@mmt/indexer` package provides fast, in-memory indexing of markdown vaults with Dataview-inspired query capabilities. It maintains multiple indices for efficient querying and supports real-time updates via file watching.

## Architecture

### Core Components

1. **VaultIndexer** - Main class that orchestrates indexing
2. **IndexStorage** - In-memory storage with multiple indices
3. **LinkExtractor** - Extracts wikilinks and markdown links
4. **QueryExecutor** - Executes queries against indices
5. **FileWatcher** - Handles incremental updates (using chokidar)

### Data Structures

```typescript
// Primary document storage
Map<string, IndexedDocument> // path -> document metadata

// Secondary indices for fast queries
Map<string, Set<string>> // frontmatter property -> document paths
Map<string, Set<string>> // tag -> document paths
Map<string, LinkInfo[]> // source path -> outgoing links
Map<string, Set<string>> // target path -> incoming link sources

// For text search (phase 2)
Map<string, Set<string>> // word -> document paths (simple inverted index)
```

## Implementation Phases

### Phase 1: Core Indexing (What we'll build first)

1. **Basic Document Indexing**
   - Read markdown files from vault
   - Extract frontmatter using gray-matter
   - Store document metadata
   - Build property indices

2. **Link Extraction & Indexing**
   - Extract `[[wikilinks]]` with regex
   - Extract `[markdown](links)` with regex
   - Build bidirectional link indices
   - Handle link resolution (simplified initially)

3. **Query Execution**
   - Property queries (`fm:status`, `fm:tags`)
   - Path queries (`fs:path` with glob patterns)
   - Link queries (incoming/outgoing links)
   - Combine multiple conditions with AND logic

4. **Testing with Real Files**
   - Create test vaults in temp directories
   - Test all query types
   - Performance test with 5000 files

### Phase 2: File Watching (Can be added later)

1. **Chokidar Integration**
   - Watch for add/change/delete events
   - Update indices incrementally
   - Handle edge cases (atomic saves, etc.)

### Phase 3: Advanced Features (Future)

1. **Text Search**
   - Simple word tokenization
   - Inverted index for content
   - Combined text + property queries

2. **Performance Optimizations**
   - Lazy loading of content
   - Index persistence/caching
   - Parallel file processing

## Key Design Decisions

### 1. Memory vs Disk Trade-off
- **Decision**: Keep metadata in memory, load content on demand
- **Rationale**: Fast queries while managing memory for large vaults
- **Implementation**: Store only essential fields in IndexedDocument

### 2. Link Resolution Strategy
- **Decision**: Start with simple filename matching
- **Rationale**: Get working quickly, refine based on real usage
- **Future**: Support Obsidian-style shortest path resolution

### 3. Query Language
- **Decision**: Use same syntax as current query-parser
- **Rationale**: Consistency across packages
- **Examples**: `fm:status:draft`, `fs:path:posts/**`

### 4. Index Update Strategy
- **Decision**: Full re-index on file change (initially)
- **Rationale**: Simpler to implement and debug
- **Future**: Incremental updates for better performance

## Implementation Order

### Step 1: Package Setup
```bash
packages/indexer/
├── src/
│   ├── index.ts           # Public API exports
│   ├── vault-indexer.ts   # Main indexer class
│   ├── index-storage.ts   # In-memory storage
│   ├── link-extractor.ts  # Link parsing logic
│   ├── query-executor.ts  # Query execution
│   └── types.ts          # Internal types
├── tests/
│   ├── indexer.test.ts    # E2E tests (from issue)
│   ├── link-extractor.test.ts
│   └── fixtures/          # Test markdown files
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Step 2: Core Types
```typescript
// Indexed document (lighter than full Document)
interface IndexedDocument {
  path: string;
  relativePath: string;
  modified: Date;
  size: number;
  frontmatter: Record<string, unknown>;
  tags: string[];      // Extracted from frontmatter + content
  headings: string[];  // For outline/structure queries
}

// Link information
interface LinkInfo {
  targetPath: string;  // Resolved target
  linkType: 'wikilink' | 'markdown';
  linkText: string;    // Display text
  position: number;    // Character position in source
}

// Query result
interface QueryResult {
  documents: Document[];  // Full documents
  executionTime: number;  // Performance tracking
}
```

### Step 3: Test-First Development

Write E2E tests first (as specified in issue):
1. Index small vault with known structure
2. Test link queries (incoming/outgoing)
3. Test frontmatter queries
4. Test path pattern queries
5. Test performance with 5000 files

### Step 4: Implementation
1. IndexStorage with basic get/set
2. Link extraction with regex
3. Property indexing from frontmatter
4. Query execution with condition matching
5. Integration with filesystem-access

## Integration Points

### Dependencies
- `@mmt/entities` - Document types, Query types
- `@mmt/filesystem-access` - File reading
- `@mmt/query-parser` - Parse query strings
- `gray-matter` - Frontmatter parsing
- `minimatch` - Glob pattern matching

### Used By
- `@mmt/scripting` - Query-based file selection
- `@mmt/docset-builder` - Build document sets from queries
- Future GUI - Display query results

## Performance Targets

- Initial index: 5000 files in < 5 seconds
- Query execution: < 100ms for most queries  
- Memory usage: ~200 bytes per document
- File update: < 50ms to update indices

## Error Handling

- Invalid frontmatter: Log warning, continue indexing
- Missing link targets: Track as broken links
- File read errors: Skip file, log error
- Query errors: Return empty results with error info

## Example Usage

```typescript
// Create and initialize indexer
const indexer = new VaultIndexer({
  vaultPath: '/path/to/vault',
  fileSystem: new FileSystemAccess()
});

await indexer.initialize();

// Execute queries
const drafts = await indexer.query({
  conditions: [
    { field: 'fm:status', operator: 'equals', value: 'draft' }
  ]
});

const recentPosts = await indexer.query({
  conditions: [
    { field: 'fs:path', operator: 'matches', value: 'posts/**' },
    { field: 'fm:date', operator: 'after', value: '2024-01-01' }
  ]
});

// Get documents linking to specific file
const backlinks = await indexer.getBacklinks('/path/to/doc.md');
```

## Open Questions

1. **Link Resolution**: How closely should we match Obsidian's algorithm?
2. **Tag Extraction**: From frontmatter only or also inline #tags?
3. **Performance**: Should we add caching/persistence in phase 1?
4. **API Design**: Separate methods for different query types or unified?

## Success Criteria

- [ ] All E2E tests from issue #7 pass
- [ ] No mocks - real file operations only
- [ ] 5000 file performance target met
- [ ] Clean API that scripting package can use
- [ ] Well-documented with examples