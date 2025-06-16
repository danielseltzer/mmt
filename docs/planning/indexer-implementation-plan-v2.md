# Indexer Package Implementation Plan v2
*Revised based on Dataview's proven architecture*

## Overview

The `@mmt/indexer` package provides high-performance indexing of markdown vaults, heavily inspired by Obsidian Dataview's battle-tested implementation. We'll adapt their multi-index architecture, caching strategy, and incremental update patterns while simplifying Obsidian-specific features.

## Core Architecture (Adapted from Dataview)

### 1. Multi-Index Design

```typescript
class VaultIndexer {
  // Primary storage - all file metadata
  private pages: Map<string, PageMetadata>;
  
  // Secondary indices for query performance
  private tags: Map<string, Set<string>>;          // tag -> file paths
  private etags: Map<string, Set<string>>;         // exact tags (case-sensitive)
  private links: Map<string, LinkCache>;           // bidirectional links
  private titles: Map<string, string>;             // normalized title -> path
  private prefixTree: PrefixIndex;                 // path prefix searches
  
  // Change tracking
  private revision: number = 0;
  
  // Caching layer
  private cache: MetadataCache;
  
  // Worker pool for parsing
  private workers: Worker[];
}
```

### 2. Data Structures

```typescript
// Adapted from Dataview's PageMetadata
interface PageMetadata {
  // Core file info
  path: string;
  relativePath: string;
  title: string;        // Extracted from first H1 or filename
  
  // Timestamps and stats
  ctime: number;        // Created timestamp
  mtime: number;        // Modified timestamp  
  size: number;
  
  // Extracted metadata
  tags: string[];       // All tags including nested
  etags: string[];      // Exact tags as written
  aliases: string[];    // From frontmatter aliases
  frontmatter: Record<string, any>;
  
  // Content preview
  headings: Heading[];  // Document structure
  lists: number;        // List item count
  
  // For change detection
  hash: string;         // Content hash
}

interface LinkCache {
  links: Map<string, LinkEntry[]>;      // source -> outgoing
  reverseLinks: Map<string, string[]>;  // target -> incoming sources
}

interface LinkEntry {
  target: string;       // Resolved path
  display?: string;     // Link display text
  type: 'wikilink' | 'markdown';
  position: { start: number; end: number };
}

// For efficient path queries
class PrefixIndex {
  private tree: Map<string, PrefixIndex> = new Map();
  private files: Set<string> = new Set();
  
  add(path: string): void { /* ... */ }
  remove(path: string): void { /* ... */ }
  find(prefix: string): Set<string> { /* ... */ }
}
```

### 3. Persistent Cache Design

```typescript
interface CacheEntry {
  metadata: PageMetadata;
  version: string;      // Cache schema version
  indexed: number;      // When indexed
}

class MetadataCache {
  private dbPath: string;
  private version = "1.0.0";
  
  async get(path: string): Promise<CacheEntry | null>;
  async set(path: string, entry: CacheEntry): Promise<void>;
  async getAll(): Promise<Map<string, CacheEntry>>;
  async clear(): Promise<void>;
  
  // Check if cache is valid for file
  isValid(entry: CacheEntry, stats: Stats): boolean {
    return entry.metadata.mtime === stats.mtime.getTime() &&
           entry.metadata.size === stats.size &&
           entry.version === this.version;
  }
}
```

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)

1. **Multi-Index Storage**
   ```typescript
   // Start with in-memory implementation
   class IndexStorage {
     private pages = new Map<string, PageMetadata>();
     private tags = new Map<string, Set<string>>();
     private revision = 0;
     
     touch() { this.revision++; }
     
     addPage(path: string, metadata: PageMetadata) {
       this.pages.set(path, metadata);
       this.updateIndices(path, metadata);
       this.touch();
     }
   }
   ```

2. **Metadata Extraction**
   ```typescript
   class MetadataExtractor {
     async extract(path: string, content: string): Promise<PageMetadata> {
       const { data: frontmatter, content: body } = matter(content);
       
       return {
         path,
         title: this.extractTitle(body, path),
         tags: this.extractTags(frontmatter, body),
         frontmatter,
         headings: this.extractHeadings(body),
         hash: this.computeHash(content),
         // ... other fields
       };
     }
   }
   ```

