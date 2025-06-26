/**
 * Main indexer class that orchestrates vault indexing
 */

import type { 
  IndexerOptions, 
  PageMetadata, 
  Query
} from './types.js';
import { IndexStorage } from './index-storage.js';
import { MetadataExtractor } from './metadata-extractor.js';
import { LinkExtractor } from './link-extractor.js';
import { QueryExecutor } from './query-executor.js';
import { MetadataCache } from './metadata-cache.js';
import { WorkerPool } from './worker-pool.js';
import { FileWatcher } from './file-watcher.js';
import { join, relative } from 'path';

export class VaultIndexer {
  private storage: IndexStorage;
  private extractor: MetadataExtractor;
  private linkExtractor: LinkExtractor;
  private queryExecutor: QueryExecutor;
  private cache?: MetadataCache;
  private workers?: WorkerPool;
  private watcher?: FileWatcher;
  private errorCount = 0;
  
  constructor(private options: IndexerOptions) {
    this.storage = new IndexStorage();
    this.extractor = new MetadataExtractor(options.vaultPath, options.fileSystem);
    this.linkExtractor = new LinkExtractor(options.vaultPath);
    this.queryExecutor = new QueryExecutor(this.storage);
    
    if (options.useCache) {
      this.cache = new MetadataCache(options.cacheDir ?? join(options.vaultPath, '.mmt-cache'));
    }
    
    if (options.useWorkers) {
      this.workers = new WorkerPool(options.workerCount ?? 4);
    }
  }
  
  /**
   * Initialize the indexer by scanning the vault
   */
  async initialize(): Promise<void> {
    console.error(`Initializing indexer for vault: ${this.options.vaultPath}`);
    
    const startTime = Date.now();
    this.errorCount = 0; // Reset error count
    
    // Load from cache if available
    if (this.cache) {
      await this.loadFromCache();
    }
    
    // Scan vault for markdown files
    const files = await this.findMarkdownFiles();
    console.error(`Found ${files.length.toString()} markdown files`);
    
    // Update link extractor with file list for resolution
    this.linkExtractor.updateFileLookup(files);
    
    // Index files (using workers if available)
    const indexingStart = Date.now();
    if (this.workers && files.length > 100) {
      await this.indexFilesWithWorkers(files);
    } else {
      await this.indexFilesSequentially(files);
    }
    
    const indexingTime = Date.now() - indexingStart;
    const totalTime = Date.now() - startTime;
    
    // Display timing information
    console.error(`\n✓ Indexing completed in ${(indexingTime / 1000).toFixed(2)}s`);
    console.error(`  Successfully indexed: ${String(files.length - this.errorCount)} files`);
    if (this.errorCount > 0) {
      console.error(`  ⚠️  Skipped ${String(this.errorCount)} files due to errors`);
    }
    console.error(`  Total initialization time: ${(totalTime / 1000).toFixed(2)}s`);
    
    // Start file watching
    if (this.options.fileWatching?.enabled ?? this.options.useCache) {
      this.startWatching();
    }
  }
  
  /**
   * Get all indexed documents
   */
  getAllDocuments(): PageMetadata[] {
    return this.storage.getAllDocuments();
  }
  
  /**
   * Get documents that link TO the given document
   */
  getBacklinks(relativePath: string): PageMetadata[] {
    const fullPath = join(this.options.vaultPath, relativePath);
    const sources = this.storage.getBacklinks(fullPath);
    
    return sources
      .map(path => this.storage.getDocument(path))
      .filter((doc): doc is PageMetadata => doc !== undefined);
  }
  
  /**
   * Get documents that are linked FROM the given document
   */
  getOutgoingLinks(relativePath: string): PageMetadata[] {
    const fullPath = join(this.options.vaultPath, relativePath);
    const links = this.storage.getOutgoingLinks(fullPath);
    
    // Get unique target documents
    const uniqueTargets = new Set(links.map(link => link.target));
    
    return Array.from(uniqueTargets)
      .map(target => this.storage.getDocument(target))
      .filter((doc): doc is PageMetadata => doc !== undefined);
  }
  
  /**
   * Execute a query against the index
   */
  query(query: Query): PageMetadata[] {
    return this.queryExecutor.execute(query);
  }
  
  /**
   * Update a single file in the index
   */
  async updateFile(relativePath: string): Promise<void> {
    const fullPath = join(this.options.vaultPath, relativePath);
    
    // Remove old data
    this.storage.removeDocument(fullPath);
    
    // Re-index the file
    await this.indexFile(fullPath);
  }
  
  /**
   * Remove a file from the index
   */
  deleteFile(relativePath: string): void {
    const fullPath = join(this.options.vaultPath, relativePath);
    this.storage.removeDocument(fullPath);
  }
  
  /**
   * Find all markdown files in the vault
   */
  private async findMarkdownFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      const entries = await this.options.fileSystem.readdir(dir);
      
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        const stats = await this.options.fileSystem.stat(fullPath);
        
        if (stats.isDirectory()) {
          // Skip hidden directories
          if (!entry.startsWith('.')) {
            await scanDirectory(fullPath);
          }
        } else if (entry.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDirectory(this.options.vaultPath);
    return files;
  }
  
  /**
   * Index files sequentially (for small vaults or no workers)
   */
  private async indexFilesSequentially(files: string[]): Promise<void> {
    for (const file of files) {
      await this.indexFile(file);
    }
  }
  
