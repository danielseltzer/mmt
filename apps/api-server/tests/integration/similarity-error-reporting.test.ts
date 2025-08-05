import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import {
  requireOllama,
  createTestVault,
  cleanupTestVault,
  createTestIndexPath,
  parseErrorLog,
  TestDocument
} from '../helpers/similarity-test-helpers';
import { createSimilarityService } from './similarity-test-factory.js';

interface SimilaritySearchService {
  indexDirectory(directory: string, pattern?: string): Promise<IndexingResult>;
  search(query: string, options?: { limit?: number }): Promise<SearchResult[]>;
  getStatus(): Promise<IndexStatus>;
  shutdown(): Promise<void>;
  getIndexingErrors(): Array<{ path: string; error: string }>;
  clearIndexingErrors(): void;
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

describe('Similarity Search - Error Reporting and Visibility', () => {
  let testVaultPath: string;
  let testIndexPath: string;
  let similarityService: SimilaritySearchService;
  let consoleErrorSpy: any;
  let consoleWarnSpy: any;
  let consoleLogSpy: any;

  beforeAll(async () => {
    await requireOllama();
  });

  beforeEach(() => {
    // Spy on console methods to verify error visibility
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Restore console methods
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    
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

  it('should log errors to console at ERROR level for failed documents', async () => {
    // Arrange
    const testDocs: TestDocument[] = [
      {
        filename: 'good.md',
        topic: 'test',
        content: '# Good Document\n\nThis should index successfully.'
      },
      {
        filename: 'empty.md',
        topic: 'empty',
        content: ''
      },
      {
        filename: 'whitespace.md',
        topic: 'empty',
        content: '   \n\t  '
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
    
    // Act
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert - Console errors should be logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Should have logged errors for empty documents
    const errorCalls = consoleErrorSpy.mock.calls;
    const errorMessages = errorCalls.map(call => call.join(' ')).join('\n');
    
    expect(errorMessages).toMatch(/empty\.md/);
    expect(errorMessages).toMatch(/whitespace\.md/);
    expect(errorMessages).toMatch(/empty|whitespace/i);
  });

  it('should create timestamped error log file in project root', async () => {
    // Arrange
    const testDocs: TestDocument[] = [
      {
        filename: 'success1.md',
        topic: 'test',
        content: '# Document 1\n\nSuccessful document.'
      },
      {
        filename: 'empty-fail.md',
        topic: 'empty',
        content: ''
      },
      {
        filename: 'success2.md',
        topic: 'test',
        content: '# Document 2\n\nAnother successful document.'
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
    
    // Act
    const result = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert
    expect(result.errorLogPath).toBeDefined();
    
    // Verify filename format
    const errorLogFilename = path.basename(result.errorLogPath!);
    expect(errorLogFilename).toMatch(/^similarity-errors-\d{4}-\d{2}-\d{2}-\d{6}\.log$/);
    
    // Verify it's in project root (or configured location)
    const errorLogDir = path.dirname(result.errorLogPath!);
    // Should be in a reasonable location (not in temp directory)
    expect(errorLogDir).not.toContain('tmp');
    
    // Verify file exists and has correct content
    const logContent = await fs.readFile(result.errorLogPath!, 'utf-8');
    expect(logContent).toContain('SIMILARITY SEARCH INDEXING REPORT');
    expect(logContent).toContain('Total documents: 3');
    expect(logContent).toContain('Successfully indexed: 2');
    expect(logContent).toContain('Failed: 1');
    expect(logContent).toContain('Success rate: 66.67%'); // 2/3 = 66.67%
    expect(logContent).toContain('empty-fail.md');
  });

  it('should provide detailed error information for debugging', async () => {
    // Arrange - Create a document that will fail in a specific way
    const problematicDoc: TestDocument = {
      filename: 'problematic.md',
      topic: 'test',
      content: '' // Empty content will cause a specific error
    };
    
    testVaultPath = await createTestVault([problematicDoc]);
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
    
    // Act
    const result = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert - Error should include enough info for debugging
    expect(result.errors).toHaveLength(1);
    const error = result.errors[0];
    
    expect(error.path).toContain('problematic.md');
    expect(error.error).toBeTruthy();
    expect(error.error.toLowerCase()).toMatch(/empty|whitespace|content/);
    
    // Console error should include file path
    const errorCalls = consoleErrorSpy.mock.calls;
    const errorOutput = errorCalls.map(call => call.join(' ')).join('\n');
    expect(errorOutput).toContain('problematic.md');
  });

  it('should track errors per indexing session and provide summary', async () => {
    // Arrange
    const testDocs: TestDocument[] = [
      // Mix of successful and failing documents
      { filename: 'doc1.md', topic: 'test', content: '# Doc 1' },
      { filename: 'empty1.md', topic: 'empty', content: '' },
      { filename: 'doc2.md', topic: 'test', content: '# Doc 2' },
      { filename: 'empty2.md', topic: 'empty', content: '  ' },
      { filename: 'doc3.md', topic: 'test', content: '# Doc 3' },
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
    
    // Act
    const result = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert
    expect(result.totalDocuments).toBe(5);
    expect(result.successfullyIndexed).toBe(3);
    expect(result.failed).toBe(2);
    expect(result.errors).toHaveLength(2);
    
    // Check service can provide error details
    const serviceErrors = similarityService.getIndexingErrors();
    expect(serviceErrors).toHaveLength(2);
    expect(serviceErrors.every(e => e.path && e.error)).toBe(true);
    
    // Verify error log summary
    const errorLog = await parseErrorLog(result.errorLogPath!);
    expect(errorLog.summary.totalDocuments).toBe(5);
    expect(errorLog.summary.successfullyIndexed).toBe(3);
    expect(errorLog.summary.failed).toBe(2);
    expect(errorLog.summary.successPercentage).toBeCloseTo(60, 1); // 3/5 = 60%
  });

  it('should distinguish between document issues and system failures', async () => {
    // This test would need a way to simulate system failures
    // For now, we'll test that different types of errors are categorized
    const testDocs: TestDocument[] = [
      {
        filename: 'empty-doc.md',
        topic: 'empty',
        content: '' // Document issue - empty content
      },
      {
        filename: 'normal-doc.md',
        topic: 'test',
        content: '# Normal\n\nThis should work fine.'
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
    
    // Act
    const result = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert
    const emptyDocError = result.errors.find(e => e.path.includes('empty-doc.md'));
    expect(emptyDocError).toBeDefined();
    expect(emptyDocError!.error).toMatch(/empty|document/i);
    
    // Error log should categorize errors
    const logContent = await fs.readFile(result.errorLogPath!, 'utf-8');
    expect(logContent).toContain('ERRORS:');
    expect(logContent).toMatch(/empty-doc\.md.*[Ee]mpty/);
  });

  it('should clear errors between indexing sessions', async () => {
    // Arrange
    const testDocs: TestDocument[] = [
      { filename: 'doc.md', topic: 'test', content: '# Test' },
      { filename: 'empty.md', topic: 'empty', content: '' }
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
    
    // First indexing session
    await similarityService.indexDirectory(testVaultPath, '**/*.md');
    expect(similarityService.getIndexingErrors()).toHaveLength(1);
    
    // Clear errors
    similarityService.clearIndexingErrors();
    expect(similarityService.getIndexingErrors()).toHaveLength(0);
    
    // Fix the empty document
    await fs.writeFile(path.join(testVaultPath, 'empty.md'), '# Fixed\n\nNow has content.');
    
    // Second indexing session
    const result2 = await similarityService.indexDirectory(testVaultPath, '**/*.md');
    
    // Assert - Should have no errors this time
    expect(result2.failed).toBe(0);
    expect(result2.errors).toHaveLength(0);
    expect(similarityService.getIndexingErrors()).toHaveLength(0);
  });
});

