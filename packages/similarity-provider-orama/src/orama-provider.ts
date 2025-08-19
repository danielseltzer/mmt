import { create, insert, insertMultiple, search, remove, AnyOrama } from '@orama/orama';
import { persistToFile, restoreFromFile } from '@orama/plugin-data-persistence/server';
import * as crypto from 'crypto';
import * as path from 'path';
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
 * Orama vector database provider implementation
 * Wraps the existing Orama implementation in the provider interface
 */
export class OramaProvider extends BaseSimilarityProvider {
  readonly name = 'orama';
  private db?: AnyOrama;
  private indexPath?: string;
  private ollamaUrl?: string;
  private model?: string;
  private documentCount: number = 0;
  private lastIndexedTime?: Date;
  private lastError?: string;
  private embeddingCache = new Map<string, number[]>();
  private maxCacheSize = 1000;
  
  protected async doInitialize(options: ProviderInitOptions): Promise<void> {
    const { config, vaultPath } = options;
    
    // Get Orama configuration
    const oramaConfig = config.orama || {
      indexFilename: 'similarity-index.msp',
      maxDepth: 100
    };
    
    // Store configuration
    this.ollamaUrl = config.ollamaUrl;
    this.model = config.model;
    
    // Determine index path
    this.indexPath = path.join(vaultPath, '.mmt', oramaConfig.indexFilename);
    
    try {
      // Try to load existing index
      try {
        this.db = await restoreFromFile('binary', this.indexPath) as AnyOrama;
        
        if (!this.db) {
          throw new Error('Loaded database is null or undefined');
        }
        
        // Get document count
        const verifyCount = await search(this.db, { term: '', limit: 1 });
        this.documentCount = verifyCount.count || 0;
        
        console.log(`Loaded existing Orama index with ${this.documentCount} documents`);
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
        this.documentCount = 0;
        console.log('Created new Orama index');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.lastError = `Failed to initialize Orama: ${message}`;
      throw new Error(this.lastError);
    }
  }
  
  protected async doShutdown(): Promise<void> {
    // Persist before shutdown
    if (this.db && this.indexPath) {
      try {
        await this.persist();
      } catch (error) {
        console.error('Failed to persist on shutdown:', error);
      }
    }
    
    this.db = undefined;
    this.embeddingCache.clear();
    this.documentCount = 0;
    this.lastIndexedTime = undefined;
  }
  
  async isHealthy(): Promise<boolean> {
    if (!this.initialized || !this.db) {
      return false;
    }
    
    try {
      // Simple health check - try a basic search
      await search(this.db, { term: '', limit: 1 });
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
  
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!this.ollamaUrl || !this.model) {
      throw new Error('Ollama URL and model must be configured for embedding generation');
    }
    
    // Check cache
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
      
      // Cache the result
      this.embeddingCache.set(cacheKey, data.embedding as number[]);
      
      return data.embedding as number[];
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to generate embedding: ${error.message}`);
      }
      throw error;
    }
  }
  
  async indexDocument(doc: DocumentToIndex): Promise<void> {
    if (!this.db) {
      throw new Error('Orama database not initialized');
    }
    
    try {
      // Generate embedding if not provided
      const embedding = doc.embedding || await this.generateEmbedding(doc.content);
      
      // Validate embedding dimensions
      if (embedding.length !== 768) {
        throw new Error(`Invalid embedding dimensions: got ${embedding.length}, expected 768`);
      }
      
      // Create document ID and content hash
      const id = crypto.createHash('md5').update(doc.path).digest('hex');
      const contentHash = crypto.createHash('md5').update(doc.content).digest('hex');
      
      // Check if document exists and needs update
      try {
        const existing = await search(this.db, {
          term: id,
          properties: ['id'],
          exact: true,
          limit: 1
        });
        
        if (existing.hits.length > 0) {
          const existingDoc = existing.hits[0].document as any;
          if (existingDoc.contentHash === contentHash) {
            // Content unchanged, skip
            return;
          }
          // Remove existing document
          await remove(this.db, id);
        }
      } catch {
        // Document doesn't exist, continue
      }
      
      // Insert the document
      const oramaDoc = {
        id,
        path: doc.path,
        content: doc.content,
        embedding,
        contentHash,
        lastModified: Date.now()
      };
      
      await insert(this.db, oramaDoc);
      
      this.lastIndexedTime = new Date();
      this.documentCount++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const errorMsg = `Failed to index document ${doc.path}: ${message}`;
      console.error(errorMsg);
      
      // Check if this is the "Too deep objects" error
      if (message.includes('Too deep objects')) {
        throw new Error(`Orama depth limit exceeded for ${doc.path}: ${message}`);
      }
      
      throw new Error(errorMsg);
    }
  }
  
  async indexBatch(docs: DocumentToIndex[]): Promise<IndexingResult> {
    if (!this.db) {
      throw new Error('Orama database not initialized');
    }
    
    const errors: IndexingResult['errors'] = [];
    let successful = 0;
    const oramaDocs = [];
    
    // Process documents and generate embeddings
    for (const doc of docs) {
      try {
        const embedding = doc.embedding || await this.generateEmbedding(doc.content);
        
        // Validate embedding dimensions
        if (embedding.length !== 768) {
          throw new Error(`Invalid embedding dimensions: got ${embedding.length}, expected 768`);
        }
        
        const id = crypto.createHash('md5').update(doc.path).digest('hex');
        const contentHash = crypto.createHash('md5').update(doc.content).digest('hex');
        
        oramaDocs.push({
          id,
          path: doc.path,
          content: doc.content,
          embedding,
          contentHash,
          lastModified: Date.now()
        });
        
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({
          documentId: doc.id,
          path: doc.path,
          error: message
        });
        
        // Check for the depth error
        if (message.includes('Too deep objects')) {
          console.error(`CRITICAL: Orama depth limit hit at document ${doc.path}`);
          // Stop processing further documents
          break;
        }
      }
    }
    
    // Batch insert successful documents
    if (oramaDocs.length > 0) {
      try {
        await insertMultiple(this.db, oramaDocs);
        successful = oramaDocs.length;
        this.lastIndexedTime = new Date();
        this.documentCount += successful;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        
        // If batch fails, report all as failed
        for (const oramaDoc of oramaDocs) {
          const originalDoc = docs.find(d => 
            crypto.createHash('md5').update(d.path).digest('hex') === oramaDoc.id
          );
          if (originalDoc) {
            errors.push({
              documentId: originalDoc.id,
              path: originalDoc.path,
              error: `Batch insert failed: ${message}`
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
    if (!this.db) {
      throw new Error('Orama database not initialized');
    }
    
    try {
      // Convert to Orama's internal ID format (MD5 hash of path)
      await remove(this.db, id);
      this.documentCount = Math.max(0, this.documentCount - 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to remove document ${id}: ${message}`);
    }
  }
  
  async clearIndex(): Promise<void> {
    if (!this.db) {
      throw new Error('Orama database not initialized');
    }
    
    try {
      // Recreate the database
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
      
      this.documentCount = 0;
      this.lastIndexedTime = undefined;
      this.embeddingCache.clear();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to clear index: ${message}`);
    }
  }
  
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    if (!this.db) {
      throw new Error('Orama database not initialized');
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
    if (!this.db) {
      throw new Error('Orama database not initialized');
    }
    
    const limit = options?.limit ?? 10;
    const threshold = options?.threshold ?? 0.2;
    
    try {
      const searchResults = await search(this.db, {
        mode: 'vector',
        vector: {
          value: vector,
          property: 'embedding'
        },
        similarity: threshold,
        limit,
        includeVectors: false
      });
      
      return searchResults.hits.map(hit => {
        const doc = hit.document as any;
        return {
          id: doc.id,
          path: doc.path,
          score: hit.score || 0,
          content: doc.content,
          metadata: {
            contentHash: doc.contentHash,
            lastModified: doc.lastModified
          }
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Vector search failed: ${message}`);
    }
  }
  
  /**
   * Persist the index to disk
   */
  async persist(): Promise<void> {
    if (!this.db || !this.indexPath) {
      throw new Error('Cannot persist: database or path not initialized');
    }
    
    try {
      await persistToFile(this.db, 'binary', this.indexPath);
      console.log(`Persisted Orama index to ${this.indexPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to persist index: ${message}`);
    }
  }
  
  /**
   * Load the index from disk
   */
  async load(): Promise<void> {
    if (!this.indexPath) {
      throw new Error('Cannot load: index path not initialized');
    }
    
    try {
      this.db = await restoreFromFile('binary', this.indexPath) as AnyOrama;
      
      if (!this.db) {
        throw new Error('Loaded database is null or undefined');
      }
      
      // Update document count
      const verifyCount = await search(this.db, { term: '', limit: 1 });
      this.documentCount = verifyCount.count || 0;
      
      console.log(`Loaded Orama index with ${this.documentCount} documents`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load index: ${message}`);
    }
  }
}