import { Router } from 'express';
import type { Context } from '../context.js';

export function configRouter(context: Context): Router {
  const router = Router();
  
  // GET /api/config - Get current configuration
  router.get('/', (req, res) => {
    // For Phase 1: Return all vaults with the first one marked as active
    res.json({
      vaults: context.config.vaults.map((vault, index) => ({
        ...vault,
        active: index === 0 // First vault is active by default
      })),
      apiPort: context.config.apiPort,
      webPort: context.config.webPort,
      similarity: context.config.similarity,
    });
  });
  
  // GET /api/config/stats - Get vault statistics
  router.get('/stats', async (req, res, next) => {
    try {
      const documents = await context.indexer.getAllDocuments();
      const activeVault = context.config.vaults[0]; // First vault is active
      res.json({
        totalDocuments: documents.length,
        activeVault: {
          name: activeVault.name,
          path: activeVault.path,
          indexPath: activeVault.indexPath,
        }
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
}