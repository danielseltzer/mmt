/**
 * Provider-based Similarity Search Service
 * Uses the pluggable provider interface to support multiple vector databases
 * 
 * WHY: Encapsulates similarity search functionality at the vault level
 * - Each vault can have its own similarity configuration
 * - Enables proper isolation between vaults
 * - Prevents cross-vault contamination in vector searches
 */

import { EventEmitter } from 'events';
import type { SimilarityConfig } from '@mmt/entities';
import { 
  SimilarityProviderFactory,
  SimilarityProvider,
  DocumentToIndex
} from '@mmt/similarity-provider';
import { QdrantProvider } from '@mmt/similarity-provider-qdrant';
import { Loggers, type Logger } from '@mmt/logger';

// Register providers with the factory
SimilarityProviderFactory.register('qdrant', () => new QdrantProvider());

export interface SimilaritySearchResult {
  path: string;
  content: string;
  score: number;
  // Include metadata for UI display
  modified?: string;
  size?: number;
  title?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
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
  estimatedSecondsRemaining?: number;
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
  errors: { path: string; error: string }[];
  errorLogPath?: string;
}

// Ollama health status interface removed - not currently used

export class SimilaritySearchService extends EventEmitter {
  private provider?: SimilarityProvider;
  private config: SimilarityConfig;
  private vaultPath: string;
  private vaultId: string;
  private indexStatus: IndexStatus = 'not_started';
  private indexingProgress: IndexingProgress | null = null;
  private lastError: string | null = null;
  private isShuttingDown = false;
  private documentCount = 0;
  private lastIndexedTime?: Date;
  private logger: Logger = Loggers.similarity();

