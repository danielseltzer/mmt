import { create, insert, search, remove, save, load, AnyOrama } from '@orama/orama';
import { persistToFile, restoreFromFile } from '@orama/plugin-data-persistence';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { Config } from '@mmt/entities';
import { EventEmitter } from 'events';

export interface SimilaritySearchResult {
  path: string;
  content: string;
  score: number;
  excerpt?: string;
}

interface IndexedDocument {
  id: string;
  path: string;
  content: string;
  embedding: number[];
  contentHash: string;
  lastModified: number;
}

export type IndexStatus = 'not_started' | 'indexing' | 'ready' | 'error';

export interface IndexingProgress {
  current: number;
  total: number;
  percentage: number;
  currentFile?: string;
  startedAt?: Date;
  elapsedSeconds?: number;
}

export interface SimilarityStatus {
  available: boolean;
  ollamaHealthy: boolean;
  indexStatus: IndexStatus;
  stats: {
    documentsIndexed: number;
    indexSize: number;
    lastUpdated?: Date;
  };
  progress?: IndexingProgress;
  error?: string;
  generatedAt: Date;
}

export class SimilaritySearchService extends EventEmitter {
  private db: AnyOrama | null = null;
  private embeddingCache = new Map<string, number[]>();
  private config: Config;
  private indexPath: string;
  private maxCacheSize = 1000;
  private indexStatus: IndexStatus = 'not_started';
  private indexingProgress: IndexingProgress | null = null;
  private lastError: string | null = null;
  private isShuttingDown = false;

  constructor(config: Config) {
    super();
    this.config = config;
    this.indexPath = path.join(
      config.indexPath,
      config.similarity?.indexFilename || 'similarity-index.msp'
    );
  }

  async initialize(): Promise<void> {
    if (!this.config.similarity?.enabled) {
      return;
    }

    try {
      // Check Ollama health first
      const ollamaHealthy = await this.checkOllamaHealth();
      if (!ollamaHealthy) {
        this.indexStatus = 'error';
        this.lastError = 'Ollama is not running or not accessible';
        return;
      }

      // Try to load existing index
      try {
        const dbData = await restoreFromFile('binary', this.indexPath);
        this.db = await create({
          schema: {
            id: 'string',
            path: 'string',
            content: 'string',
            embedding: 'vector[768]',
            contentHash: 'string',
            lastModified: 'number'
          }
        });
        await load(this.db, dbData);
        this.indexStatus = 'ready';
        console.log('Loaded existing similarity index');
      } catch (error) {
        // Create new index
        this.db = await create({
          schema: {
            id: 'string',
            path: 'string',
            content: 'string',
            embedding: 'vector[768]',
            contentHash: 'string',
            lastModified: 'number'
          }
        });
        this.indexStatus = 'ready';
        console.log('Created new similarity index');
      }
    } catch (error) {
      this.indexStatus = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initialize similarity search:', error);
    }
  }

