import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import {
  requireOllama,
  createTestVault,
  cleanupTestVault,
  createTestIndexPath,
  generateTestDocuments
} from '../helpers/similarity-test-helpers';
import { createSimilarityService } from './similarity-test-factory.js';

interface SimilaritySearchService {
  indexDirectory(directory: string, pattern?: string): Promise<IndexingResult>;
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;
  getStatus(): Promise<IndexStatus>;
  shutdown(): Promise<void>;
}

interface IndexingResult {
  totalDocuments: number;
  successfullyIndexed: number;
  failed: number;
  errors: Array<{ path: string; error: string }>;
  errorLogPath?: string;
}

interface SearchResult {
  path: string;
  score: number;
  content?: string;
}

interface IndexStatus {
  documentsIndexed: number;
  indexSize: number;
  lastUpdated?: Date;
}

describe('Similarity Search - Smoke Tests', () => {
  let testVaultPath: string;
  let testIndexPath: string;
  let similarityService: SimilaritySearchService;

  beforeAll(async () => {
    await requireOllama();
    
    // Setup once for all smoke tests
    const testDocs = generateTestDocuments().filter(doc => doc.content.trim().length > 0);
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    
    similarityService = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text'
      }
    });
    
    // Index all documents once
    const result = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    console.log(`Indexed ${result.successfullyIndexed} documents for smoke tests`);
  });

  afterAll(async () => {
    if (similarityService) {
      await similarityService.shutdown();
    }
    if (testVaultPath) {
      await cleanupTestVault(testVaultPath);
    }
    if (testIndexPath) {
      await fs.rm(testIndexPath, { recursive: true, force: true });
    }
  });

  it('should find woodworking documents when searching for woodworking content', async () => {
    // Search for woodworking content
    const results = await similarityService.search(
      'building furniture with wood joinery techniques',
      { limit: 5 }
    );
    
    // Assert
    expect(results.length).toBeGreaterThan(0);
    
    // At least one woodworking document should be in top 5
    const woodworkingFiles = ['oak-bookshelf-project.md', 'walnut-cutting-board.md', 'dovetail-joints-guide.md'];
    const foundWoodworking = results.filter(r => 
      woodworkingFiles.some(file => r.path.includes(file))
    );
    
    expect(foundWoodworking.length).toBeGreaterThanOrEqual(1);
    console.log(`Found ${foundWoodworking.length} woodworking documents in top 5 results`);
  });

  it('should find cooking documents when searching for cooking content', async () => {
    // Search for cooking/recipe content
    const results = await similarityService.search(
      'cooking recipe ingredients pasta bread',
      { limit: 5 }
    );
    
    // Assert
    expect(results.length).toBeGreaterThan(0);
    
    // At least one cooking document should be in top 5
    const cookingFiles = ['sourdough-bread-recipe.md', 'pasta-carbonara.md', 'thai-green-curry.md'];
    const foundCooking = results.filter(r => 
      cookingFiles.some(file => r.path.includes(file))
    );
    
    expect(foundCooking.length).toBeGreaterThanOrEqual(1);
    console.log(`Found ${foundCooking.length} cooking documents in top 5 results`);
  });

  it('should find technology documents when searching for tech content', async () => {
    // Search for technology/programming content
    const results = await similarityService.search(
      'React hooks Docker containers development',
      { limit: 5 }
    );
    
    // Assert
    expect(results.length).toBeGreaterThan(0);
    
    // At least one technology document should be in top 5
    const techFiles = ['react-hooks-guide.md', 'docker-compose-tutorial.md'];
    const foundTech = results.filter(r => 
      techFiles.some(file => r.path.includes(file))
    );
    
    expect(foundTech.length).toBeGreaterThanOrEqual(1);
    console.log(`Found ${foundTech.length} technology documents in top 5 results`);
  });

  it('should rank similar documents higher than dissimilar ones', async () => {
    // Search specifically for dovetail joints (woodworking)
    const results = await similarityService.search(
      'dovetail joints hand cut woodworking',
      { limit: 10 }
    );
    
    expect(results.length).toBeGreaterThan(0);
    
    // Find positions of different document types
    let dovetailPosition = -1;
    let otherWoodworkingPosition = -1;
    let cookingPosition = -1;
    
    results.forEach((result, index) => {
      if (result.path.includes('dovetail-joints-guide.md') && dovetailPosition === -1) {
        dovetailPosition = index;
      } else if (result.path.includes('oak-bookshelf-project.md') && otherWoodworkingPosition === -1) {
        otherWoodworkingPosition = index;
      } else if (result.path.includes('pasta-carbonara.md') && cookingPosition === -1) {
        cookingPosition = index;
      }
    });
    
    // Dovetail guide should be found and ranked high
    expect(dovetailPosition).toBeGreaterThanOrEqual(0);
    expect(dovetailPosition).toBeLessThan(3); // Should be in top 3
    
    // Other woodworking should rank higher than cooking (if both found)
    if (otherWoodworkingPosition >= 0 && cookingPosition >= 0) {
      expect(otherWoodworkingPosition).toBeLessThan(cookingPosition);
    }
  });

  it('should return consistent results for the same query', async () => {
    const query = 'traditional furniture making with hand tools';
    
    // Run the same search multiple times
    const results1 = await similarityService.search(query, { limit: 5 });
    const results2 = await similarityService.search(query, { limit: 5 });
    
    // Results should be consistent
    expect(results1.length).toBe(results2.length);
    
    // Top result should be the same
    if (results1.length > 0 && results2.length > 0) {
      expect(results1[0].path).toBe(results2[0].path);
      expect(results1[0].score).toBeCloseTo(results2[0].score, 5);
    }
  });

  it('should handle queries that span multiple topics', async () => {
    // Query that could match both woodworking and cooking (tools/techniques)
    const results = await similarityService.search(
      'traditional techniques and tools for crafting',
      { limit: 10 }
    );
    
    expect(results.length).toBeGreaterThan(0);
    
    // Should find documents from multiple topics
    const topics = new Set<string>();
    const testDocs = generateTestDocuments();
    
    results.forEach(result => {
      const doc = testDocs.find(d => result.path.includes(d.filename));
      if (doc) {
        topics.add(doc.topic);
      }
    });
    
    // Should have found documents from at least 2 different topics
    expect(topics.size).toBeGreaterThanOrEqual(2);
    console.log(`Query matched documents from topics: ${Array.from(topics).join(', ')}`);
  });

  it('should handle very specific queries gracefully', async () => {
    // Very specific query that might not match well
    const results = await similarityService.search(
      'quantum computing algorithms for woodworking optimization',
      { limit: 5 }
    );
    
    // Should still return some results (best matches available)
    expect(results.length).toBeGreaterThan(0);
    
    // Results should have scores (even if low)
    results.forEach(result => {
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });
  });
});

