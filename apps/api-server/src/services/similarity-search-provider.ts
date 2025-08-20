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
import { Loggers, formatError, type Logger } from '@mmt/logger';

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
  private logger: Logger = Loggers.similarity();

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
          this.logger.warn(`Similarity search disabled: ${this.lastError}`);
          return;
        }
      }

      // Create and initialize the provider
      this.logger.info(`Initializing similarity provider: ${providerName}`);
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
          this.logger.info('Loaded existing similarity index');
        } catch (error) {
          // Log the actual error for debugging, but continue
          this.logger.warn('Could not load existing index', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
          this.logger.info('Will create new index');
        }
      }

      // Get initial status
      const status = await this.provider.getStatus();
      this.documentCount = status.documentCount;
      this.lastIndexedTime = status.lastIndexed;
      this.indexStatus = status.ready ? 'ready' : 'error';
      
      this.logger.info(`Similarity search initialized with ${providerName} provider (${this.documentCount} documents)`);
    } catch (error) {
      this.indexStatus = 'error';
      this.lastError = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to initialize similarity search', formatError(error));
    }
  }

  private async checkOllamaHealth(): Promise<boolean> {
    if (!this.config.similarity?.ollamaUrl) return false;
    
    try {
      const response = await fetch(`${this.config.similarity.ollamaUrl}/api/tags`);
      return response.ok;
    } catch (error) {
      this.logger.error('Ollama health check failed', {
        error: error instanceof Error ? error.message : String(error),
        ollamaUrl: this.config.similarity.ollamaUrl,
        stack: error instanceof Error ? error.stack : undefined
      });
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
      
      this.logger.debug(`Indexed ${filePath}`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to index single file`, {
        path: filePath,
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined
      });
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
        this.logger.info(`Processing batch ${i / batchSize + 1} (${batch.length} documents)`);
        const result = await this.provider.indexBatch(batch);
        successCount += result.successful;
        
        if (result.failed > 0) {
          this.logger.error(`Batch indexing had failures`, {
            failed: result.failed,
            total: batch.length,
            batchNumber: i / batchSize + 1,
            firstError: result.errors[0]
          });
        }
        
        // Collect errors
        for (const error of result.errors) {
          errors.push({ path: error.path, error: error.error });
        }
        
        // CRITICAL: If entire batch failed, we should stop!
        if (result.successful === 0 && batch.length > 0) {
          this.logger.error('CRITICAL: Entire batch failed, stopping indexing', {
            batchNumber: i / batchSize + 1,
            batchSize: batch.length,
            firstError: result.errors[0],
            allErrors: result.errors.slice(0, 5) // Log first 5 errors for debugging
          });
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
      
      this.logger.info('Indexing complete', {
        totalDocuments: finalResult.totalDocuments,
        successfullyIndexed: finalResult.successfullyIndexed,
        failed: finalResult.failed
      });
      
      if (errors.length > 0 && errors.length <= 10) {
        this.logger.error('Indexing errors', {
          count: errors.length,
          errors: errors
        });
      } else if (errors.length > 10) {
        this.logger.error('Indexing errors (showing first 10)', {
          count: errors.length,
          errors: errors.slice(0, 10)
        });
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
      this.logger.error('Search failed', {
        query: query.slice(0, 100), // Log first 100 chars of query
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        options
      });
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

    this.logger.info(`Starting reindex of ${documents.length} documents`);
    
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
          this.logger.error('Failed to persist on shutdown', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });
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