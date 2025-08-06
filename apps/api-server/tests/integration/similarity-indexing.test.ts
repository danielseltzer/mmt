import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import {
  requireOllama,
  createTestVault,
  cleanupTestVault,
  createTestIndexPath,
  generateTestDocuments,
  parseErrorLog
} from '../helpers/similarity-test-helpers';
import { createSimilarityService } from './similarity-test-factory.js';

// Interface for our similarity search service
// We define what we expect without looking at implementation
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

describe('Similarity Search - Basic Indexing', () => {
  let testVaultPath: string;
  let testIndexPath: string;
  let similarityService: SimilaritySearchService;

  beforeAll(async () => {
    // Ensure Ollama is available before running any tests
    await requireOllama();
  });

  afterEach(async () => {
    // Cleanup
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

  it('should index a small set of markdown files and report correct counts', async () => {
    // Arrange
    const testDocs = generateTestDocuments();
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    
    // Count non-empty documents
    const expectedIndexedCount = testDocs.filter(doc => doc.content.trim().length > 0).length;
    const emptyDocCount = testDocs.filter(doc => doc.content.trim().length === 0).length;
    
    // Act
    similarityService = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text'
      }
    });
    
    const result = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert
    expect(result.totalDocuments).toBe(testDocs.length);
    expect(result.successfullyIndexed).toBe(expectedIndexedCount);
    expect(result.failed).toBe(emptyDocCount);
    expect(result.errors).toHaveLength(emptyDocCount);
    
    // Verify empty documents were logged as errors
    const emptyDocErrors = result.errors.filter(e => 
      e.error.toLowerCase().includes('empty') || 
      e.error.toLowerCase().includes('whitespace')
    );
    expect(emptyDocErrors).toHaveLength(emptyDocCount);
  });

  it('should create an error log file in project root with indexing failures', async () => {
    // Arrange
    const testDocs = generateTestDocuments();
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    
    // Act
    similarityService = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:11434',
        model: 'nomic-embed-text'
      }
    });
    
    const result = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert
    expect(result.errorLogPath).toBeDefined();
    expect(result.errorLogPath).toMatch(/similarity-errors-\d{4}-\d{2}-\d{2}-\d{6}\.log$/);
    
    // Verify error log exists and contains expected content
    const errorLogExists = await fs.access(result.errorLogPath!)
      .then(() => true)
      .catch(() => false);
    expect(errorLogExists).toBe(true);
    
    // Parse and verify error log content
    const errorLog = await parseErrorLog(result.errorLogPath!);
    expect(errorLog.summary.totalDocuments).toBe(testDocs.length);
    expect(errorLog.summary.failed).toBe(result.failed);
    expect(errorLog.errors).toHaveLength(result.failed);
  });

  it('should handle missing Ollama gracefully with clear error message', async () => {
    // Arrange
    const testDocs = generateTestDocuments().slice(0, 3); // Just a few docs
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    
    // Act & Assert
    similarityService = await createSimilarityService({
      vaultPath: testVaultPath,
      indexPath: testIndexPath,
      similarity: {
        enabled: true,
        ollamaUrl: 'http://localhost:99999', // Wrong port
        model: 'nomic-embed-text'
      }
    });
    
    // Indexing should fail with clear error about Ollama
    await expect(similarityService.indexDirectory(testVaultPath, '**/*.md'))
      .rejects
      .toThrow(/Ollama.*not available|not running|connection failed/i);
  });

  it('should provide accurate status information after indexing', async () => {
    // Arrange
    const testDocs = generateTestDocuments().filter(doc => doc.content.trim().length > 0);
    testVaultPath = await createTestVault(testDocs);
    testIndexPath = await createTestIndexPath();
    
    // Act
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
    const status = await similarityService.getStatus();
    
    // Assert
    expect(status.documentsIndexed).toBe(testDocs.length);
    expect(status.indexSize).toBeGreaterThan(0);
    expect(status.lastUpdated).toBeInstanceOf(Date);
  });

  it('should perform basic similarity search on indexed documents', async () => {
    // Arrange
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
    
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Act - Search for woodworking content
    const results = await similarityService.search(
      'building furniture with wood and traditional joinery',
      { limit: 5 }
    );
    
    // Assert
    expect(results).toHaveLength(5);
    expect(results[0].score).toBeGreaterThan(0);
    
    // Woodworking documents should appear in top results
    const topResultFilenames = results.map(r => path.basename(r.path));
    const woodworkingDocs = testDocs
      .filter(doc => doc.topic === 'woodworking')
      .map(doc => doc.filename);
    
    // At least 2 woodworking docs should be in top 5 results
    const woodworkingInTop5 = topResultFilenames.filter(name => 
      woodworkingDocs.includes(name)
    ).length;
    expect(woodworkingInTop5).toBeGreaterThanOrEqual(2);
  });
});

