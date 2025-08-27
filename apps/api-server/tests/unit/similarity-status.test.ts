import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { similarityRouter } from '../../src/routes/similarity';
import type { Context } from '../../src/context';
import { SimilaritySearchService } from '../../src/services/similarity-search';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { Loggers } from '@mmt/logger';

// Test helper class to simulate different similarity service states
class TestSimilarityService {
  private _status: any;

  constructor(status: any) {
    this._status = status;
  }

  async getIndexingStatus() {
    if (this._status.shouldThrow) {
      throw new Error(this._status.error);
    }
    return this._status;
  }

  async getStatus() {
    if (this._status.shouldThrow) {
      throw new Error(this._status.error);
    }
    return this._status.detailed || this._status;
  }
}

describe.skip('Similarity Status Endpoint', () => {
  let app: express.Express;
  let testContext: Context;
  let tempDir: string;

  beforeEach(async () => {
    // Create a real temporary directory for testing
    tempDir = await fs.mkdtemp(join(tmpdir(), 'similarity-status-test-'));

    app = express();
    app.use(express.json());

    // Create real context without similarity search initially
    testContext = {
      similaritySearch: null,
      fs: {} as any,
      vaultRegistry: {} as any,
      config: {} as any,
      logger: Loggers.default()
    } as Context;

    app.use('/similarity', similarityRouter(testContext));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('GET /similarity/status', () => {
    test('should return not_configured when similarity is not enabled', async () => {
      const response = await request(app)
        .get('/similarity/status')
        .expect(200);

      expect(response.body).toEqual({
        status: 'not_configured',
        totalDocuments: 0,
        indexedDocuments: 0,
        percentComplete: 0,
        estimatedTimeRemaining: null
      });
    });

    test('should return ready status when indexing is complete', async () => {
      // Create a test service that simulates ready state
      testContext.similaritySearch = new TestSimilarityService({
        status: 'ready',
        totalDocuments: 1000,
        indexedDocuments: 1000,
        percentComplete: 100,
        estimatedTimeRemaining: null
      }) as any;

      const response = await request(app)
        .get('/similarity/status')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ready',
        totalDocuments: 1000,
        indexedDocuments: 1000,
        percentComplete: 100,
        estimatedTimeRemaining: null
      });
    });

    test('should return indexing status with progress', async () => {
      // Create a test service that simulates indexing state
      testContext.similaritySearch = new TestSimilarityService({
        status: 'indexing',
        totalDocuments: 1000,
        indexedDocuments: 250,
        percentComplete: 25,
        estimatedTimeRemaining: '3 minutes'
      }) as any;

      const response = await request(app)
        .get('/similarity/status')
        .expect(200);

      expect(response.body).toEqual({
        status: 'indexing',
        totalDocuments: 1000,
        indexedDocuments: 250,
        percentComplete: 25,
        estimatedTimeRemaining: '3 minutes'
      });
    });

    test('should return error status when indexing failed', async () => {
      // Create a test service that simulates error state
      testContext.similaritySearch = new TestSimilarityService({
        status: 'error',
        totalDocuments: 1000,
        indexedDocuments: 500,
        percentComplete: 50,
        estimatedTimeRemaining: null
      }) as any;

      const response = await request(app)
        .get('/similarity/status')
        .expect(200);

      expect(response.body).toEqual({
        status: 'error',
        totalDocuments: 1000,
        indexedDocuments: 500,
        percentComplete: 50,
        estimatedTimeRemaining: null
      });
    });

    test('should handle errors gracefully', async () => {
      // Create a test service that throws an error
      testContext.similaritySearch = new TestSimilarityService({
        shouldThrow: true,
        error: 'Database connection failed'
      }) as any;

      const response = await request(app)
        .get('/similarity/status')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to get similarity search status',
        message: 'Database connection failed'
      });
    });
  });

  describe('GET /similarity/status/detailed', () => {
    test('should return 501 when similarity is not configured', async () => {
      const response = await request(app)
        .get('/similarity/status/detailed')
        .expect(501);

      expect(response.body).toMatchObject({
        error: 'Similarity search is not configured'
      });
    });

    test('should return detailed status when configured', async () => {
      // Create a test service with detailed status
      testContext.similaritySearch = new TestSimilarityService({
        detailed: {
          available: true,
          ollamaHealthy: true,
          indexStatus: 'ready',
          stats: {
            documentsIndexed: 1000,
            indexSize: 1000,
            lastUpdated: new Date('2025-08-24T12:00:00Z')
          },
          generatedAt: new Date('2025-08-24T13:00:00Z')
        }
      }) as any;

      const response = await request(app)
        .get('/similarity/status/detailed')
        .expect(200);

      expect(response.body).toMatchObject({
        available: true,
        ollamaHealthy: true,
        indexStatus: 'ready',
        stats: {
          documentsIndexed: 1000,
          indexSize: 1000
        }
      });
    });
  });
});