  private async checkOllamaHealth(): Promise<boolean> {
    if (!this.config.similarity?.enabled) return false;
    
    try {
      const response = await fetch(`${this.config.similarity.ollamaUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    const cacheKey = crypto.createHash('md5').update(text).digest('hex');
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }
    
    // Manage cache size
    if (this.embeddingCache.size > this.maxCacheSize) {
      const firstKey = this.embeddingCache.keys().next().value;
      if (firstKey) {
        this.embeddingCache.delete(firstKey);
      }
    }
    
    try {
      const ollamaUrl = this.config.similarity?.ollamaUrl || 'http://localhost:11434';
      const model = this.config.similarity?.model || 'nomic-embed-text';
      
      const response = await fetch(`${ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          prompt: text.slice(0, 8192) // Respect context length
        })
      });
      
      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.statusText}`);
      }
      
      const data = await response.json() as { embedding: number[] };
      this.embeddingCache.set(cacheKey, data.embedding);
      
      return data.embedding;
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }

  async indexFile(filePath: string, content?: string): Promise<void> {
    if (!this.db || !this.config.similarity?.enabled) return;
    
    // Read content if not provided
    if (!content) {
      content = await fs.readFile(filePath, 'utf-8');
    }
    
    const contentHash = crypto.createHash('md5').update(content).digest('hex');
    const id = crypto.createHash('md5').update(filePath).digest('hex');
    
    // Check if document exists and needs update
    try {
      const existing = await search(this.db, {
        term: id,
        properties: ['id'],
        exact: true,
        limit: 1
      });
      
      if (existing.hits.length > 0 && 
          existing.hits[0].document.contentHash === contentHash) {
        console.log(`Skipping ${filePath} - content unchanged`);
        return;
      }
      
      // Remove existing document
      await remove(this.db, id);
    } catch (error) {
      // Document doesn't exist, continue
    }
    
    console.log(`Indexing ${filePath}...`);
    const embedding = await this.generateEmbedding(content);
    
    await insert(this.db, {
      id,
      path: filePath,
      content,
      embedding,
      contentHash,
      lastModified: Date.now()
    });
  }

  async search(query: string, options?: {
    limit?: number;
    includeExcerpt?: boolean;
  }): Promise<SimilaritySearchResult[]> {
    if (!this.db || !this.config.similarity?.enabled || this.indexStatus !== 'ready') {
      return [];
    }
    
    const limit = options?.limit ?? 10;
    const queryEmbedding = await this.generateEmbedding(query);
    
    const results = await search(this.db, {
      mode: 'vector',
      vector: {
        value: queryEmbedding,
        property: 'embedding'
      },
      limit,
      includeVectors: false
    });
    
    return results.hits.map(hit => {
      const doc = hit.document as any;
      const result: SimilaritySearchResult = {
        path: doc.path,
        content: doc.content,
        score: hit.score ?? 0
      };
      
      if (options?.includeExcerpt) {
        result.excerpt = this.generateExcerpt(doc.content, query);
      }
      
      return result;
    });
  }

  private generateExcerpt(content: string, query: string, maxLength = 200): string {
    const words = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    // Find best matching position
    let bestPosition = 0;
    let maxMatches = 0;
    
    for (let i = 0; i < content.length - maxLength; i++) {
      const segment = contentLower.slice(i, i + maxLength);
      const matches = words.filter(word => segment.includes(word)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        bestPosition = i;
      }
    }
    
    const excerpt = content.slice(bestPosition, bestPosition + maxLength);
    return excerpt + (bestPosition + maxLength < content.length ? '...' : '');
  }

  async persist(): Promise<void> {
    if (!this.db || !this.config.similarity?.enabled) return;
    
    await persistToFile(this.db, 'binary', this.indexPath);
    console.log('Similarity index persisted to disk');
  }

  async reindexFile(filePath: string, content?: string): Promise<void> {
    await this.indexFile(filePath, content);
    await this.persist();
  }

  async removeFile(filePath: string): Promise<void> {
    if (!this.db || !this.config.similarity?.enabled) return;
    
    const id = crypto.createHash('md5').update(filePath).digest('hex');
    try {
      await remove(this.db, id);
      await this.persist();
      console.log(`Removed ${filePath} from similarity index`);
    } catch (error) {
      console.error(`Failed to remove ${filePath}:`, error);
    }
  }

  async getStatus(): Promise<SimilarityStatus> {
    const ollamaHealthy = await this.checkOllamaHealth();
    let stats = {
      documentsIndexed: 0,
      indexSize: 0,
      lastUpdated: undefined as Date | undefined
    };

    if (this.db) {
      // Get document count by searching for all documents
      const allDocs = await search(this.db, {
        term: '',
        limit: 999999
      });
      stats.documentsIndexed = allDocs.hits.length;
      
      try {
        const stat = await fs.stat(this.indexPath);
        stats.indexSize = stat.size;
        stats.lastUpdated = stat.mtime;
      } catch {
        // Index file doesn't exist yet
      }
    }

    return {
      available: this.config.similarity?.enabled ?? false,
      ollamaHealthy,
      indexStatus: this.indexStatus,
      stats,
      progress: this.indexingProgress || undefined,
      error: this.lastError || undefined,
      generatedAt: new Date()
    };
  }

  async indexDirectory(directory: string, pattern = '**/*.md'): Promise<void> {
    if (!this.db || !this.config.similarity?.enabled) return;

    this.indexStatus = 'indexing';
    this.indexingProgress = {
      current: 0,
      total: 0,
      percentage: 0,
      startedAt: new Date()
    };
    this.emit('status-changed', { previousStatus: 'ready', newStatus: 'indexing' });

    try {
      const { glob } = await import('glob');
      const files = await glob(pattern, { cwd: directory });
      
      this.indexingProgress.total = files.length;
      console.log(`Found ${files.length} files to index`);
      
      for (const file of files) {
        if (this.isShuttingDown) break;
        
        const filePath = path.join(directory, file);
        this.indexingProgress.current++;
        this.indexingProgress.percentage = 
          (this.indexingProgress.current / this.indexingProgress.total) * 100;
        this.indexingProgress.currentFile = filePath;
        this.indexingProgress.elapsedSeconds = 
          (Date.now() - this.indexingProgress.startedAt!.getTime()) / 1000;
        
        this.emit('progress', this.indexingProgress);
        
        try {
          await this.indexFile(filePath);
        } catch (error) {
          console.error(`Failed to index ${filePath}:`, error);
        }
      }
      
      await this.persist();
      this.indexStatus = 'ready';
      this.emit('status-changed', { previousStatus: 'indexing', newStatus: 'ready' });
    } catch (error) {
      this.indexStatus = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.emit('status-changed', { previousStatus: 'indexing', newStatus: 'error' });
      throw error;
    } finally {
      this.indexingProgress = null;
    }
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    if (this.db && this.config.similarity?.enabled) {
      await this.persist();
    }
  }
}