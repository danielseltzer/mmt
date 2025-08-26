import { QdrantClient } from '@qdrant/js-client-rest';
import {
  BaseSimilarityProvider,
  DocumentToIndex,
  SearchOptions,
  SearchResult,
  IndexingResult,
  SimilarityStatus,
  ProviderInitOptions
} from '@mmt/similarity-provider';
import { Loggers, formatError, type Logger } from '@mmt/logger';
import { isAxiosLikeError } from '@mmt/entities';

/**
 * Qdrant vector database provider implementation
 */
export class QdrantProvider extends BaseSimilarityProvider {
  readonly name = 'qdrant';
  private client?: QdrantClient;
  private collectionName: string = 'documents';
  private ollamaUrl?: string;
  private model?: string;
  private documentCount: number = 0;
  private lastIndexedTime?: Date;
  private lastError?: string;
  private logger: Logger = Loggers.qdrant();
  
  protected async doInitialize(options: ProviderInitOptions): Promise<void> {
    const { config } = options;
    
    // Get Qdrant configuration
    const qdrantConfig = config.qdrant || {
      url: 'http://localhost:6333',
      collectionName: 'documents',
      onDisk: false
    };
    
    // Store configuration
    this.ollamaUrl = config.ollamaUrl;
    this.model = config.model;
    this.collectionName = qdrantConfig.collectionName;
    
    // Initialize Qdrant client
    this.client = new QdrantClient({
      url: qdrantConfig.url,
      timeout: 30000 // 30 second timeout
    });
    
    // Ensure collection exists
    await this.ensureCollection();
    
    // Get initial document count
    await this.updateDocumentCount();
  }
  
  protected async doShutdown(): Promise<void> {
    // Qdrant client doesn't need explicit cleanup
    this.client = undefined;
    this.documentCount = 0;
    this.lastIndexedTime = undefined;
    this.lastError = undefined;
  }
  
  private async ensureCollection(): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections?.some(c => c.name === this.collectionName);
      
