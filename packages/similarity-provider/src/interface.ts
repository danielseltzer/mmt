import {
  DocumentToIndex,
  SearchOptions,
  SearchResult,
  IndexingResult,
  SimilarityStatus,
  ProviderInitOptions
} from './types.js';

/**
 * Main interface for similarity search providers
 * All providers must implement this interface to be compatible with the system
 */
export interface SimilarityProvider {
  /**
   * Provider name for identification
   */
  readonly name: string;
  
  /**
   * Initialize the provider with configuration
   * @param options Provider initialization options
   */
  initialize(options: ProviderInitOptions): Promise<void>;
  
  /**
   * Gracefully shutdown the provider and cleanup resources
   */
  shutdown(): Promise<void>;
  
  // Health & Status
  
  /**
   * Check if the provider is healthy and ready to use
   */
  isHealthy(): Promise<boolean>;
  
  /**
   * Get detailed status information about the provider
   */
  getStatus(): Promise<SimilarityStatus>;
  
  // Indexing Operations
  
  /**
   * Index a single document
   * @param doc Document to index
   */
  indexDocument(doc: DocumentToIndex): Promise<void>;
  
  /**
   * Index multiple documents in batch
   * @param docs Array of documents to index
   * @returns Result with success/failure counts
   */
  indexBatch(docs: DocumentToIndex[]): Promise<IndexingResult>;
  
  /**
   * Remove a document from the index
   * @param id Document ID to remove
   */
  removeDocument(id: string): Promise<void>;
  
  /**
   * Update an existing document in the index
   * @param doc Updated document
   */
  updateDocument(doc: DocumentToIndex): Promise<void>;
  
  /**
   * Clear all documents from the index
   */
  clearIndex(): Promise<void>;
  
  // Search Operations
  
  /**
   * Search for similar documents using a text query
   * @param query Text query to search for
   * @param options Search options
   * @returns Array of search results sorted by relevance
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  
  /**
   * Search for similar documents using a vector
   * @param vector Embedding vector to search with
   * @param options Search options
   * @returns Array of search results sorted by relevance
   */
  searchByVector(vector: number[], options?: SearchOptions): Promise<SearchResult[]>;
  
  // Persistence (Optional)
  
  /**
   * Persist the index to storage (if supported)
   */
  persist?(): Promise<void>;
  
  /**
   * Load the index from storage (if supported)
   */
  load?(): Promise<void>;
  
  // Embedding Generation (Optional)
  
  /**
   * Generate embedding for text (if provider handles embeddings)
   * @param text Text to generate embedding for
   * @returns Embedding vector
   */
  generateEmbedding?(text: string): Promise<number[]>;
}

/**
 * Base abstract class that providers can extend
 * Provides default implementations for some methods
 */
export abstract class BaseSimilarityProvider implements SimilarityProvider {
  abstract readonly name: string;
  protected initialized = false;
  protected options?: ProviderInitOptions;
  
  async initialize(options: ProviderInitOptions): Promise<void> {
    if (this.initialized) {
      throw new Error(`Provider ${this.name} is already initialized`);
    }
    this.options = options;
    await this.doInitialize(options);
    this.initialized = true;
  }
  
  protected abstract doInitialize(options: ProviderInitOptions): Promise<void>;
  
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    await this.doShutdown();
    this.initialized = false;
  }
  
  protected abstract doShutdown(): Promise<void>;
  
  isHealthy(): Promise<boolean> {
    return Promise.resolve(this.initialized);
  }
  
  abstract getStatus(): Promise<SimilarityStatus>;
  abstract indexDocument(doc: DocumentToIndex): Promise<void>;
  abstract indexBatch(docs: DocumentToIndex[]): Promise<IndexingResult>;
  abstract removeDocument(id: string): Promise<void>;
  abstract clearIndex(): Promise<void>;
  abstract search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  abstract searchByVector(vector: number[], options?: SearchOptions): Promise<SearchResult[]>;
  
  /**
   * Default implementation that replaces the document
   * Providers can override for more efficient implementations
   */
  async updateDocument(doc: DocumentToIndex): Promise<void> {
    await this.removeDocument(doc.id);
    await this.indexDocument(doc);
  }
}