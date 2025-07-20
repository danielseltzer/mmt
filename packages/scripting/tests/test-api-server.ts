import express from 'express';
import cors from 'cors';
import type { Server } from 'http';
import { VaultIndexer } from '@mmt/indexer';
import { FileRelocator } from '@mmt/file-relocator';
import { OperationRegistry } from '@mmt/document-operations';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { pipelinesRouter } from '../../../apps/api-server/src/routes/pipelines.js';
import type { Context } from '../../../apps/api-server/src/context.js';

export interface TestApiServerOptions {
  port: number;
  vaultPath: string;
  indexPath: string;
}

/**
 * Creates a test API server with real implementations for integration testing.
 * No mocks - uses real file system operations in temp directories.
 */
export async function createTestApiServer(options: TestApiServerOptions): Promise<{
  server: Server;
  context: Context;
  close: () => Promise<void>;
}> {
  // Create context with test configuration
  const fs = new NodeFileSystem();
  
  const indexer = new VaultIndexer({
    vaultPath: options.vaultPath,
    fileSystem: fs,
    cacheDir: options.indexPath,
    useCache: false, // Don't use cache in tests for predictability
    useWorkers: false, // Single-threaded for tests
    fileWatching: {
      enabled: true,
      debounceMs: 10, // Short debounce for tests
    }
  });
  await indexer.initialize();
  
  const fileRelocator = new FileRelocator(fs, {
    updateMovedFile: true,
    extensions: ['.md'],
  });
  
  const operationRegistry = new OperationRegistry();
  
  const context: Context = {
    config: {
      vaultPath: options.vaultPath,
      indexPath: options.indexPath,
      apiPort: options.port,
      webPort: 3000, // Not used in tests but required by schema
    },
    indexer,
    fileRelocator,
    operationRegistry,
    fs,
  };
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: 'test' });
  });
  
  // Only the pipelines route is needed for ScriptRunner tests
  app.use('/api/pipelines', pipelinesRouter(context));
  
  // Error handling
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Test API Error:', err);
    res.status(500).json({ error: err.message });
  });
  
  // Start server
  return new Promise((resolve) => {
    const server = app.listen(options.port, () => {
      resolve({
        server,
        context,
        close: () => new Promise<void>((closeResolve) => {
          server.close(() => closeResolve());
        }),
      });
    });
  });
}