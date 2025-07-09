import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('API Server', () => {
  let app;
  let testVaultPath;
  let testIndexPath;

  beforeAll(async () => {
    // Create real temp directories for testing (no mocks!)
    const tempDir = mkdtempSync(join(tmpdir(), 'mmt-test-'));
    testVaultPath = join(tempDir, 'vault');
    testIndexPath = join(tempDir, 'index');
    
    mkdirSync(testVaultPath, { recursive: true });
    mkdirSync(testIndexPath, { recursive: true });
    
    // Create a test config
    const config = {
      vaultPath: testVaultPath,
      indexPath: testIndexPath
    };
    
    // Create the app with test config
    app = await createApp(config);
  });

  afterAll(() => {
    // Cleanup will happen automatically when temp dir is removed
  });

  describe('GET /health', () => {
    it('should return 200 with status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toEqual({
        status: 'ok',
        vaultPath: testVaultPath,
        indexPath: testIndexPath
      });
    });
  });

  describe('GET /api/documents', () => {
    it('should return empty array when vault is empty', async () => {
      const response = await request(app)
        .get('/api/documents')
        .expect(200);
      
      expect(response.body).toEqual({
        documents: [],
        total: 0
      });
    });

    it('should return documents when vault has files', async () => {
      // Create a real markdown file
      writeFileSync(join(testVaultPath, 'test.md'), '# Test Document\n\nContent here.');
      
      // Trigger a re-index by calling the endpoint
      // (In a real app, we might have a POST /api/index/refresh endpoint)
      // For now, we'll recreate the app to force a fresh index
      app = await createApp({
        vaultPath: testVaultPath,
        indexPath: testIndexPath
      });
      
      const response = await request(app)
        .get('/api/documents')
        .expect(200);
      
      expect(response.body.total).toBe(1);
      expect(response.body.documents[0]).toMatchObject({
        path: expect.stringContaining('test.md'),
        metadata: {
          name: 'test',
          size: expect.any(Number)
        }
      });
    });
  });
});