      if (!exists) {
        // Create collection with appropriate vector size for nomic-embed-text
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: 768, // nomic-embed-text produces 768-dimensional vectors
            distance: 'Cosine'
          },
          optimizers_config: {
            default_segment_number: 2
          },
          replication_factor: 1
        });
        
        this.logger.info(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to ensure collection', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        collectionName: this.collectionName,
        operation: 'ensureCollection'
      });
      this.lastError = `Failed to ensure collection: ${message}`;
      throw new Error(this.lastError);
    }
  }
  
  private async updateDocumentCount(): Promise<void> {
    if (!this.client) return;
    
    try {
      const info = await this.client.getCollection(this.collectionName);
      this.documentCount = info.points_count || 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get document count', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        collectionName: this.collectionName
      });
      this.documentCount = 0;
    }
  }
  
  async isHealthy(): Promise<boolean> {
    if (!this.initialized || !this.client) {
      return false;
    }
    
    try {
      // Try to get collection info as health check
      await this.client.getCollection(this.collectionName);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Health check failed', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        collectionName: this.collectionName
      });
      this.lastError = error instanceof Error ? error.message : String(error);
      return false;
    }
  }
  
  async getStatus(): Promise<SimilarityStatus> {
    const ready = await this.isHealthy();
    
    return {
      ready,
      documentCount: this.documentCount,
      lastIndexed: this.lastIndexedTime,
      error: this.lastError,
      provider: this.name
    };
  }
  
  /**
   * Convert MD5 hash to numeric ID for Qdrant compatibility
   * Takes first 13 hex chars (52 bits) to stay within JS safe integer range
   * This provides effectively 0% collision chance for typical vault sizes
   */
  private md5ToNumericId(md5: string): number {
    // Take first 13 hex chars (52 bits) to stay within JS safe integer range
    // Number.MAX_SAFE_INTEGER = 2^53 - 1
    const truncated = md5.slice(0, 13);
    const num = parseInt(truncated, 16);
    return num % Number.MAX_SAFE_INTEGER;
  }
  
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ollamaUrl || !this.model) {
      throw new Error('Ollama URL and model must be configured for embedding generation');
    }
    
    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: text.slice(0, 8192) // Respect context window limit
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama embedding failed (${response.status}): ${errorText}`);
      }
      
      const data = await response.json() as { embedding?: unknown };
      
      if (!data.embedding || !Array.isArray(data.embedding)) {
        throw new Error('Invalid embedding response from Ollama');
      }
      
      return data.embedding as number[];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to generate embedding', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        ollamaUrl: this.ollamaUrl,
        model: this.model,
        textLength: text.length
      });
      if (error instanceof Error) {
        throw new Error(`Failed to generate embedding: ${error.message}`);
      }
      throw error;
    }
  }
  
  async indexDocument(doc: DocumentToIndex): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    // Check for empty content - skip with warning
    if (!doc.content || doc.content.trim().length === 0) {
      this.logger.warn(`Skipping empty file: ${doc.path}`);
      return;  // Exit without error
    }
    
    try {
      // Generate embedding if not provided
      const embedding = doc.embedding || await this.generateEmbedding(doc.content);
      
      // Check if embedding generation failed
      if (!embedding || embedding.length === 0) {
        this.logger.warn(`Skipping document with no embedding: ${doc.path}`);
        return;  // Exit without error
      }
      
      // Convert MD5 ID to numeric format for Qdrant
      const qdrantId = this.md5ToNumericId(doc.id);
      
      // Prepare point for Qdrant - NO CONTENT, only metadata
      const point = {
        id: qdrantId,
        vector: embedding,
        payload: {
          originalId: doc.id,  // Store original MD5 for reference
          path: doc.path,
          // Only include specific, small metadata fields
          title: doc.metadata?.title,
          tags: doc.metadata?.tags,
          created: doc.metadata?.created,
          modified: doc.metadata?.modified,
          size: doc.metadata?.size
          // DO NOT spread all metadata - could include large content fields
        }
      };
      
      // Upsert the point
      await this.client.upsert(this.collectionName, {
        points: [point]
      });
      
      this.lastIndexedTime = new Date();
      this.documentCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to index single document', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        documentPath: doc.path,
        documentId: doc.id,
        collectionName: this.collectionName
      });
      const errorMsg = `Failed to index document ${doc.path}: ${message}`;
      throw new Error(errorMsg);
    }
  }
  
  async indexBatch(docs: DocumentToIndex[]): Promise<IndexingResult> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    const errors: IndexingResult['errors'] = [];
    let successful = 0;
    let skipped = 0;
    const points = [];
    
    // Process documents and generate embeddings
    for (const doc of docs) {
      try {
        // Check for empty content - skip with warning, not error
        if (!doc.content || doc.content.trim().length === 0) {
          this.logger.warn(`Skipping empty file: ${doc.path}`);
          skipped++;
          continue;  // Skip to next document
        }
        
        const embedding = doc.embedding || await this.generateEmbedding(doc.content);
        
        // Check if embedding generation failed (empty vector)
        if (!embedding || embedding.length === 0) {
          this.logger.warn(`Skipping document with no embedding: ${doc.path}`);
          skipped++;
          continue;
        }
        
        // Convert MD5 ID to numeric format for Qdrant
        const qdrantId = this.md5ToNumericId(doc.id);
        
        points.push({
          id: qdrantId,
          vector: embedding,
          payload: {
            originalId: doc.id,  // Store original MD5 for reference
            path: doc.path,
            // Only include specific, small metadata fields
            title: doc.metadata?.title,
            tags: doc.metadata?.tags,
            created: doc.metadata?.created,
            modified: doc.metadata?.modified,
            size: doc.metadata?.size
            // DO NOT spread all metadata - could include large content fields
          }
        });
        
        successful++;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to process document ${doc.path}: ${errorMsg}`);
        errors.push({
          documentId: doc.id,
          path: doc.path,
          error: errorMsg
        });
      }
    }
    
    // Batch upsert successful points
    if (points.length > 0) {
      this.logger.info(`Attempting to upsert batch of ${points.length} documents`);
      try {
        await this.client.upsert(this.collectionName, {
          points
        });
        
        this.lastIndexedTime = new Date();
        this.documentCount += points.length;
        this.logger.info(`Successfully upserted ${points.length} documents`);
      } catch (error) {
        // If batch fails, try indexing documents one by one to identify problematic ones
        const batchError = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Batch upsert failed, falling back to individual indexing for ${points.length} documents`);
        this.logger.warn('Batch error was:', {
          error: batchError,
          httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
          qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined
        });
        
        // Try indexing each document individually
        let individualSuccesses = 0;
        const failedDocs: Array<{path: string, error: string, payload?: unknown}> = [];
        
        for (const point of points) {
          const originalId = (point.payload as any).originalId;
          const doc = docs.find(d => d.id === originalId);
          
          if (!doc) continue;
          
          try {
            // Try to index this single document
            await this.client.upsert(this.collectionName, {
              points: [point]
            });
            individualSuccesses++;
          } catch (individualError) {
            const errorMsg = individualError instanceof Error ? individualError.message : String(individualError);
            
            // Log detailed error information for debugging
            const errorDetails = {
              path: doc.path,
              error: errorMsg,
              httpStatus: isAxiosLikeError(individualError) ? individualError.response?.status : undefined,
              qdrantError: isAxiosLikeError(individualError) ? individualError.response?.data : undefined,
              documentId: doc.id,
              numericId: point.id,
              payloadSize: JSON.stringify(point.payload).length,
              vectorSize: point.vector.length
            };
            
            this.logger.error('Failed to index individual document', errorDetails);
            
            failedDocs.push({
              path: doc.path,
              error: `Individual indexing failed: ${errorMsg}`,
              payload: point.payload
            });
            
            errors.push({
              documentId: doc.id,
              path: doc.path,
              error: `Individual indexing failed: ${errorMsg}`
            });
          }
        }
        
        if (individualSuccesses > 0) {
          successful = individualSuccesses;
          this.lastIndexedTime = new Date();
          this.documentCount += individualSuccesses;
          this.logger.info(`Successfully indexed ${individualSuccesses}/${points.length} documents individually`);
        }
        
        if (failedDocs.length > 0) {
          // Write failed documents to a file for analysis
          const fs = await import('fs/promises');
          const failedDocsPath = `/tmp/qdrant-failed-docs-${Date.now()}.json`;
          await fs.writeFile(failedDocsPath, JSON.stringify(failedDocs, null, 2));
          this.logger.error(`${failedDocs.length} documents failed. Details saved to: ${failedDocsPath}`);
        }
      }
    }
    
    // Count skipped files as successful since they were handled correctly (empty content is valid)
    const result = {
      successful: successful + skipped,
      failed: errors.length,
      errors
    };
    
    // Report summary including skipped files
    if (skipped > 0) {
      this.logger.info(`Skipped ${skipped} empty/invalid files (warnings logged above)`);
    }
    
    if (errors.length > 0) {
      this.logger.warn(`Batch indexing completed with ${errors.length} errors`);
      if (errors.length > 5) {
        this.logger.warn(`First 5 errors:`);
        errors.slice(0, 5).forEach(e => this.logger.warn(`  - ${e.path}: ${e.error}`));
      } else {
        errors.forEach(e => this.logger.warn(`  - ${e.path}: ${e.error}`));
      }
    }
    
    return result;
  }
  
  async removeDocument(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    try {
      // Convert MD5 ID to numeric format for Qdrant
      const qdrantId = this.md5ToNumericId(id);
      
      await this.client.delete(this.collectionName, {
        points: [qdrantId]
      });
      
      this.documentCount = Math.max(0, this.documentCount - 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to remove document', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        documentId: id,
        qdrantId: this.md5ToNumericId(id),
        collectionName: this.collectionName
      });
      throw new Error(`Failed to remove document ${id}: ${message}`);
    }
  }
  
  async clearIndex(): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    try {
      // Delete and recreate the collection
      await this.client.deleteCollection(this.collectionName);
      await this.ensureCollection();
      
      this.documentCount = 0;
      this.lastIndexedTime = undefined;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to clear index', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        collectionName: this.collectionName,
        operation: 'clearIndex'
      });
      throw new Error(`Failed to clear index: ${message}`);
    }
  }
  
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    try {
      // Generate query embedding
      const embedding = await this.generateEmbedding(query);
      return await this.searchByVector(embedding, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Search query failed', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        query: query.slice(0, 100),
        collectionName: this.collectionName,
        options
      });
      throw new Error(`Search failed: ${message}`);
    }
  }
  
  async searchByVector(vector: number[], options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    const limit = options?.limit ?? 10;
    const threshold = options?.threshold ?? 0.2;
    
    try {
      const searchResult = await this.client.search(this.collectionName, {
        vector,
        limit,
        score_threshold: threshold,
        with_payload: true
      });
      
      return searchResult.map(hit => ({
        id: hit.payload?.originalId as string || String(hit.id),  // Return original MD5 ID
        path: hit.payload?.path as string || '',
        score: hit.score || 0,
        content: '',  // Content not stored in Qdrant
        metadata: hit.payload as Record<string, any>
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Vector search failed', {
        error: message,
        httpStatus: isAxiosLikeError(error) ? error.response?.status : undefined,
        qdrantError: isAxiosLikeError(error) ? error.response?.data : undefined,
        vectorDimensions: vector.length,
        collectionName: this.collectionName,
        limit,
        threshold
      });
      throw new Error(`Vector search failed: ${message}`);
    }
  }
  
  /**
   * Qdrant persists automatically, so this is a no-op
   */
  async persist(): Promise<void> {
    // Qdrant automatically persists data
    await this.updateDocumentCount();
  }
  
  /**
   * Qdrant loads automatically, so this is a no-op
   */
  async load(): Promise<void> {
    // Qdrant automatically loads data
    await this.updateDocumentCount();
  }
}