  /**
   * Index files using worker pool (for large vaults)
   */
  private async indexFilesWithWorkers(files: string[]): Promise<void> {
    if (!this.workers) {return;}
    
    // Process in batches
    const batchSize = 50;
    const batches: string[][] = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    // Process batches in parallel
    const results = await Promise.all(
      batches.map(batch => {
        const { workers } = this;
        if (!workers) {
          throw new Error('Workers not initialized');
        }
        return Promise.resolve(workers.processBatch(batch));
      })
    );
    
    // Store results
    for (const batchResults of results) {
      for (const result of batchResults) {
        if (!result.error) {
          this.storage.addDocument(result.metadata);
          this.storage.updateLinks(result.metadata.path, result.links);
        }
      }
    }
    
    // Since worker pool is stubbed, fall back to sequential
    if (results.every(r => r.length === 0)) {
      await this.indexFilesSequentially(files);
    }
  }
  
  /**
   * Index a single file
   */
  private async indexFile(fullPath: string): Promise<void> {
    try {
      // Check cache first
      if (this.cache) {
        const stats = await this.options.fileSystem.stat(fullPath);
        const cached = this.cache.get(fullPath);
        
        if (cached && this.cache.isValid(cached, stats)) {
          this.storage.addDocument(cached.metadata);
          return;
        }
      }
      
      // Read and parse file
      const content = await this.options.fileSystem.readFile(fullPath);
      // const relativePath = relative(this.options.vaultPath, fullPath); // unused
      
      // Extract metadata
      const metadata = await this.extractor.extract(fullPath, content);
      
      // Extract links
      const links = this.linkExtractor.extract(fullPath, content);
      
      // Store in index
      this.storage.addDocument(metadata);
      this.storage.updateLinks(fullPath, links);
      
      // Update cache
      if (this.cache) {
        this.cache.set(fullPath, {
          metadata,
          version: '1.0.0',
          indexed: Date.now(),
        });
      }
    } catch (error) {
      // Handle YAML parsing errors with user-friendly messages
      if (error !== null && typeof error === 'object' && 'name' in error && error.name === 'YAMLException') {
        const relativePath = relative(this.options.vaultPath, fullPath);
        console.error(`\n⚠️  YAML Parsing Error in: ${relativePath}`);
        if ('reason' in error && typeof error.reason === 'string') {
          console.error(`   ${error.reason}`);
        }
        
        // Extract the problematic line from the error
        if ('mark' in error && error.mark !== null && error.mark !== undefined &&
            typeof error.mark === 'object' && 'line' in error.mark && 'column' in error.mark &&
            typeof (error.mark as {line: unknown}).line === 'number' &&
            typeof (error.mark as {column: unknown}).column === 'number') {
          const mark = error.mark as { line: number; column: number };
          console.error(`   At line ${String(mark.line + 1)}, column ${String(mark.column + 1)}`);
          console.error(`\n   This often happens with:`);
          console.error(`   - Template files containing variables like {{DATE}}`);
          console.error(`   - Missing quotes around values with colons`);
          console.error(`   - Incorrect indentation in YAML frontmatter\n`);
        }
      } else {
        // Other errors - show simplified message
        const relativePath = relative(this.options.vaultPath, fullPath);
        console.error(`\n⚠️  Failed to index: ${relativePath}`);
        console.error(`   ${error instanceof Error ? error.message : String(error)}\n`);
      }
      this.errorCount++;
    }
  }
  
  /**
   * Load metadata from cache
   */
  private async loadFromCache(): Promise<void> {
    if (!this.cache) {return;}
    
    try {
      const entries = this.cache.getAll();
      
      for (const [path, entry] of entries) {
        // Verify file still exists
        if (await this.options.fileSystem.exists(path)) {
          this.storage.addDocument(entry.metadata);
        }
      }
      
      console.error(`Loaded ${String(entries.size)} documents from cache`);
    } catch (error) {
      console.warn('Failed to load cache:', error);
    }
  }
  
  /**
   * Start watching for file changes
   */
  private startWatching(): void {
    this.watcher = new FileWatcher({
      paths: [this.options.vaultPath],
      recursive: true,
      debounceMs: this.options.fileWatching?.debounceMs ?? 100,
      ignorePatterns: this.options.fileWatching?.ignorePatterns,
    });
    
    this.watcher.onFileChange(async (event) => {
      try {
        switch (event.type) {
          case 'created':
            await this.handleFileAdded(event.path);
            break;
          case 'modified':
            await this.handleFileChanged(event.path);
            break;
          case 'deleted':
            this.handleFileDeleted(event.path);
            break;
        }
      } catch (error) {
        console.error(`Error handling file ${event.type}:`, error);
      }
    });
    
    this.watcher.start().catch(error => {
      console.error('Failed to start file watcher:', error);
    });
  }
  
  private async handleFileAdded(path: string): Promise<void> {
    if (path.endsWith('.md')) {
      await this.indexFile(path);
    }
  }
  
  private async handleFileChanged(path: string): Promise<void> {
    if (path.endsWith('.md')) {
      this.storage.removeDocument(path);
      await this.indexFile(path);
    }
  }
  
  private handleFileDeleted(path: string): void {
    if (path.endsWith('.md')) {
      this.storage.removeDocument(path);
      
      if (this.cache) {
        this.cache.delete(path);
      }
    }
  }

  /**
   * Shutdown the indexer and clean up resources
   */
  async shutdown(): Promise<void> {
    // Stop file watcher
    if (this.watcher) {
      await this.watcher.stop();
      this.watcher = undefined;
    }

    // Close worker pool
    if (this.workers) {
      // Workers would need cleanup method
      this.workers = undefined;
    }
  }
}