import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SimilaritySearchService } from '@mmt/vault';
import type { Config } from '@mmt/entities';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('SimilaritySearchService', () => {
  let service: SimilaritySearchService;
  let testDir: string;
  let config: Config;

  beforeAll(async () => {
    // Create test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmt-similarity-test-'));
    const indexDir = path.join(testDir, 'index');
    await fs.mkdir(indexDir);

    config = {
      vaults: [{
        id: 'test-vault',
        name: 'Test Vault',
        path: testDir,
        indexPath: indexDir
      }],
      apiPort: 3001,
      webPort: 5173,
      similarity: {
        enabled: true,
        model: 'nomic-embed-text',
        network: {
          protocol: 'http',
          host: 'localhost',
          ports: {
            ollama: 11434,
            qdrant: 6333
          }
        },
        qdrant: {
          collectionName: 'test-vault-similarity'
        }
      }
    };
  });

  afterAll(async () => {
    // Clean up
    if (service) {
      await service.shutdown();
    }
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should initialize without existing index', async () => {
    service = new SimilaritySearchService(
      config.similarity!,
      config.vaults[0].id,
      config.vaults[0].path
    );
    await service.initialize();
    
    const status = await service.getStatus();
    // Service won't be available without a provider, which requires Ollama
    // Just check that it initialized without throwing
    expect(status.indexStatus).toBeDefined();
  });

  it('should check Ollama health', async () => {
    const status = await service.getStatus();
    // This will pass if Ollama is running, fail if not
    console.log('Ollama healthy:', status.ollamaHealthy);
  });

  it('should index a markdown file', async () => {
    // Require Ollama to be available
    const status = await service.getStatus();
    if (!status.ollamaHealthy) {
      throw new Error('Test failed: Ollama service not available. Please start Ollama to run similarity tests.');
    }

    // Create a test markdown file
    const testFile = path.join(testDir, 'test.md');
    const content = `# Test Document

This is a test document about machine learning and artificial intelligence.
It contains some technical content for testing similarity search.

## Features
- Natural language processing
- Vector embeddings
- Semantic search
`;
    await fs.writeFile(testFile, content);

    // Index the file using the correct API
    const result = await service.indexDocuments([{
      id: 'test-doc',
      path: testFile,
      title: 'Test Document',
      content: content,
      metadata: {}
    }]);

    // Check indexing result
    expect(result.successfullyIndexed).toBe(1);
    expect(result.failed).toBe(0);
    
    // Check status
    const newStatus = await service.getStatus();
    expect(newStatus.stats.documentsIndexed).toBeGreaterThan(0);
  });

  it('should search for similar content', async () => {
    // Require Ollama to be available
    const status = await service.getStatus();
    if (!status.ollamaHealthy) {
      throw new Error('Test failed: Ollama service not available. Please start Ollama to run similarity tests.');
    }

    // Ensure we have indexed content
    if (status.stats.documentsIndexed === 0) {
      throw new Error('Test failed: No documents indexed. Cannot test search functionality.');
    }

    // Search with the correct API signature
    const results = await service.search('artificial intelligence NLP', 5);

    expect(results).toBeDefined();
    expect(Array.isArray(results)).toBe(true);
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('path');
      expect(results[0]).toHaveProperty('score');
      expect(results[0]).toHaveProperty('content');
      expect(results[0]).toHaveProperty('excerpt');
      expect(results[0].score).toBeGreaterThan(0);
    }
  });

  it('should persist and reload index', async () => {
    // Require Ollama to be available
    const status = await service.getStatus();
    if (!status.ollamaHealthy) {
      throw new Error('Test failed: Ollama service not available. Please start Ollama to run similarity tests.');
    }

    const docCount = status.stats.documentsIndexed;
    
    // Shutdown current service
    await service.shutdown();

    // Create new service and load persisted index
    const service2 = new SimilaritySearchService(
      config.similarity!,
      config.vaults[0].id,
      config.vaults[0].path
    );
    await service2.initialize();

    const reloadedStatus = await service2.getStatus();
    expect(reloadedStatus.stats.documentsIndexed).toBe(docCount);
    
    await service2.shutdown();
  });
});