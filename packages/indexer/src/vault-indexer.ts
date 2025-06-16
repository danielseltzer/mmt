/**
 * Main indexer class that orchestrates vault indexing
 */

import type { FileSystemAccess } from '@mmt/filesystem-access';
import type { 
  IndexerOptions, 
  PageMetadata, 
  Query,
  LinkEntry,
  CacheEntry 
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
  
  constructor(private options: IndexerOptions) {
    this.storage = new IndexStorage();
    this.extractor = new MetadataExtractor(options.vaultPath, options.fileSystem);
    this.linkExtractor = new LinkExtractor(options.vaultPath);
    this.queryExecutor = new QueryExecutor(this.storage);
    
    if (options.useCache) {
      this.cache = new MetadataCache(options.cacheDir || join(options.vaultPath, '.mmt-cache'));
    }
    
    if (options.useWorkers) {
      this.workers = new WorkerPool(options.workerCount || 4);
    }
  }
  
  /**
   * Initialize the indexer by scanning the vault
   */
  async initialize(): Promise<void> {
    console.log(`Initializing indexer for vault: ${this.options.vaultPath}`);
    
    // Load from cache if available
    if (this.cache) {
      await this.loadFromCache();
    }
    
    // Scan vault for markdown files
    const files = await this.findMarkdownFiles();
    console.log(`Found ${files.length} markdown files`);
    
    // Update link extractor with file list for resolution
    this.linkExtractor.updateFileLookup(files);
    
    // Index files (using workers if available)
    if (this.workers && files.length > 100) {
      await this.indexFilesWithWorkers(files);
    } else {
      await this.indexFilesSequentially(files);
    }
    
    // Start file watching
    if (this.options.useCache) {
      this.startWatching();
    }
  }
  
  /**
   * Get all indexed documents
   */
  async getAllDocuments(): Promise<PageMetadata[]> {
    return this.storage.getAllDocuments();
  }
  
  /**
   * Get documents that link TO the given document
   */
  async getBacklinks(relativePath: string): Promise<PageMetadata[]> {
    const fullPath = join(this.options.vaultPath, relativePath);
    const sources = this.storage.getBacklinks(fullPath);
    
    return sources
      .map(path => this.storage.getDocument(path))
      .filter((doc): doc is PageMetadata => doc !== undefined);
  }
  
  /**
   * Get documents that are linked FROM the given document
   */
  async getOutgoingLinks(relativePath: string): Promise<PageMetadata[]> {
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
  async query(query: Query): Promise<PageMetadata[]> {
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
  async deleteFile(relativePath: string): Promise<void> {
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
    if (!this.workers) return;
    
    // Process in batches
    const batchSize = 50;
    const batches: string[][] = [];
    
    for (let i = 0; i < files.length; i += batchSize) {
      batches.push(files.slice(i, i + batchSize));
    }
    
    // Process batches in parallel
    const results = await Promise.all(
      batches.map(batch => this.workers!.processBatch(batch))
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
        const cached = await this.cache.get(fullPath);
        
        if (cached && this.cache.isValid(cached, stats)) {
          this.storage.addDocument(cached.metadata);
          return;
        }
      }
      
      // Read and parse file
      const content = await this.options.fileSystem.readFile(fullPath);
      const relativePath = relative(this.options.vaultPath, fullPath);
      
      // Extract metadata
      const metadata = await this.extractor.extract(fullPath, content);
      
      // Extract links
      const links = this.linkExtractor.extract(fullPath, content);
      
      // Store in index
      this.storage.addDocument(metadata);
      this.storage.updateLinks(fullPath, links);
      
      // Update cache
      if (this.cache) {
        await this.cache.set(fullPath, {
          metadata,
          version: '1.0.0',
          indexed: Date.now(),
        });
      }
    } catch (error) {
      console.error(`Failed to index ${fullPath}:`, error);
    }
  }
  
  /**
   * Load metadata from cache
   */
  private async loadFromCache(): Promise<void> {
    if (!this.cache) return;
    
    try {
      const entries = await this.cache.getAll();
      
      for (const [path, entry] of entries) {
        // Verify file still exists
        if (await this.options.fileSystem.exists(path)) {
          this.storage.addDocument(entry.metadata);
        }
      }
      
      console.log(`Loaded ${entries.size} documents from cache`);
    } catch (error) {
      console.warn('Failed to load cache:', error);
    }
  }
  
  /**
   * Start watching for file changes
   */
  private startWatching(): void {
    this.watcher = new FileWatcher(this.options.vaultPath);
    
    this.watcher.on('add', (path) => this.handleFileAdded(path));
    this.watcher.on('change', (path) => this.handleFileChanged(path));
    this.watcher.on('unlink', (path) => this.handleFileDeleted(path));
    
    this.watcher.start();
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
  
  private async handleFileDeleted(path: string): Promise<void> {
    if (path.endsWith('.md')) {
      this.storage.removeDocument(path);
      
      if (this.cache) {
        await this.cache.delete(path);
      }
    }
  }
}