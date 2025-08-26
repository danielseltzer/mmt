import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { documentsRouter } from '../../src/routes/documents.js';
import type { Context } from '../../src/context.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { VaultIndexer } from '@mmt/indexer';
import { VaultRegistry } from '@mmt/vault';
import { Loggers } from '@mmt/logger';

describe('Reveal in Finder Endpoint', () => {
  let app: express.Express;
  let testContext: Context;
  let tempDir: string;
  let testFilePath: string;
  let vaultRegistry: VaultRegistry;

  beforeEach(async () => {
    // Create a real temporary directory and file for testing
    tempDir = await fs.mkdtemp(join(tmpdir(), 'reveal-finder-test-'));
    testFilePath = join(tempDir, 'document.md');
    await fs.writeFile(testFilePath, '# Test Document\n\nThis is a test document.');

    // Create a real vault registry with a test vault
    vaultRegistry = VaultRegistry.getInstance();
    await vaultRegistry.initializeVaults({
      vaults: [{
        name: 'test-vault',
        path: tempDir,
        indexPath: join(tempDir, '.index'),
        fileWatching: { enabled: false }
      }],
      apiPort: 3001,
      webPort: 5173
    });

    app = express();
    app.use(express.json());

    // Create real context with actual vault registry
    testContext = {
      vaultRegistry,
      logger: Loggers.default()
    } as Context;

    // Add vault middleware to simulate the real API behavior
    app.use('/api/vaults/:vaultId/documents', (req, res, next) => {
      const vault = vaultRegistry.getVault(req.params.vaultId);
      if (!vault) {
        return res.status(404).json({ error: 'Vault not found' });
      }
      (req as any).vault = vault;
      next();
    });

    app.use('/api/vaults/:vaultId/documents', documentsRouter(testContext));
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }

    // Reset vault registry
    vaultRegistry.shutdown();
  });

  it('should accept POST request with filePath', async () => {
    const response = await request(app)
      .post('/api/vaults/test-vault/documents/reveal-in-finder')
      .send({ filePath: testFilePath });

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
    const originalPlatform = process.platform;

    for (const platform of platforms) {
      // Override process.platform for testing
      Object.defineProperty(process, 'platform', {
        value: platform,
        configurable: true
      });

      const response = await request(app)
        .post('/api/vaults/test-vault/documents/reveal-in-finder')
        .send({ filePath: testFilePath });

      expect(response.status).toBe(200);
    }

    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      configurable: true
    });
  });
});