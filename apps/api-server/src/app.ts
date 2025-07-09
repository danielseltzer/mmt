import express, { Express } from 'express';
import cors from 'cors';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { Config } from '@mmt/entities';

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
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      vaultPath: config.vaultPath,
      indexPath: config.indexPath
    });
  });
  
  // Documents endpoint
  app.get('/api/documents', async (req, res) => {
    try {
      const documents = await indexer.getAllDocuments();
      res.json({
        documents: documents.map(doc => ({
          path: doc.path,
          metadata: {
            name: doc.basename,
            size: doc.size
          }
        })),
        total: documents.length
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
  
  return app;
}