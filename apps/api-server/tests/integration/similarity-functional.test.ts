import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SimilaritySearchService } from '@mmt/vault';
import type { Config } from '@mmt/entities';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

describe('Similarity Search Functionality', () => {
  let service: SimilaritySearchService;
  let testDir: string;
  let config: Config;
  
  const testDocuments = [
    {
      name: 'ml-intro.md',
      content: `# Introduction to Machine Learning

Machine learning is a subset of artificial intelligence that focuses on
building systems that learn from data. Common algorithms include neural networks,
decision trees, and support vector machines.

## Key Concepts
- Supervised learning
- Unsupervised learning
- Reinforcement learning
- Deep learning with neural networks`
    },
    {
      name: 'ml-deep-learning.md',
      content: `# Deep Learning and Neural Networks

Deep learning uses multi-layered neural networks to learn representations.
Transformers and attention mechanisms have revolutionized NLP and computer vision.

## Modern Architectures
- Convolutional Neural Networks (CNNs)
- Recurrent Neural Networks (RNNs)
- Transformer models
- Generative Adversarial Networks (GANs)`
    },
    {
      name: 'cooking-pasta.md',
      content: `# Italian Pasta Recipe

This traditional pasta recipe uses fresh tomatoes, basil, and garlic.
Cook the pasta al dente and toss with olive oil.

## Ingredients
- Fresh pasta
- San Marzano tomatoes
- Fresh basil leaves
- Extra virgin olive oil
- Garlic cloves`
    },
    {
      name: 'travel-paris.md',
      content: `# Planning a Trip to Paris

Paris, the City of Light, offers incredible museums, restaurants, and architecture.
Visit the Eiffel Tower, Louvre Museum, and enjoy French cuisine.

## Must-See Attractions
- Eiffel Tower
- Louvre Museum
- Notre-Dame Cathedral
- Champs-Élysées
- Montmartre district`
    },
    {
      name: 'empty.md',
      content: ''
    },
    {
      name: 'whitespace.md',
      content: '   \n\n   \t   \n   '
    }
  ];

  beforeAll(async () => {
    // Require Ollama to be available
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) {
        throw new Error('Test failed: Ollama service returned non-OK status at http://localhost:11434');
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Test failed:')) {
        throw error;
      }
      throw new Error('Test failed: Ollama service not available at http://localhost:11434. Please start Ollama to run similarity tests.');
    }
    
    // Create test directory and documents
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mmt-similarity-test-'));
    const indexDir = path.join(testDir, 'index');
    await fs.mkdir(indexDir);
    
    // Write test documents
    for (const doc of testDocuments) {
      await fs.writeFile(path.join(testDir, doc.name), doc.content);
    }

    config = {
      vaults: [{
        name: 'TestVault',
        path: testDir,
        indexPath: indexDir
      }],
      apiPort: 3001,
      webPort: 5173,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text'
      }
    } as Config;
    
    service = new SimilaritySearchService(config);
    await service.initialize();
  });

  afterAll(async () => {
    if (service) {
      await service.shutdown();
    }
    if (testDir) {
      await fs.rm(testDir, { recursive: true, force: true });
    }
  });

  it('should index documents and handle empty ones gracefully', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    await service.indexDirectory(testDir);
    const errors = service.getIndexingErrors();
    
    // Should have errors for empty documents
    expect(errors.length).toBe(2);
    expect(errors.some(e => e.path.includes('empty.md'))).toBe(true);
    expect(errors.some(e => e.path.includes('whitespace.md'))).toBe(true);
    expect(errors.every(e => e.error.includes('Empty document'))).toBe(true);
    
    // Should have indexed the non-empty documents
    const status = await service.getStatus();
    expect(status.stats.documentsIndexed).toBe(4); // 6 total - 2 empty = 4
  });

  it('should find similar ML documents when searching for ML terms', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    const results = await service.search('neural networks artificial intelligence machine learning', {
      limit: 5,
      includeExcerpt: true
    });
    
    expect(results.length).toBeGreaterThan(0);
    
    // Both ML documents should be in top results
    const paths = results.map(r => path.basename(r.path));
    const topTwo = paths.slice(0, 2);
    
    expect(topTwo).toContain('ml-intro.md');
    expect(topTwo).toContain('ml-deep-learning.md');
    
    // Non-ML documents should not be in top 2
    expect(topTwo).not.toContain('cooking-pasta.md');
    expect(topTwo).not.toContain('travel-paris.md');
    
    // Scores should be meaningful (similarity scores are typically 0-1)
    expect(results[0].score).toBeGreaterThan(0.5);
    if (results.length > 2) {
      expect(results[0].score).toBeGreaterThan(results[2].score);
    }
  });

  it('should find cooking document when searching for recipes', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    const results = await service.search('pasta recipe italian cooking tomatoes basil', { limit: 3 });
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path).toContain('cooking-pasta.md');
    expect(results[0].score).toBeGreaterThan(0.5);
    
    // ML documents should score lower
    const mlDocs = results.filter(r => r.path.includes('ml-'));
    if (mlDocs.length > 0) {
      expect(mlDocs[0].score).toBeLessThan(results[0].score);
    }
  });

  it('should find travel document when searching for Paris', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    const results = await service.search('Paris France Eiffel Tower tourist attractions museums', { limit: 3 });
    
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path).toContain('travel-paris.md');
    expect(results[0].score).toBeGreaterThan(0.5);
  });

  it('should handle search for non-existent content gracefully', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    const results = await service.search('quantum computing blockchain cryptocurrency', { limit: 5 });
    
    // Should return results even if not closely related
    expect(Array.isArray(results)).toBe(true);
    
    // Scores should be lower for unrelated content
    if (results.length > 0) {
      expect(results[0].score).toBeLessThan(0.7);
    }
  });

  it('should return excerpts when requested', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    const results = await service.search('machine learning', {
      limit: 2,
      includeExcerpt: true
    });
    
    expect(results.length).toBeGreaterThan(0);
    results.forEach(result => {
      expect(result.excerpt).toBeDefined();
      expect(typeof result.excerpt).toBe('string');
      expect(result.excerpt!.length).toBeGreaterThan(0);
      expect(result.excerpt!.length).toBeLessThanOrEqual(203); // 200 + '...'
    });
  });

  it('should persist and reload index correctly', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    const initialStatus = await service.getStatus();
    const docCount = initialStatus.stats.documentsIndexed;
    
    // Create a new service instance to test loading
    const service2 = new SimilaritySearchService(config);
    await service2.initialize();
    
    const reloadedStatus = await service2.getStatus();
    expect(reloadedStatus.stats.documentsIndexed).toBe(docCount);
    
    // Search should work on reloaded index
    const results = await service2.search('machine learning', { limit: 2 });
    expect(results.length).toBeGreaterThan(0);
    
    await service2.shutdown();
  });

  it('should report indexing progress correctly', async () => {
    if (!service) {
      throw new Error('Test failed: Service not initialized. Ollama is required for these tests.');
    }
    
    // Clear any existing index
    service.clearIndexingErrors();
    
    let progressUpdates = 0;
    let lastProgress = 0;
    
    service.on('progress', (progress) => {
      progressUpdates++;
      expect(progress.percentage).toBeGreaterThanOrEqual(lastProgress);
      lastProgress = progress.percentage;
      expect(progress.current).toBeLessThanOrEqual(progress.total);
    });
    
    await service.indexDirectory(testDir);
    
    expect(progressUpdates).toBeGreaterThan(0);
    expect(lastProgress).toBe(100);
  });
});