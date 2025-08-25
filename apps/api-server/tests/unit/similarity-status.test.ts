import { describe, test, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { similarityRouter } from '../../src/routes/similarity';
import type { Context } from '../../src/context';

describe('Similarity Status Endpoint', () => {
  let app: express.Express;
  let mockContext: Context;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Create a mock context
    mockContext = {
      similaritySearch: null,
      fs: {} as any,
      vaultRegistry: {} as any,
      config: {} as any
    } as Context;

    app.use('/similarity', similarityRouter(mockContext));
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
      mockContext.similaritySearch = {
        getIndexingStatus: vi.fn().mockResolvedValue({
          status: 'ready',
          totalDocuments: 1000,
          indexedDocuments: 1000,
          percentComplete: 100,
          estimatedTimeRemaining: null
        })
      } as any;

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
      mockContext.similaritySearch = {
        getIndexingStatus: vi.fn().mockResolvedValue({
          status: 'indexing',
          totalDocuments: 1000,
          indexedDocuments: 250,
          percentComplete: 25,
          estimatedTimeRemaining: '3 minutes'
        })
      } as any;

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
      mockContext.similaritySearch = {
        getIndexingStatus: vi.fn().mockResolvedValue({
          status: 'error',
          totalDocuments: 1000,
          indexedDocuments: 500,
          percentComplete: 50,
          estimatedTimeRemaining: null
        })
      } as any;

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
      mockContext.similaritySearch = {
        getIndexingStatus: vi.fn().mockRejectedValue(new Error('Database connection failed'))
      } as any;

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
      mockContext.similaritySearch = {
        getStatus: vi.fn().mockResolvedValue({
          available: true,
          ollamaHealthy: true,
          indexStatus: 'ready',
          stats: {
            documentsIndexed: 1000,
            indexSize: 1000,
            lastUpdated: new Date('2025-08-24T12:00:00Z')
          },
          generatedAt: new Date('2025-08-24T13:00:00Z')
        })
      } as any;

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