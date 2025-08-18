import { BaseSimilarityProvider } from './interface';
import {
  DocumentToIndex,
  SearchOptions,
  SearchResult,
  IndexingResult,
  SimilarityStatus,
  ProviderInitOptions
} from './types';

/**
 * Mock provider for testing purposes
 */
export class MockSimilarityProvider extends BaseSimilarityProvider {
  readonly name = 'mock';
  private documents = new Map<string, DocumentToIndex>();
  private lastIndexedTime?: Date;
  
  protected async doInitialize(options: ProviderInitOptions): Promise<void> {
    // Mock initialization
    this.documents.clear();
  }
  
  protected async doShutdown(): Promise<void> {
    // Mock shutdown
    this.documents.clear();
  }
  
  async getStatus(): Promise<SimilarityStatus> {
    return {
      ready: this.initialized,
      documentCount: this.documents.size,
      lastIndexed: this.lastIndexedTime,
      provider: this.name
    };
  }
  
  async indexDocument(doc: DocumentToIndex): Promise<void> {
    this.documents.set(doc.id, doc);
    this.lastIndexedTime = new Date();
  }
  
  async indexBatch(docs: DocumentToIndex[]): Promise<IndexingResult> {
    const errors: IndexingResult['errors'] = [];
    let successful = 0;
    
    for (const doc of docs) {
      try {
        await this.indexDocument(doc);
        successful++;
      } catch (error) {
        errors.push({
          documentId: doc.id,
          path: doc.path,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return {
      successful,
      failed: errors.length,
      errors
    };
  }
  
  async removeDocument(id: string): Promise<void> {
    this.documents.delete(id);
  }
  
  async clearIndex(): Promise<void> {
    this.documents.clear();
    this.lastIndexedTime = undefined;
  }
  
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // Simple mock search - return all documents with mock scores
    const results: SearchResult[] = [];
    const limit = options?.limit ?? 10;
    const threshold = options?.threshold ?? 0.2;
    
    let count = 0;
    for (const [id, doc] of this.documents.entries()) {
      if (count >= limit) break;
      
      // Mock relevance score based on query presence in content
      const score = doc.content.toLowerCase().includes(query.toLowerCase()) 
        ? 0.9 
        : 0.3;
      
      if (score >= threshold) {
        results.push({
          id,
          path: doc.path,
          score,
          content: doc.content.substring(0, 200),
          metadata: doc.metadata
        });
        count++;
      }
    }
    
    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }
  
  async searchByVector(vector: number[], options?: SearchOptions): Promise<SearchResult[]> {
    // Mock vector search - similar to text search for testing
    return this.search('mock-vector-search', options);
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    // Mock embedding - return array of zeros
    return new Array(768).fill(0);
  }
}