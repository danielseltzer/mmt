import { describe, it, expect, beforeAll, afterEach } from 'vitest';
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

describe('Similarity Search - Persistence', () => {
  let testVaultPath: string;
  let testIndexPath: string;

  beforeAll(async () => {
    await requireOllama();
  });

  afterEach(async () => {
    if (testVaultPath) {
      await cleanupTestVault(testVaultPath);
    }
    if (testIndexPath) {
      await fs.rm(testIndexPath, { recursive: true, force: true });
    }
  });

  it('should persist index to disk and load on restart', async () => {
    // Arrange
    const testDocs = generateTestDocuments().filter(doc => doc.content.trim().length > 0);
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    const indexFilePath = path.join(testIndexPath, 'similarity-index.msp');
    
    // Act - First session: index documents
    let service1 = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        indexFilename: 'similarity-index.msp'
      }
    });
    
    await service1.indexDirectory(testVaultPath, '**/*.md');
    const statusBefore = await service1.getStatus();
    
    // Perform a search to remember results
    const searchBefore = await service1.search('woodworking furniture', { limit: 3 });
    
    // Properly shutdown to ensure persistence
    await service1.shutdown();
    
    // Verify index file was created
    const indexExists = await fs.access(indexFilePath)
      .then(() => true)
      .catch(() => false);
    expect(indexExists).toBe(true);
    
    // Get file size for later comparison
    const indexStats = await fs.stat(indexFilePath);
    expect(indexStats.size).toBeGreaterThan(0);
    
    // Act - Second session: create new service instance
    const service2 = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        indexFilename: 'similarity-index.msp'
      }
    });
    
    // Assert - Status should match
    const statusAfter = await service2.getStatus();
    expect(statusAfter.documentsIndexed).toBe(statusBefore.documentsIndexed);
    expect(statusAfter.indexSize).toBe(indexStats.size);
    
    // Assert - Search should return same results
    const searchAfter = await service2.search('woodworking furniture', { limit: 3 });
    expect(searchAfter).toHaveLength(searchBefore.length);
    expect(searchAfter[0].path).toBe(searchBefore[0].path);
    expect(searchAfter[0].score).toBeCloseTo(searchBefore[0].score, 5);
    
    await service2.shutdown();
  });

  it('should handle missing index file gracefully on startup', async () => {
    // Arrange
    testVaultPath = await createTestVault(generateTestDocuments().slice(0, 3));
    testIndexPath = await createTestIndexPath();
    
    // Ensure index file doesn't exist
    const indexFilePath = path.join(testIndexPath, 'similarity-index.msp');
    await fs.rm(indexFilePath, { force: true }).catch(() => {});
    
    // Act
    const service = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        indexFilename: 'similarity-index.msp'
      }
    });
    
    // Assert - Should start with empty index
    const status = await service.getStatus();
    expect(status.documentsIndexed).toBe(0);
    
    // Should be able to index documents normally
    await service.indexDirectory(testVaultPath, '**/*.md');
    const statusAfterIndex = await service.getStatus();
    expect(statusAfterIndex.documentsIndexed).toBeGreaterThan(0);
    
    await service.shutdown();
  });

  it('should update index file timestamp on modifications', async () => {
    // Arrange
    const testDocs = generateTestDocuments().filter(doc => doc.content.trim().length > 0);
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    const indexFilePath = path.join(testIndexPath, 'similarity-index.msp');
    
    // Act
    const service = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        indexFilename: 'similarity-index.msp'
      }
    });
    
    // Initial indexing
    await service.indexDirectory(testVaultPath, '**/*.md');
    await service.shutdown();
    
    const statsBefore = await fs.stat(indexFilePath);
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Create new service and add a document
    const service2 = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text',
        indexFilename: 'similarity-index.msp'
      }
    });
    
    // Add a new document
    const newDoc = {
      filename: 'new-woodworking-project.md',
      content: 'Building a pine desk with modern design'
    };
    await fs.writeFile(path.join(testVaultPath, newDoc.filename), newDoc.content);
    
    // Re-index to pick up new file
    await service2.indexDirectory(testVaultPath, '**/*.md');
    await service2.shutdown();
    
    // Assert
    const statsAfter = await fs.stat(indexFilePath);
    expect(statsAfter.mtime.getTime()).toBeGreaterThan(statsBefore.mtime.getTime());
    expect(statsAfter.size).not.toBe(statsBefore.size); // Size should change
  });

  it('should maintain index integrity across multiple sessions', async () => {
    // This test verifies that repeated save/load cycles don't corrupt the index
    const testDocs = generateTestDocuments().filter(doc => doc.content.trim().length > 0);
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    
    let expectedDocCount = testDocs.length;
    const testQuery = 'traditional woodworking techniques';
    let previousResults: SearchResult[] = [];
    
    // Perform multiple sessions
    for (let session = 0; session < 3; session++) {
      const service = await createSimilarityService({
        vaultPath: testVaultPath,
        indexPath: testIndexPath,
        similarity: {
          enabled: true,
          ollamaUrl: 'http://localhost:11434',
          model: 'nomic-embed-text',
          indexFilename: 'similarity-index.msp'
        }
      });
      
      if (session === 0) {
        // First session: index everything
        await service.indexDirectory(testVaultPath, '**/*.md');
      }
      
      // Verify document count
      const status = await service.getStatus();
      expect(status.documentsIndexed).toBe(expectedDocCount);
      
      // Perform search
      const results = await service.search(testQuery, { limit: 5 });
      
      if (session > 0) {
        // Results should be consistent across sessions
        expect(results).toHaveLength(previousResults.length);
        expect(results[0].path).toBe(previousResults[0].path);
      }
      
      previousResults = results;
      await service.shutdown();
    }
  });
});

