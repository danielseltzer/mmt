import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { QdrantProvider } from '../qdrant-provider';
import { ProviderInitOptions, DocumentToIndex } from '@mmt/similarity-provider';
import { QdrantClient } from '@qdrant/js-client-rest';

/**
 * Integration tests for Qdrant provider
 * Requires a real Qdrant instance running at localhost:6333
 * Start with: docker-compose up qdrant
 */
describe('QdrantProvider Integration Tests', () => {
  let provider: QdrantProvider;
  let qdrantClient: QdrantClient;
  const testCollectionName = `test-documents-${String(Date.now())}`;
  
  const options: ProviderInitOptions = {
    config: {
      provider: 'qdrant',
      ollamaUrl: 'http://localhost:11434',
      model: 'nomic-embed-text',
      qdrant: {
        url: 'http://localhost:6333',
        collectionName: testCollectionName,
        onDisk: false
      }
    },
    vaultPath: '/test/vault',
    vaultId: 'test-vault'
  };
  
  beforeAll(async () => {
    // Check if Qdrant is running
    qdrantClient = new QdrantClient({ url: 'http://localhost:6333' });
    
    try {
      await qdrantClient.getCollections();
    } catch {
      console.error('Qdrant is not running. Start it with: docker-compose up qdrant');
      throw new Error('Qdrant must be running for integration tests');
    }
  });
  
  afterAll(async () => {
    // Clean up test collection
    try {
      await qdrantClient.deleteCollection(testCollectionName);
    } catch {
      // Collection might not exist, that's ok
    }
  });
  
  beforeEach(() => {
    // Create fresh provider for each test
    provider = new QdrantProvider();
  });
  
  it('should initialize and create collection', async () => {
    await provider.initialize(options);
    
    expect(provider.name).toBe('qdrant');
    expect(await provider.isHealthy()).toBe(true);
    
    const status = await provider.getStatus();
    expect(status.ready).toBe(true);
    expect(status.provider).toBe('qdrant');
    expect(status.documentCount).toBe(0);
    
    // Verify collection was created
    const collections = await qdrantClient.getCollections();
    const testCollection = collections.collections.find(c => c.name === testCollectionName);
    expect(testCollection).toBeDefined();
    
    await provider.shutdown();
  });
  
  it('should handle Ollama not being available gracefully', async () => {
    await provider.initialize(options);
    
    const doc: DocumentToIndex = {
      id: 'doc1',
      path: '/test/doc1.md',
      content: 'Test document content'
    };
    
    // This will fail if Ollama is not running, which is expected
    try {
      await provider.indexDocument(doc);
      // If it succeeds, Ollama is running
      const status = await provider.getStatus();
      expect(status.documentCount).toBe(1);
    } catch (error) {
      // Expected when Ollama is not running
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('Failed to');
    }
    
    await provider.shutdown();
  });
  
  it('should index document with provided embedding', async () => {
    await provider.initialize(options);
    
    // Create a document with a pre-computed embedding
    const doc: DocumentToIndex = {
      id: 'doc-with-embedding',
      path: '/test/doc.md',
      content: 'Document with pre-computed embedding',
      embedding: new Array(768).fill(0.1), // Test embedding vector
      metadata: { type: 'test', version: 1 }
    };
    
    await provider.indexDocument(doc);
    
    const status = await provider.getStatus();
    expect(status.documentCount).toBe(1);
    expect(status.lastIndexed).toBeInstanceOf(Date);
    
    // Verify document is in Qdrant
    const collectionInfo = await qdrantClient.getCollection(testCollectionName);
    expect(collectionInfo.points_count).toBe(1);
    
    await provider.shutdown();
  });
  
  it('should search by vector', async () => {
    await provider.initialize(options);
    
    // Index some documents with embeddings
    const docs: DocumentToIndex[] = [
      {
        id: 'vec1',
        path: '/test/vec1.md',
        content: 'First vector document',
        embedding: new Array(768).fill(0.1)
      },
      {
        id: 'vec2',
        path: '/test/vec2.md',
        content: 'Second vector document',
        embedding: new Array(768).fill(0.2)
      },
      {
        id: 'vec3',
        path: '/test/vec3.md',
        content: 'Third vector document',
        embedding: new Array(768).fill(0.3)
      }
    ];
    
    const result = await provider.indexBatch(docs);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    
    // Search with a vector close to the second document
    const searchVector = new Array(768).fill(0.19) as number[];
    const results = await provider.searchByVector(searchVector, { limit: 2, threshold: 0.2 });
    
    expect(results).toHaveLength(2);
    expect(results[0].path).toBe('/test/vec2.md');
    expect(results[0].score).toBeGreaterThan(0.9); // Should be very similar
    
    await provider.shutdown();
  });
  
  it('should remove documents', async () => {
    await provider.initialize(options);
    
    const doc: DocumentToIndex = {
      id: 'to-remove',
      path: '/test/remove.md',
      content: 'Document to be removed',
      embedding: new Array(768).fill(0.5)
    };
    
    await provider.indexDocument(doc);
    expect((await provider.getStatus()).documentCount).toBe(1);
    
    await provider.removeDocument('to-remove');
    expect((await provider.getStatus()).documentCount).toBe(0);
    
    // Verify it's gone from Qdrant
    const collectionInfo = await qdrantClient.getCollection(testCollectionName);
    expect(collectionInfo.points_count).toBe(0);
    
    await provider.shutdown();
  });
  
  it('should update documents', async () => {
    await provider.initialize(options);
    
    const doc: DocumentToIndex = {
      id: 'to-update',
      path: '/test/update.md',
      content: 'Original content',
      embedding: new Array(768).fill(0.1)
    };
    
    await provider.indexDocument(doc);
    
    // Update with new content and embedding
    const updatedDoc: DocumentToIndex = {
      id: 'to-update',
      path: '/test/update.md',
      content: 'Updated content',
      embedding: new Array(768).fill(0.9)
    };
    
    await provider.updateDocument(updatedDoc);
    
    // Search with vector close to updated embedding
    const results = await provider.searchByVector(new Array(768).fill(0.88) as number[], { limit: 1, threshold: 0.2 });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('to-update');
    expect(results[0].content).toBe('Updated content');
    
    await provider.shutdown();
  });
  
  it('should clear index', async () => {
    await provider.initialize(options);
    
    // Add some documents
    const docs: DocumentToIndex[] = Array.from({ length: 5 }, (_, i) => ({
      id: `clear-${String(i)}`,
      path: `/test/clear${String(i)}.md`,
      content: `Document ${String(i)}`,
      embedding: new Array(768).fill(i * 0.1)
    }));
    
    await provider.indexBatch(docs);
    expect((await provider.getStatus()).documentCount).toBe(5);
    
    // Clear the index
    await provider.clearIndex();
    
    const status = await provider.getStatus();
    expect(status.documentCount).toBe(0);
    expect(status.lastIndexed).toBeUndefined();
    
    // Verify collection was recreated and is empty
    const collectionInfo = await qdrantClient.getCollection(testCollectionName);
    expect(collectionInfo.points_count).toBe(0);
    
    await provider.shutdown();
  });
  
  it('should handle search options correctly', async () => {
    await provider.initialize(options);
    
    // Index documents with varying similarity
    const docs: DocumentToIndex[] = Array.from({ length: 10 }, (_, i) => ({
      id: `opt-${String(i)}`,
      path: `/test/opt${String(i)}.md`,
      content: `Document ${String(i)}`,
      embedding: new Array(768).fill(i * 0.1)
    }));
    
    await provider.indexBatch(docs);
    
    // Search with custom limit
    const searchVector = new Array(768).fill(0.5) as number[];
    const results1 = await provider.searchByVector(searchVector, { limit: 3, threshold: 0.2 });
    expect(results1).toHaveLength(3);
    
    // Search with threshold
    const results2 = await provider.searchByVector(searchVector, { 
      limit: 10,
      threshold: 0.95 
    });
    // Should return fewer results due to high threshold
    expect(results2.length).toBeLessThanOrEqual(3);
    
    await provider.shutdown();
  });
  
  it('should handle batch indexing errors gracefully', async () => {
    await provider.initialize(options);
    
    // Mix valid and invalid documents
    const docs: DocumentToIndex[] = [
      {
        id: 'valid1',
        path: '/test/valid1.md',
        content: 'Valid document',
        embedding: new Array(768).fill(0.1)
      },
      {
        id: 'invalid',
        path: '/test/invalid.md',
        content: 'Invalid document',
        embedding: new Array(100).fill(0.1) // Wrong dimension
      },
      {
        id: 'valid2',
        path: '/test/valid2.md',
        content: 'Another valid document',
        embedding: new Array(768).fill(0.2)
      }
    ];
    
    const result = await provider.indexBatch(docs);
    
    // Depending on how Qdrant handles batch errors, we should see some failures
    // But this test demonstrates handling mixed success/failure
    expect(result.successful + result.failed).toBe(3);
    
    await provider.shutdown();
  });
});