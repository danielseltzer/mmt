import { Router } from 'express';
import type { Context } from '../context.js';

export function configRouter(context: Context): Router {
  const router = Router();
  
  // GET /api/config - Get current configuration
  router.get('/', (req, res) => {
    res.json({
      vaults: context.config.vaults,
      apiPort: context.config.apiPort,
      webPort: context.config.webPort,
      similarity: context.config.similarity,
    });
  });
  
  
  return router;
}