  constructor(similarityConfig: SimilarityConfig, vaultId: string, vaultPath: string) {
    super();
    this.config = similarityConfig;
    this.vaultId = vaultId;
    this.vaultPath = vaultPath;
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      // Check Ollama health first if needed
      const providerName = this.config.provider ?? 'qdrant';
      
      // Only check Ollama if not using pre-computed embeddings
      if (this.config.ollamaUrl) {
        const ollamaHealthy = await this.checkOllamaHealth();
        if (!ollamaHealthy) {
          this.indexStatus = 'error';
          this.lastError = 'Ollama is not running or not accessible';
          this.logger.warn(`Similarity search disabled for vault ${this.vaultId}: ${this.lastError}`);
          return;
        }
      }

      // Create and initialize the provider
      this.logger.info(`Initializing similarity provider for vault ${this.vaultId}: ${providerName}`);
      this.provider = await SimilarityProviderFactory.create(providerName, {
        config: {
          ...this.config,
          provider: providerName
        },
        vaultPath: this.vaultPath,
        vaultId: this.vaultId
      });

      // Load existing index if available
      if (this.provider.load) {
        try {
          await this.provider.load();
          this.logger.info(`Loaded existing similarity index for vault ${this.vaultId}`);
        } catch (error) {
          // Log the actual error for debugging, but continue
          this.logger.warn(`Could not load existing index for vault ${this.vaultId}`, {
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
      
      this.logger.info(`Similarity search initialized for vault ${this.vaultId} with ${providerName} provider (${String(this.documentCount)} documents)`);
    } catch (error) {
      this.indexStatus = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize similarity search for vault ${this.vaultId}`, { 
        error: this.lastError 
      });
      throw error;
    }
  }

  async checkOllamaHealth(): Promise<boolean> {
    if (!this.config.ollamaUrl) {
      return false;
    }
    
    try {
      const response = await fetch(`${this.config.ollamaUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async search(query: string, limit = 10): Promise<SimilaritySearchResult[]> {
    if (!this.provider) {
      throw new Error(`Similarity search not initialized for vault ${this.vaultId}`);
    }
    
    if (this.indexStatus !== 'ready') {
      throw new Error(`Similarity index not ready for vault ${this.vaultId}. Current status: ${this.indexStatus}`);
    }

    try {
      const results = await this.provider.search(query, { limit, threshold: 0.2 });
      
      return results.map(result => ({
        path: result.id,
        content: result.content ?? '',
        score: result.score,
        modified: result.metadata?.modified as string | undefined,
        size: result.metadata?.size as number | undefined,
        title: result.metadata?.title as string | undefined,
        tags: result.metadata?.tags as string[] | undefined,
        metadata: result.metadata,
        excerpt: this.generateExcerpt(result.content ?? '', query)
      }));
    } catch (error) {
      this.logger.error(`Search failed for vault ${this.vaultId}`, {
        query,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  private generateExcerpt(content: string, query: string): string {
    const maxLength = 200;
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    const queryIndex = contentLower.indexOf(queryLower);
    
    if (queryIndex === -1) {
      return content.slice(0, maxLength) + (content.length > maxLength ? '...' : '');
    }
    
    const start = Math.max(0, queryIndex - 50);
    const end = Math.min(content.length, queryIndex + queryLower.length + 150);
    
    let excerpt = content.slice(start, end);
    if (start > 0) {excerpt = `...${ excerpt}`;}
    if (end < content.length) {excerpt = `${excerpt }...`;}
    
    return excerpt;
  }

  async indexDocuments(documents: DocumentToIndex[]): Promise<IndexingResult> {
    if (!this.provider) {
      throw new Error(`Similarity search not initialized for vault ${this.vaultId}`);
    }

    this.indexStatus = 'indexing';
    this.indexingProgress = {
      current: 0,
      total: documents.length,
      percentage: 0,
      startedAt: new Date()
    };

    const errors: { path: string; error: string }[] = [];
    let successCount = 0;

    try {
      // Index documents in batches
      const batchSize = 10;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, Math.min(i + batchSize, documents.length));
        
        try {
          const result = await this.provider.indexBatch(batch);
          successCount += result.successful;
          
          // Track any individual errors from the batch
          result.errors.forEach(err => {
            errors.push({
              path: err.path,
              error: err.error
            });
          });
        } catch (error) {
          // Track batch-level errors
          batch.forEach(doc => {
            errors.push({
              path: doc.id,
              error: error instanceof Error ? error.message : String(error)
            });
          });
        }

        // Update progress
        this.indexingProgress.current = Math.min(i + batchSize, documents.length);
        this.indexingProgress.percentage = Math.round(
          (this.indexingProgress.current / this.indexingProgress.total) * 100
        );
        
        // Emit progress event
        this.emit('indexing-progress', this.indexingProgress);
      }

      // Update status
      const status = await this.provider.getStatus();
      this.documentCount = status.documentCount;
      this.lastIndexedTime = status.lastIndexed;
      this.indexStatus = 'ready';
      
      return {
        totalDocuments: documents.length,
        successfullyIndexed: successCount,
        failed: errors.length,
        errors
      };
    } catch (error) {
      this.indexStatus = 'error';
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.indexingProgress = null;
    }
  }

  async getStatus(): Promise<SimilarityStatus> {
    const ollamaHealthy = this.config.ollamaUrl 
      ? await this.checkOllamaHealth()
      : true;

    return {
      available: Boolean(this.provider) && this.indexStatus === 'ready',
      ollamaHealthy,
      indexStatus: this.indexStatus,
      stats: {
        documentsIndexed: this.documentCount,
        indexSize: 0, // Provider-specific, could be enhanced
        lastUpdated: this.lastIndexedTime
      },
      progress: this.indexingProgress ?? undefined,
      error: this.lastError ?? undefined,
      generatedAt: new Date()
    };
  }

  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {return;}
    this.isShuttingDown = true;

    this.logger.info(`Shutting down similarity search for vault ${this.vaultId}`);

    if (this.provider) {
      await this.provider.shutdown();
    }

    this.removeAllListeners();
  }
}