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
        
        console.log(`Created Qdrant collection: ${this.collectionName}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
      console.error('Failed to get document count:', error);
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
  
  private async generateEmbedding(text: string): Promise<number[]> {
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
    
    try {
      // Generate embedding if not provided
      const embedding = doc.embedding || await this.generateEmbedding(doc.content);
      
      // Prepare point for Qdrant
      const point = {
        id: doc.id,
        vector: embedding,
        payload: {
          path: doc.path,
          content: doc.content,
          ...doc.metadata
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
      const errorMsg = `Failed to index document ${doc.path}: ${message}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }
  
  async indexBatch(docs: DocumentToIndex[]): Promise<IndexingResult> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    const errors: IndexingResult['errors'] = [];
    let successful = 0;
    const points = [];
    
    // Process documents and generate embeddings
    for (const doc of docs) {
      try {
        const embedding = doc.embedding || await this.generateEmbedding(doc.content);
        
        points.push({
          id: doc.id,
          vector: embedding,
          payload: {
            path: doc.path,
            content: doc.content,
            ...doc.metadata
          }
        });
        
        successful++;
      } catch (error) {
        errors.push({
          documentId: doc.id,
          path: doc.path,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Batch upsert successful points
    if (points.length > 0) {
      try {
        await this.client.upsert(this.collectionName, {
          points
        });
        
        this.lastIndexedTime = new Date();
        this.documentCount += points.length;
      } catch (error) {
        // If batch fails, all points in batch are considered failed
        const batchError = error instanceof Error ? error.message : String(error);
        for (const point of points) {
          const doc = docs.find(d => d.id === point.id);
          if (doc) {
            errors.push({
              documentId: doc.id,
              path: doc.path,
              error: `Batch upsert failed: ${batchError}`
            });
          }
        }
        successful = 0;
      }
    }
    
    return {
      successful,
      failed: errors.length,
      errors
    };
  }
  
  async removeDocument(id: string): Promise<void> {
    if (!this.client) {
      throw new Error('Qdrant client not initialized');
    }
    
    try {
      await this.client.delete(this.collectionName, {
        points: [id]
      });
      
      this.documentCount = Math.max(0, this.documentCount - 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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
        id: String(hit.id),
        path: hit.payload?.path as string || '',
        score: hit.score || 0,
        content: hit.payload?.content as string,
        metadata: hit.payload as Record<string, any>
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
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