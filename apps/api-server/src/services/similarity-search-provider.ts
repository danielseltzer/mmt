/**
 * Provider-based Similarity Search Service
 * Uses the pluggable provider interface to support multiple vector databases
 */

import { EventEmitter } from 'events';
import type { Config } from '@mmt/entities';
import { 
  SimilarityProviderFactory,
  SimilarityProvider,
  DocumentToIndex,
  SearchResult,
  IndexingResult as ProviderIndexingResult
} from '@mmt/similarity-provider';
import { OramaProvider } from '@mmt/similarity-provider-orama';
import { QdrantProvider } from '@mmt/similarity-provider-qdrant';
import crypto from 'crypto';
import path from 'path';

// Register providers with the factory
SimilarityProviderFactory.register('orama', () => new OramaProvider());
SimilarityProviderFactory.register('qdrant', () => new QdrantProvider());

export interface SimilaritySearchResult {
  path: string;
  content: string;
  score: number;
  excerpt?: string;
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

export interface IndexingResult {
  totalDocuments: number;
  successfullyIndexed: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
  errorLogPath?: string;
}

interface OllamaHealthStatus {
  healthy: boolean;
  modelAvailable?: boolean;
  error?: string;
}

export class SimilaritySearchService extends EventEmitter {
  private provider?: SimilarityProvider;
  private config: Config;
  private vaultPath: string;
  private vaultId: string;
  private indexStatus: IndexStatus = 'not_started';
  private indexingProgress: IndexingProgress | null = null;
  private lastError: string | null = null;
  private isShuttingDown = false;
  private documentCount = 0;
  private lastIndexedTime?: Date;

  constructor(config: Config, vaultId: string, vaultPath: string) {
    super();
    this.config = config;
    this.vaultId = vaultId;
    this.vaultPath = vaultPath;
  }

  async initialize(): Promise<void> {
    if (!this.config.similarity?.enabled) {
      return;
    }

    try {
      // Check Ollama health first if needed
      const providerName = (this.config.similarity as any).provider || 'orama';
      
      // Only check Ollama if not using pre-computed embeddings
      if (this.config.similarity.ollamaUrl) {
        const ollamaHealthy = await this.checkOllamaHealth();
        if (!ollamaHealthy) {
          this.indexStatus = 'error';
          this.lastError = 'Ollama is not running or not accessible';
          console.warn(`Similarity search disabled: ${this.lastError}`);
          return;
        }
      }

      // Create and initialize the provider
      console.log(`Initializing similarity provider: ${providerName}`);
      this.provider = await SimilarityProviderFactory.create(providerName, {
        config: {
          ...this.config.similarity,
          provider: providerName
        },
        vaultPath: this.vaultPath,
        vaultId: this.vaultId
      });

      // Load existing index if available
      if (this.provider.load) {
        try {
          await this.provider.load();
          console.log('Loaded existing similarity index');
        } catch (error) {
          console.log('No existing index found, will create new one');
        }
      }

      // Get initial status
      const status = await this.provider.getStatus();
      this.documentCount = status.documentCount;
      this.lastIndexedTime = status.lastIndexed;
      this.indexStatus = status.ready ? 'ready' : 'error';
      
      console.log(`Similarity search initialized with ${providerName} provider (${this.documentCount} documents)`);
    } catch (error) {
      this.indexStatus = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to initialize similarity search:', error);
    }
  }

  private async checkOllamaHealth(): Promise<boolean> {
    if (!this.config.similarity?.ollamaUrl) return false;
    
    try {
      const response = await fetch(`${this.config.similarity.ollamaUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkHealth(): Promise<OllamaHealthStatus> {
    if (!this.config.similarity?.enabled) {
      return { healthy: false, error: 'Similarity search not enabled' };
    }

    if (!this.config.similarity.ollamaUrl) {
      // If no Ollama URL, assume pre-computed embeddings
      return { healthy: true, modelAvailable: true };
    }

    try {
      // Check if Ollama is running
      const response = await fetch(`${this.config.similarity.ollamaUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return { 
          healthy: false, 
          error: `Ollama returned status ${response.status}` 
        };
      }

      const data = await response.json() as { models?: Array<{ name: string }> };
      const modelName = this.config.similarity.model || 'nomic-embed-text';
      
      // Check if the required model is available
      const modelAvailable = data.models?.some((m) => 
        m.name === modelName || m.name === `${modelName}:latest`
      );

      return {
        healthy: true,
        modelAvailable,
        error: modelAvailable ? undefined : `Model ${modelName} not found`
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          return { healthy: false, error: 'Connection timeout' };
        }
        return { healthy: false, error: error.message };
      }
      return { healthy: false, error: 'Unknown error' };
    }
  }

  async indexFile(filePath: string, content?: string): Promise<void> {
    if (!this.provider || !this.config.similarity?.enabled) return;
    
    try {
      // Create document for indexing
      const id = crypto.createHash('md5').update(filePath).digest('hex');
      const doc: DocumentToIndex = {
        id,
        path: filePath,
        content: content || '' // Provider will handle reading if needed
      };

      await this.provider.indexDocument(doc);
      this.documentCount++;
      this.lastIndexedTime = new Date();
      
      console.log(`Indexed ${filePath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to index ${filePath}: ${errorMsg}`);
      // Don't throw - continue with other files
    }
  }

