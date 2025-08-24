import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { documentsRouter } from '../../src/routes/documents.js';
import type { Context } from '../../src/context.js';

// Mock child_process
vi.mock('child_process', () => ({
  exec: vi.fn((cmd, callback) => {
    // Simulate successful execution
    callback(null, '', '');
  })
}));

describe('Reveal in Finder Endpoint', () => {
  let app: express.Express;
  let mockContext: Context;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Create minimal mock context
    mockContext = {
      vaultRegistry: {
        getVault: vi.fn().mockReturnValue({
          indexer: {
            getAllDocuments: vi.fn().mockResolvedValue([]),
            query: vi.fn().mockResolvedValue([])
          }
        })
      }
    } as any;
    
    app.use('/api/vaults/:vaultId/documents', documentsRouter(mockContext));
  });

  it('should accept POST request with filePath', async () => {
    const response = await request(app)
      .post('/api/vaults/test-vault/documents/reveal-in-finder')
      .send({ filePath: '/Users/test/Documents/test.md' });
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'File revealed in system file manager');
  });

  it('should return 400 if filePath is missing', async () => {
    const response = await request(app)
      .post('/api/vaults/test-vault/documents/reveal-in-finder')
      .send({});
    
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'File path is required');
  });

  it('should handle different platforms', async () => {
    const platforms = ['darwin', 'win32', 'linux'];
    
    for (const platform of platforms) {
      // Override process.platform for testing
      Object.defineProperty(process, 'platform', {
        value: platform,
        configurable: true
      });
      
      const response = await request(app)
        .post('/api/vaults/test-vault/documents/reveal-in-finder')
        .send({ filePath: '/Users/test/Documents/test.md' });
      
      expect(response.status).toBe(200);
    }
    
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: process.platform,
      configurable: true
    });
  });
});