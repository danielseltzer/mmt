import express, { Express } from 'express';
import cors from 'cors';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { Config } from '@mmt/entities';
import { documentsRouter } from './routes/documents.js';
import { configRouter } from './routes/config.js';
import { operationsRouter } from './routes/operations.js';
import type { Context } from './context.js';

export async function createApp(config: Config): Promise<Express> {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Store config on app for routes to access
  app.locals.config = config;
  
  // Initialize services
  const fs = new NodeFileSystem();
  const indexer = new VaultIndexer({
    vaultPath: config.vaultPath,
    fileSystem: fs,
    cacheDir: config.indexPath,
    useCache: true
  });
  await indexer.initialize();
  
  app.locals.indexer = indexer;
  
  // Create context for routes
  const context: Context = {
    config,
    indexer,
    fileRelocator: null as any, // Not needed for current routes
    operationRegistry: null as any, // Not needed for current routes
    fs
  };
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      vaultPath: config.vaultPath,
      indexPath: config.indexPath
    });
  });
  
  // Mount API routes
  app.use('/api/config', configRouter(context));
  app.use('/api/documents', documentsRouter(context));
  app.use('/api/operations', operationsRouter(context));
  
  return app;
}