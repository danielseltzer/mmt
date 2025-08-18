import { describe, it, expect, beforeEach } from 'vitest';
import { MockSimilarityProvider } from '../mock-provider';
import { DocumentToIndex, ProviderInitOptions } from '../types';

describe('MockSimilarityProvider', () => {
  let provider: MockSimilarityProvider;
  const options: ProviderInitOptions = {
    config: {
      provider: 'mock',
      ollamaUrl: 'http://localhost:11434',
      model: 'nomic-embed-text'
    },
    vaultPath: '/test/vault',
    vaultId: 'test-vault'
  };
  
  beforeEach(async () => {
    provider = new MockSimilarityProvider();
    await provider.initialize(options);
  });
  
  it('should initialize and shutdown correctly', async () => {
    expect(provider.name).toBe('mock');
    expect(await provider.isHealthy()).toBe(true);
    
    const status = await provider.getStatus();
    expect(status.ready).toBe(true);
    expect(status.provider).toBe('mock');
    expect(status.documentCount).toBe(0);
    
    await provider.shutdown();
    expect(await provider.isHealthy()).toBe(false);
  });
  
  it('should prevent double initialization', async () => {
    await expect(provider.initialize(options)).rejects.toThrow(
      'Provider mock is already initialized'
    );
  });
  
  it('should index and retrieve documents', async () => {
    const doc: DocumentToIndex = {
      id: 'doc1',
      path: '/test/doc1.md',
      content: 'This is a test document about TypeScript',
      metadata: { tags: ['test'] }
    };
    
    await provider.indexDocument(doc);
    
    const status = await provider.getStatus();
    expect(status.documentCount).toBe(1);
    expect(status.lastIndexed).toBeInstanceOf(Date);
  });
  
  it('should batch index documents', async () => {
    const docs: DocumentToIndex[] = [
      {
        id: 'doc1',
        path: '/test/doc1.md',
        content: 'First document'
      },
      {
        id: 'doc2',
        path: '/test/doc2.md',
        content: 'Second document'
      },
      {
        id: 'doc3',
        path: '/test/doc3.md',
        content: 'Third document'
      }
    ];
    
    const result = await provider.indexBatch(docs);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
    
    const status = await provider.getStatus();
    expect(status.documentCount).toBe(3);
  });
  
  it('should search documents by text', async () => {
    const docs: DocumentToIndex[] = [
      {
        id: 'doc1',
        path: '/test/doc1.md',
        content: 'TypeScript is a programming language'
      },
      {
        id: 'doc2',
        path: '/test/doc2.md',
        content: 'JavaScript is also a programming language'
      },
      {
        id: 'doc3',
        path: '/test/doc3.md',
        content: 'Python is different'
      }
    ];
    
    await provider.indexBatch(docs);
    
    const results = await provider.search('typescript', { limit: 2 });
    expect(results).toHaveLength(2);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[0].path).toBe('/test/doc1.md');
  });
  
  it('should respect search options', async () => {
    const docs: DocumentToIndex[] = Array.from({ length: 20 }, (_, i) => ({
      id: `doc${i}`,
      path: `/test/doc${i}.md`,
      content: `Document ${i} content`
    }));
    
    await provider.indexBatch(docs);
    
    // Test limit
    const results1 = await provider.search('document', { limit: 5 });
    expect(results1).toHaveLength(5);
    
    // Test threshold
    const results2 = await provider.search('nonexistent', { threshold: 0.5 });
    expect(results2).toHaveLength(0);
  });
  
  it('should remove documents', async () => {
    const doc: DocumentToIndex = {
      id: 'doc1',
      path: '/test/doc1.md',
      content: 'Test document'
    };
    
    await provider.indexDocument(doc);
    expect((await provider.getStatus()).documentCount).toBe(1);
    
    await provider.removeDocument('doc1');
    expect((await provider.getStatus()).documentCount).toBe(0);
  });
  
  it('should update documents', async () => {
    const doc: DocumentToIndex = {
      id: 'doc1',
      path: '/test/doc1.md',
      content: 'Original content'
    };
    
    await provider.indexDocument(doc);
    
    const updatedDoc: DocumentToIndex = {
      ...doc,
      content: 'Updated content'
    };
    
    await provider.updateDocument(updatedDoc);
    
    const results = await provider.search('updated');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('doc1');
  });
  
  it('should clear index', async () => {
    const docs: DocumentToIndex[] = Array.from({ length: 5 }, (_, i) => ({
      id: `doc${i}`,
      path: `/test/doc${i}.md`,
      content: `Document ${i}`
    }));
    
    await provider.indexBatch(docs);
    expect((await provider.getStatus()).documentCount).toBe(5);
    
    await provider.clearIndex();
    expect((await provider.getStatus()).documentCount).toBe(0);
    expect((await provider.getStatus()).lastIndexed).toBeUndefined();
  });
  
  it('should generate mock embeddings', async () => {
    const embedding = await provider.generateEmbedding('test text');
    expect(embedding).toHaveLength(768);
    expect(embedding.every(v => v === 0)).toBe(true);
  });
  
  it('should search by vector', async () => {
    const docs: DocumentToIndex[] = [
      {
        id: 'doc1',
        path: '/test/doc1.md',
        content: 'Test document',
        embedding: new Array(768).fill(0)
      }
    ];
    
    await provider.indexBatch(docs);
    
    const vector = new Array(768).fill(0);
    const results = await provider.searchByVector(vector, { limit: 1 });
    expect(results).toHaveLength(1);
  });
});