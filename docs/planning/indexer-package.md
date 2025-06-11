# MMT Indexer Package Specification

## Overview

The `@mmt/indexer` package provides local file indexing capabilities adapted from Dataview's proven indexing patterns. This allows MMT to function fully without requiring QM for basic operations.

## Architecture Benefits

**Immediate Development**
- Start building MMT without QM dependency
- No external service to manage during development
- Faster iteration cycles

**Progressive Enhancement**
- Phase 1: Local indexing only (full functionality)
- Phase 2: Add QM for vector similarity features
- Phase 3: Combine both for advanced queries

## Package Design

### Core Components (Adapted from Dataview)

```typescript
// Main index class
export class VaultIndex {
  private fileIndex: Map<string, Document>
  private linkIndex: LinkIndex
  private tagIndex: TagIndex
  private frontmatterIndex: FrontmatterIndex
  private pathIndex: PathIndex
  
  constructor(
    private vaultPath: string,
    private fs: FileSystemAccess
  ) {}
  
  // Initialize and build index
  async initialize(): Promise<void>
  
  // Query execution
  async query(query: Query): Promise<Document[]>
  
  // File operations
  async onFileCreated(path: string): Promise<void>
  async onFileModified(path: string): Promise<void>
  async onFileDeleted(path: string): Promise<void>
  async onFileMoved(from: string, to: string): Promise<void>
}
```

### Index Types

```typescript
// Tracks all links between documents
interface LinkIndex {
  // Forward links: doc -> [linked docs]
  getOutgoingLinks(docPath: string): LinkReference[]
  
  // Backlinks: doc -> [docs that link to it]
  getIncomingLinks(docPath: string): LinkReference[]
  
  // Update when doc content changes
  updateLinks(docPath: string, links: LinkReference[]): void
}

// Tracks frontmatter properties
interface FrontmatterIndex {
  // Get all docs with a property
  getDocsWithProperty(property: string): Document[]
  
  // Get all docs where property = value
  getDocsByPropertyValue(property: string, value: any): Document[]
  
  // Get all known properties
  getAllProperties(): string[]
}

// Path-based queries
interface PathIndex {
  // Get docs matching path pattern
  getDocsByPath(pattern: string): Document[]
  
  // Efficient prefix matching
  getDocsByPrefix(prefix: string): Document[]
}
```

### Query Execution

```typescript
// Handles our GitHub-style query syntax
export class QueryExecutor {
  constructor(private index: VaultIndex) {}
  
  async execute(query: Query): Promise<Document[]> {
    let results = await this.index.getAllDocuments()
    
    for (const condition of query.conditions) {
      results = await this.applyCondition(results, condition)
    }
    
    return results.slice(0, 500) // Respect limit
  }
  
  private async applyCondition(
    docs: Document[], 
    condition: QueryCondition
  ): Promise<Document[]> {
    switch (condition.type) {
      case 'text':
        return this.filterByText(docs, condition.value)
      case 'path':
        return this.filterByPath(docs, condition.value)
      case 'property':
        return this.filterByProperty(docs, condition)
      case 'date':
        return this.filterByDate(docs, condition)
      // etc.
    }
  }
}
```

### Parsing Logic (from Dataview)

```typescript
// Extract metadata from markdown files
export class MarkdownParser {
  // Parse frontmatter using gray-matter
  parseFrontmatter(content: string): Record<string, any>
  
  // Extract links using regex patterns from Dataview
  parseLinks(content: string): LinkReference[] {
    const wikilinks = this.parseWikilinks(content)
    const mdLinks = this.parseMarkdownLinks(content)
    return [...wikilinks, ...mdLinks]
  }
  
  // Extract tags
  parseTags(content: string): string[]
  
  // Extract inline fields (Dataview format)
  parseInlineFields(content: string): Record<string, any>
}
```

## Implementation Strategy

### Phase 1: Core Indexing (Week 1)
1. Set up package structure
2. Port Dataview's index data structures
3. Implement file parsing (frontmatter, links, tags)
4. Build basic query execution

### Phase 2: Full Query Support (Week 2)
1. Implement all query conditions
2. Add file watching for live updates
3. Performance optimization
4. Comprehensive testing

### Phase 3: Integration (Week 3)
1. Wire up to docset-builder
2. Remove QM as required dependency
3. Update configuration
4. End-to-end testing

## Migration Path

### From Local-Only to QM-Enhanced

```typescript
// Future: Combine local and QM results
export class HybridQueryProvider {
  constructor(
    private localIndex: VaultIndex,
    private qmProvider?: QMProvider
  ) {}
  
  async execute(query: Query): Promise<Document[]> {
    // Use local index for metadata queries
    const localResults = await this.localIndex.query(query)
    
    // Use QM for similarity if available
    if (this.qmProvider && query.hasSimilarity) {
      const qmResults = await this.qmProvider.execute(query)
      return this.mergeResults(localResults, qmResults)
    }
    
    return localResults
  }
}
```

## Benefits Over Building into QM

1. **No network latency** for basic queries
2. **Immediate index updates** when files change
3. **Proven patterns** from Dataview
4. **Simpler development** workflow
5. **Optional QM** integration later

## Configuration Changes

```yaml
# Phase 1: Local only
vaultPath: /Users/user/vault

# Phase 2: With QM for similarity
vaultPath: /Users/user/vault
qmServiceUrl: http://localhost:8080  # Optional enhancement
```

## Next Steps

1. Create `@mmt/indexer` package
2. Port core Dataview indexing logic
3. Adapt to use our filesystem-access
4. Update architecture to make QM optional
5. Implement query execution
6. Wire up to rest of app