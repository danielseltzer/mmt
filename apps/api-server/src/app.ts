import express, { Express } from 'express';
import cors from 'cors';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { Config } from '@mmt/entities';
import { documentsRouter } from './routes/documents.js';
import { configRouter } from './routes/config.js';
import { pipelinesRouter } from './routes/pipelines.js';
import { similarityRouter } from './routes/similarity.js';
import type { Context } from './context.js';
import { SimilaritySearchService } from './services/similarity-search.js';

export async function createApp(config: Config): Promise<Express> {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  
  // Store config on app for routes to access
  app.locals.config = config;
  
  // Initialize services
  const fs = new NodeFileSystem();
  
  // For Phase 1: Use the first vault as default
  const defaultVault = config.vaults[0];
  
  const indexer = new VaultIndexer({
    vaultPath: defaultVault.path,
    fileSystem: fs,
    cacheDir: defaultVault.indexPath,
    useCache: true
  });
  await indexer.initialize();
  
  app.locals.indexer = indexer;
  
  // Initialize similarity search if enabled
  let similaritySearch: SimilaritySearchService | undefined;
  if (config.similarity?.enabled) {
    similaritySearch = new SimilaritySearchService(config);
    await similaritySearch.initialize();
    
    // Hook similarity search into indexer's file changes
    // For now, we'll set up our own file watcher that mirrors the indexer's behavior
    if (defaultVault.fileWatching?.enabled) {
      const { FileWatcher } = await import('@mmt/vault');
      const similarityWatcher = new FileWatcher({
        paths: [defaultVault.path],
        recursive: true,
        debounceMs: defaultVault.fileWatching.debounceMs,
        ignorePatterns: defaultVault.fileWatching.ignorePatterns,
      });
      
      similarityWatcher.onFileChange(async (event) => {
        try {
          switch (event.type) {
            case 'created':
            case 'modified':
              await similaritySearch!.reindexFile(event.path);
              break;
            case 'deleted':
              await similaritySearch!.removeFile(event.path);
              break;
          }
        } catch (error) {
          console.error(`Similarity search: Error handling file ${event.type}:`, error);
        }
      });
      
      similarityWatcher.start().catch((error) => {
        console.error('Similarity search: Failed to start file watcher:', error);
      });
      
      // Store watcher for cleanup
      app.locals.similarityWatcher = similarityWatcher;
    }
  }
  
  // Create context for routes
  const context: Context = {
    config,
    indexer,
    fileRelocator: null as any, // Not needed for current routes
    operationRegistry: null as any, // Not needed for current routes
    fs,
    similaritySearch
  };
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      vaultPath: defaultVault.path,
      indexPath: defaultVault.indexPath
    });
  });
  
  // Mount API routes
  app.use('/api/config', configRouter(context));
  app.use('/api/documents', documentsRouter(context));
  app.use('/api/pipelines', pipelinesRouter(context));
  app.use('/api/similarity', similarityRouter(context));
  
  return app;
}