3. **Basic Query Execution**
   ```typescript
   class QueryExecutor {
     constructor(private storage: IndexStorage) {}
     
     async execute(query: Query): Promise<PageMetadata[]> {
       let results = Array.from(this.storage.pages.values());
       
       for (const condition of query.conditions) {
         results = this.applyCondition(results, condition);
       }
       
       return results;
     }
   }
   ```

### Phase 2: Performance Layer (Week 2)

1. **Worker-Based Parsing**
   ```typescript
   // Main thread
   class WorkerPool {
     private workers: Worker[] = [];
     private queue: string[] = [];
     
     async parseFiles(paths: string[]): Promise<PageMetadata[]> {
       const batches = this.createBatches(paths, 50);
       const promises = batches.map(batch => 
         this.parseInWorker(batch)
       );
       
       const results = await Promise.all(promises);
       return results.flat();
     }
   }
   
   // Worker thread (parser.worker.ts)
   self.onmessage = async (e) => {
     const { paths } = e.data;
     const metadata = [];
     
     for (const path of paths) {
       const content = await fs.readFile(path, 'utf-8');
       const extracted = await extractor.extract(path, content);
       metadata.push(extracted);
     }
     
     self.postMessage({ metadata });
   };
   ```

2. **Persistent Caching**
   ```typescript
   class SQLiteCache implements MetadataCache {
     private db: Database;
     
     async initialize() {
       this.db = new Database(this.dbPath);
       await this.createTables();
     }
     
     private async createTables() {
       this.db.exec(`
         CREATE TABLE IF NOT EXISTS metadata (
           path TEXT PRIMARY KEY,
           data TEXT NOT NULL,
           version TEXT NOT NULL,
           indexed INTEGER NOT NULL
         );
         CREATE INDEX IF NOT EXISTS idx_indexed ON metadata(indexed);
       `);
     }
   }
   ```

3. **Incremental Updates**
   ```typescript
   class IncrementalIndexer {
     async indexVault(vaultPath: string): Promise<void> {
       const files = await this.findMarkdownFiles(vaultPath);
       const cached = await this.cache.getAll();
       
       const toIndex: string[] = [];
       const toRemove: string[] = [];
       
       // Check what needs updating
       for (const file of files) {
         const stats = await fs.stat(file);
         const cacheEntry = cached.get(file);
         
         if (!cacheEntry || !this.cache.isValid(cacheEntry, stats)) {
           toIndex.push(file);
         }
       }
       
       // Find deleted files
       for (const [path] of cached) {
         if (!files.includes(path)) {
           toRemove.push(path);
         }
       }
       
       // Process updates
       await this.processUpdates(toIndex, toRemove);
     }
   }
   ```

### Phase 3: Advanced Features (Week 3)

1. **File Watching**
   ```typescript
   class FileWatcher {
     private watcher: FSWatcher;
     private updateQueue = new Set<string>();
     private updateTimer: NodeJS.Timeout | null = null;
     
     watch(vaultPath: string) {
       this.watcher = chokidar.watch(vaultPath, {
         ignored: /(^|[\/\\])\../,
         persistent: true,
         awaitWriteFinish: {
           stabilityThreshold: 100,
           pollInterval: 100
         }
       });
       
       this.watcher
         .on('add', path => this.queueUpdate(path))
         .on('change', path => this.queueUpdate(path))
         .on('unlink', path => this.handleDelete(path));
     }
     
     private queueUpdate(path: string) {
       this.updateQueue.add(path);
       this.scheduleUpdate();
     }
     
     private scheduleUpdate() {
       if (this.updateTimer) return;
       
       this.updateTimer = setTimeout(() => {
         this.processBatch();
         this.updateTimer = null;
       }, 500); // Debounce
     }
   }
   ```

2. **Query Optimization**
   ```typescript
   class OptimizedQueryExecutor {
     // Use indices for common patterns
     executeTagQuery(tag: string): PageMetadata[] {
       const paths = this.storage.tags.get(tag.toLowerCase()) || new Set();
       return Array.from(paths).map(p => this.storage.pages.get(p)!);
     }
     
     executePathQuery(prefix: string): PageMetadata[] {
       const paths = this.storage.prefixTree.find(prefix);
       return Array.from(paths).map(p => this.storage.pages.get(p)!);
     }
     
     // Combine multiple strategies
     execute(query: Query): PageMetadata[] {
       // Analyze query to choose optimal execution path
       if (this.isSimpleTagQuery(query)) {
         return this.executeTagQuery(query.conditions[0].value);
       }
       
       if (this.isPathPrefixQuery(query)) {
         return this.executePathQuery(query.conditions[0].value);
       }
       
       // Fall back to general execution
       return this.executeGeneral(query);
     }
   }
   ```

