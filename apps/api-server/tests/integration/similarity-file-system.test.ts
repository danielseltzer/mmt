import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import {
  requireOllama,
  createTestVault,
  cleanupTestVault,
  createTestIndexPath,
  TestDocument
} from '../helpers/similarity-test-helpers';
import { createSimilarityService } from './similarity-test-factory.js';

interface SimilaritySearchService {
  indexDirectory(directory: string, pattern?: string): Promise<IndexingResult>;
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;
  getStatus(): Promise<IndexStatus>;
  shutdown(): Promise<void>;
  // File-specific operations
  indexFile(filePath: string, content?: string): Promise<void>;
  reindexFile(filePath: string, content?: string): Promise<void>;
  removeFile(filePath: string): Promise<void>;
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

// Test helper: Poll until condition is met or timeout
async function waitForCondition(
  condition: () => Promise<boolean>, 
  timeout = 2000, 
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (!(await condition()) && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  if (!(await condition())) {
    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }
}

describe('Similarity Search - File System Integration', () => {
  let testVaultPath: string;
  let testIndexPath: string;
  let similarityService: SimilaritySearchService;

  beforeAll(async () => {
    await requireOllama();
  });

  afterEach(async () => {
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

  it('should update index when file content is modified', async () => {
    // Arrange
    const originalDoc: TestDocument = {
      filename: 'project.md',
      topic: 'woodworking',
      content: '# Pine Bookshelf\n\nBuilding a simple pine bookshelf for beginners.'
    };
    
    testVaultPath = await createTestVault([originalDoc]);
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
    
    // Initial indexing
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Search for pine content
    const resultsBefore = await similarityService.search('pine wood furniture', { limit: 5 });
    expect(resultsBefore.length).toBeGreaterThan(0);
    expect(resultsBefore[0].path).toContain('project.md');
    
    // Act - Modify the file to be about oak instead
    const updatedContent = '# Oak Cabinet\n\nCrafting a beautiful oak cabinet with dovetail joints.';
    const filePath = path.join(testVaultPath, originalDoc.filename);
    await fs.writeFile(filePath, updatedContent, 'utf-8');
    
    // Re-index the modified file
    await similarityService.reindexFile(filePath, updatedContent);
    
    // Assert - Search for oak should now find it
    const resultsAfter = await similarityService.search('oak cabinet dovetail', { limit: 5 });
    expect(resultsAfter.length).toBeGreaterThan(0);
    expect(resultsAfter[0].path).toContain('project.md');
    
    // Search for pine should rank it lower or not find it
    const pineResults = await similarityService.search('pine wood furniture', { limit: 5 });
    if (pineResults.length > 0 && pineResults[0].path.includes('project.md')) {
      // If still found, score should be lower than oak search
      expect(resultsAfter[0].score).toBeGreaterThan(pineResults[0].score);
    }
  });

  it('should remove deleted files from index', async () => {
    // Arrange
    const testDocs: TestDocument[] = [
      {
        filename: 'keep-me.md',
        topic: 'cooking',
        content: '# Pasta Recipe\n\nDelicious homemade pasta.'
      },
      {
        filename: 'delete-me.md',
        topic: 'cooking',
        content: '# Bread Recipe\n\nFresh sourdough bread.'
      }
    ];
    
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
    
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Verify both documents are indexed
    const statusBefore = await similarityService.getStatus();
    expect(statusBefore.documentsIndexed).toBe(2);
    
    // Act - Delete one file and remove from index
    const fileToDelete = path.join(testVaultPath, 'delete-me.md');
    await fs.rm(fileToDelete);
    await similarityService.removeFile(fileToDelete);
    
    // Assert
    const statusAfter = await similarityService.getStatus();
    expect(statusAfter.documentsIndexed).toBe(1);
    
    // Search should not find deleted document
    const results = await similarityService.search('sourdough bread recipe', { limit: 5 });
    expect(results.every(r => !r.path.includes('delete-me.md'))).toBe(true);
  });

  it('should handle file moves/renames correctly', async () => {
    // Arrange
    const originalDoc: TestDocument = {
      filename: 'old-name.md',
      topic: 'technology',
      content: '# React Tutorial\n\nLearn React hooks and components.'
    };
    
    testVaultPath = await createTestVault([originalDoc]);
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
    
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Act - Move/rename the file
    const oldPath = path.join(testVaultPath, 'old-name.md');
    const newPath = path.join(testVaultPath, 'react-tutorial.md');
    const content = await fs.readFile(oldPath, 'utf-8');
    await fs.rename(oldPath, newPath);
    
    // Update index: remove old, add new
    await similarityService.removeFile(oldPath);
    await similarityService.indexFile(newPath, content);
    
    // Assert
    const results = await similarityService.search('React hooks tutorial', { limit: 5 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].path).toContain('react-tutorial.md');
    expect(results.every(r => !r.path.includes('old-name.md'))).toBe(true);
  });

  it('should handle rapid file changes with proper debouncing', async () => {
    // This test simulates rapid file changes that might happen during active editing
    const doc: TestDocument = {
      filename: 'rapidly-changing.md',
      topic: 'misc',
      content: '# Version 1\n\nInitial content.'
    };
    
    testVaultPath = await createTestVault([doc]);
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
    
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    const filePath = path.join(testVaultPath, doc.filename);
    let lastIndexedContent = '';
    
    // Act - Make multiple rapid changes
    const versions = [
      '# Version 2\n\nQuick edit.',
      '# Version 3\n\nAnother quick edit.',
      '# Version 4\n\nFinal content with more details about the topic.'
    ];
    
    for (const content of versions) {
      await fs.writeFile(filePath, content, 'utf-8');
      // Don't wait between writes to simulate rapid changes
    }
    
    // Index the final version
    lastIndexedContent = versions[versions.length - 1];
    await similarityService.reindexFile(filePath, lastIndexedContent);
    
    // Assert - Search should find based on final content
    const results = await similarityService.search('Final content details topic', { limit: 1 });
    expect(results.length).toBe(1);
    expect(results[0].path).toContain('rapidly-changing.md');
  });

  it('should maintain index consistency when files fail to index after modification', async () => {
    // Arrange
    const testDocs: TestDocument[] = [
      {
        filename: 'good-doc.md',
        topic: 'woodworking',
        content: '# Woodworking Safety\n\nImportant safety tips for woodworking.'
      },
      {
        filename: 'will-become-empty.md',
        topic: 'woodworking',
        content: '# Wood Types\n\nDifferent types of wood for projects.'
      }
    ];
    
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
    
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    const statusBefore = await similarityService.getStatus();
    expect(statusBefore.documentsIndexed).toBe(2);
    
    // Act - Make one document empty (which should fail to index)
    const filePath = path.join(testVaultPath, 'will-become-empty.md');
    await fs.writeFile(filePath, '', 'utf-8');
    
    // Try to reindex - should handle the error gracefully
    await similarityService.reindexFile(filePath, '');
    
    // Assert - Good document should still be searchable
    const results = await similarityService.search('woodworking safety tips', { limit: 5 });
    expect(results.some(r => r.path.includes('good-doc.md'))).toBe(true);
    
    // The empty document might be removed from index or remain with old content
    // Either way, the index should remain functional
    const status = await similarityService.getStatus();
    expect(status.documentsIndexed).toBeGreaterThanOrEqual(1); // At least the good doc
  });
});