  async indexBatch(documents: Array<{ path: string; content: string }>): Promise<IndexingResult> {
    if (!this.provider || !this.config.similarity?.enabled) {
      return {
        totalDocuments: documents.length,
        successfullyIndexed: 0,
        failed: documents.length,
        errors: documents.map(d => ({ path: d.path, error: 'Similarity search not available' }))
      };
    }

    this.indexStatus = 'indexing';
    this.indexingProgress = {
      current: 0,
      total: documents.length,
      percentage: 0,
      startedAt: new Date()
    };

    try {
      // Convert to provider format
      const docsToIndex: DocumentToIndex[] = documents.map(doc => ({
        id: crypto.createHash('md5').update(doc.path).digest('hex'),
        path: doc.path,
        content: doc.content
      }));

      // Index ONE document at a time for debugging
      // Batch indexing is failing with "Bad Request" 
      const batchSize = 1;
      const errors: Array<{ path: string; error: string }> = [];
      let successCount = 0;

      for (let i = 0; i < docsToIndex.length; i += batchSize) {
        if (this.isShuttingDown) break;

        const batch = docsToIndex.slice(i, Math.min(i + batchSize, docsToIndex.length));
        
        // Update progress
        this.indexingProgress.current = i;
        this.indexingProgress.percentage = Math.round((i / documents.length) * 100);
        this.indexingProgress.currentFile = batch[0].path;
        this.indexingProgress.elapsedSeconds = 
          (Date.now() - this.indexingProgress.startedAt!.getTime()) / 1000;
        
        this.emit('indexing-progress', this.indexingProgress);

        // Index the batch
        console.log(`[SIMILARITY] Processing batch ${i / batchSize + 1} (${batch.length} documents)`);
        const result = await this.provider.indexBatch(batch);
        successCount += result.successful;
        
        if (result.failed > 0) {
          console.error(`[SIMILARITY] Batch failed: ${result.failed}/${batch.length} documents failed`);
        }
        
        // Collect errors
        for (const error of result.errors) {
          errors.push({ path: error.path, error: error.error });
        }
        
        // CRITICAL: If entire batch failed, we should stop!
        if (result.successful === 0 && batch.length > 0) {
          console.error(`[SIMILARITY] CRITICAL: Entire batch failed, stopping indexing`);
          console.error(`[SIMILARITY] First error: ${result.errors[0]?.error}`);
          break;
        }

        // Persist periodically if supported
        if (this.provider && this.provider.persist && i % 500 === 0) {
          await this.provider.persist();
        }
      }

      // Final persist
      if (this.provider.persist) {
        await this.provider.persist();
      }

      // Update status
      const status = await this.provider.getStatus();
      this.documentCount = status.documentCount;
      this.lastIndexedTime = status.lastIndexed;
      this.indexStatus = 'ready';
      this.indexingProgress = null;

      const finalResult = {
        totalDocuments: documents.length,
        successfullyIndexed: successCount,
        failed: errors.length,
        errors
      };
      
      console.log(`[SIMILARITY] Indexing complete:`);
      console.log(`[SIMILARITY]   Total documents: ${finalResult.totalDocuments}`);
      console.log(`[SIMILARITY]   Successfully indexed: ${finalResult.successfullyIndexed}`);
      console.log(`[SIMILARITY]   Failed: ${finalResult.failed}`);
      
      if (errors.length > 0 && errors.length <= 10) {
        console.error(`[SIMILARITY] Errors:`);
        errors.forEach(e => console.error(`  - ${e.path}: ${e.error}`));
      } else if (errors.length > 10) {
        console.error(`[SIMILARITY] First 10 errors (${errors.length} total):`);
        errors.slice(0, 10).forEach(e => console.error(`  - ${e.path}: ${e.error}`));
      }
      
      return finalResult;
    } catch (error) {
      this.indexStatus = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  async search(query: string, options?: {
    limit?: number;
    includeExcerpt?: boolean;
  }): Promise<SimilaritySearchResult[]> {
    if (!this.provider || !this.config.similarity?.enabled) {
      return [];
    }
    
    try {
      const results = await this.provider.search(query, {
        limit: options?.limit ?? 10,
        threshold: 0.2
      });

      return results.map(result => ({
        path: result.path,
        content: result.content || '',
        score: result.score,
        excerpt: options?.includeExcerpt && result.content 
          ? this.generateExcerpt(result.content, 200)
          : undefined
      }));
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  }

  private generateExcerpt(content: string, maxLength: number): string {
    const cleaned = content.replace(/^#+ .*$/gm, '').trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength) + '...';
  }

  async getStatus(): Promise<SimilarityStatus> {
    const ollamaHealth = await this.checkHealth();
    
    return {
      available: this.provider !== undefined && this.indexStatus !== 'error',
      ollamaHealthy: ollamaHealth.healthy,
      indexStatus: this.indexStatus,
      stats: {
        documentsIndexed: this.documentCount,
        indexSize: this.documentCount, // For compatibility
        lastUpdated: this.lastIndexedTime
      },
      progress: this.indexingProgress || undefined,
      error: this.lastError || ollamaHealth.error || undefined,
      generatedAt: new Date()
    };
  }

  async reindexAll(documents: Array<{ path: string; content: string }>): Promise<IndexingResult> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    console.log(`Starting reindex of ${documents.length} documents...`);
    
    // Clear existing index
    await this.provider.clearIndex();
    this.documentCount = 0;
    
    // Index all documents
    return this.indexBatch(documents);
  }

  async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.provider) {
      // Persist before shutdown
      if (this.provider.persist) {
        try {
          await this.provider.persist();
        } catch (error) {
          console.error('Failed to persist on shutdown:', error);
        }
      }
      
      // Shutdown provider
      await this.provider.shutdown();
    }
    
    // Cleanup factory
    await SimilarityProviderFactory.shutdownAll();
  }

  onProgress(callback: (progress: IndexingProgress) => void): void {
    this.on('indexing-progress', callback);
  }
}