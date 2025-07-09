import { Router } from 'express';
import type { Context } from '../context.js';

export function configRouter(context: Context): Router {
  const router = Router();
  
  // GET /api/config - Get current configuration
  router.get('/', (req, res) => {
    res.json({
      vaultPath: context.config.vaultPath,
      indexPath: context.config.indexPath,
      fileWatching: context.config.fileWatching ? {
        enabled: context.config.fileWatching.enabled,
        debounceMs: context.config.fileWatching.debounceMs,
        ignorePatterns: context.config.fileWatching.ignorePatterns,
      } : undefined,
    });
  });
  
  // GET /api/config/stats - Get vault statistics
  router.get('/stats', async (req, res, next) => {
    try {
      const documents = await context.indexer.getAllDocuments();
      res.json({
        totalDocuments: documents.length,
        vaultPath: context.config.vaultPath,
        indexPath: context.config.indexPath,
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
}