## Key Algorithms

### 1. Link Resolution (Simplified from Dataview)

```typescript
class LinkResolver {
  // Build lookup maps for efficient resolution
  private pathToFile = new Map<string, string>();      // path -> full path
  private nameToFiles = new Map<string, string[]>();   // name -> possible paths
  
  resolve(link: string, sourcePath: string): string | null {
    // 1. Try exact path match
    if (this.pathToFile.has(link)) {
      return this.pathToFile.get(link)!;
    }
    
    // 2. Try relative to source
    const relative = path.join(path.dirname(sourcePath), link);
    if (this.pathToFile.has(relative)) {
      return relative;
    }
    
    // 3. Try by filename
    const basename = path.basename(link, '.md');
    const candidates = this.nameToFiles.get(basename) || [];
    
    if (candidates.length === 1) {
      return candidates[0];
    }
    
    // 4. If multiple, prefer same folder
    const sourceDir = path.dirname(sourcePath);
    const sameFolder = candidates.find(c => 
      path.dirname(c) === sourceDir
    );
    
    return sameFolder || candidates[0] || null;
  }
}
```

### 2. Tag Extraction (From Dataview)

```typescript
function extractTags(frontmatter: any, content: string): string[] {
  const tags = new Set<string>();
  
  // From frontmatter
  if (frontmatter.tags) {
    const fmTags = Array.isArray(frontmatter.tags) 
      ? frontmatter.tags 
      : [frontmatter.tags];
      
    for (const tag of fmTags) {
      addTagWithHierarchy(tags, normalizeTag(tag));
    }
  }
  
  // From content #tags
  const matches = content.matchAll(/#[\w\-\/]+/g);
  for (const match of matches) {
    addTagWithHierarchy(tags, match[0]);
  }
  
  return Array.from(tags);
}

function addTagWithHierarchy(tags: Set<string>, tag: string) {
  // #parent/child -> #parent, #parent/child
  const parts = tag.split('/');
  let current = '';
  
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    tags.add(current.toLowerCase());
  }
}
```

## Testing Strategy

### 1. Performance Benchmarks

```typescript
describe('Indexer Performance', () => {
  it('indexes 5000 files in under 5 seconds', async () => {
    const vault = await createLargeTestVault(5000);
    const indexer = new VaultIndexer({ 
      vaultPath: vault.path,
      useWorkers: true,
      useCache: true 
    });
    
    const start = Date.now();
    await indexer.initialize();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(5000);
    expect(indexer.getFileCount()).toBe(5000);
  });
  
  it('updates single file in under 50ms', async () => {
    // Test incremental update performance
  });
});
```

### 2. Query Accuracy Tests

```typescript
describe('Query Execution', () => {
  let indexer: VaultIndexer;
  let vault: TestVault;
  
  beforeEach(async () => {
    vault = await createTestVault({
      'doc1.md': '# Doc 1\n[[doc2]] and [[doc3]]',
      'doc2.md': '# Doc 2\n[[doc1]]',
      'doc3.md': '# Doc 3\n[link](doc1.md)',
    });
    
    indexer = new VaultIndexer({ vaultPath: vault.path });
    await indexer.initialize();
  });
  
  it('finds incoming links', async () => {
    const backlinks = await indexer.getBacklinks('doc1.md');
    expect(backlinks).toHaveLength(2);
    expect(backlinks.map(d => d.path)).toContain('doc2.md');
    expect(backlinks.map(d => d.path)).toContain('doc3.md');
  });
});
```

## Migration from Current Plan

1. **Keep the same public API** - Scripts don't need to change
2. **Add caching transparently** - Performance boost without API changes  
3. **Use workers internally** - No external API impact
4. **Enhance incrementally** - Start simple, optimize based on profiling

## Success Metrics

- [ ] 5000 files indexed in < 5 seconds (with cache: < 1 second)
- [ ] Query response time < 100ms for tag/path queries
- [ ] Memory usage < 50MB for 5000 files
- [ ] Incremental update < 50ms per file
- [ ] Zero data loss during concurrent updates
- [ ] 100% test coverage with real files