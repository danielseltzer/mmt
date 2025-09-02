import { Router } from 'express';
import type { Context } from '../context.js';
import { Loggers } from '@mmt/logger';

const logger = Loggers.apiRoutes();

export function vaultsRouter(context: Context): Router {
  const router = Router();

  /**
   * GET /api/vaults
   * List all configured vaults with their status
   */
  router.get('/', async (req, res, next) => {
    try {
      const vaultIds = context.vaultRegistry.getVaultIds();
      
      const vaults = vaultIds.map((vaultId: string) => {
        try {
          const vault = context.vaultRegistry.getVault(vaultId);
          if (!vault) {
            return {
              id: vaultId,
              status: 'error',
              error: 'Vault not found in registry'
            };
          }

          return {
            id: vaultId,
            name: vault.config.name || vaultId,
            status: vault.status,
            ...(vault.error && { error: vault.error.message })
          };
        } catch (err) {
          return {
            id: vaultId,
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error'
          };
        }
      });

      res.json({
        vaults,
        total: vaults.length,
        ready: vaults.filter((v) => v.status === 'ready').length
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/vaults/:vaultId/status
   * Get detailed status information for a specific vault
   */
  router.get('/:vaultId/status', async (req, res, next) => {
    try {
      const { vaultId } = req.params;
      const vault = context.vaultRegistry.getVault(vaultId);

      if (!vault) {
        return res.status(404).json({
          error: `Vault '${vaultId}' not found`
        });
      }

      res.json({
        id: vaultId,
        name: vault.config.name || vaultId,
        status: vault.status,
        ...(vault.error && { error: vault.error.message }),
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/vaults/:vaultId/index/status
   * Get detailed index status for a specific vault
   */
  router.get('/:vaultId/index/status', async (req, res, next) => {
    try {
      const { vaultId } = req.params;
      const vault = context.vaultRegistry.getVault(vaultId);

      if (!vault) {
        return res.status(404).json({
          error: `Vault '${vaultId}' not found`
        });
      }

      // Get document count from indexer
      let documentCount = 0;
      let lastIndexed: string | undefined;
      let indexStatus: string = vault.status;
      let indexError: string | undefined;
      
      if (vault.indexer) {
        try {
          const documents = vault.indexer.getAllDocuments();
          documentCount = documents.length;
          
          // For now, use current time as last indexed when documents exist
          if (documents.length > 0) {
            lastIndexed = new Date().toISOString(); // Use current time as last indexed
          }
        } catch (err) {
          // Log the actual error and include it in response
          logger.error(`Failed to get documents from indexer for vault ${vaultId}:`, err);
          indexStatus = 'error';
          indexError = err instanceof Error ? err.message : 'Failed to access indexer';
        }
      }

      // Check similarity status if available
      let similarityStatus;
      if (vault.similaritySearch) {
        try {
          const simStatus = await vault.similaritySearch.getStatus();
          similarityStatus = {
            available: simStatus.available || false,
            status: simStatus.indexStatus || 'not_configured',
            ollamaConnected: simStatus.available // Use available as a proxy for Ollama connection
          };
        } catch (err) {
          // Log the actual error but don't fail - similarity is optional
          logger.warn(`Failed to get similarity status for vault ${vaultId}:`, err);
          similarityStatus = {
            available: false,
            status: 'error',
            error: err instanceof Error ? err.message : 'Failed to access similarity search'
          };
        }
      }

      res.json({
        status: indexStatus === 'ready' ? 'ready' : 
                indexStatus === 'error' ? 'error' :
                documentCount > 0 ? 'ready' : 'not_indexed',
        documentCount,
        lastIndexed,
        similarityStatus,
        ...(vault.error && { error: vault.error.message }),
        ...(indexError && { indexError })
      });
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/vaults/:vaultId/index/refresh
   * Trigger a re-index of the vault
   */
  router.post('/:vaultId/index/refresh', async (req, res, next) => {
    try {
      const { vaultId } = req.params;
      const vault = context.vaultRegistry.getVault(vaultId);

      if (!vault) {
        return res.status(404).json({
          error: `Vault '${vaultId}' not found`
        });
      }

      if (!vault.indexer) {
        return res.status(503).json({
          error: 'Indexer not available for this vault'
        });
      }

      // Trigger re-initialization of the indexer
      vault.indexer.initialize()
        .then(() => {
          // Don't wait for completion, just acknowledge the request
          res.json({
            message: 'Re-indexing started',
            vaultId
          });
        })
        .catch(err => {
          res.status(500).json({
            error: 'Failed to start re-indexing',
            message: err.message
          });
        });
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/vaults/:vaultId/index/events
   * Server-sent events for index status updates
   */
  router.get('/:vaultId/index/events', (req, res, next) => {
    const { vaultId } = req.params;
    
    try {
      const vault = context.vaultRegistry.getVault(vaultId);
      
      if (!vault) {
        return res.status(404).json({
          error: `Vault '${vaultId}' not found`
        });
      }
      
      // Set up SSE
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      
      // Send initial status
      const sendStatus = async () => {
        let documentCount = 0;
        let status = vault.status;
        
        if (vault.indexer) {
          try {
            const documents = vault.indexer.getAllDocuments();
            documentCount = documents.length;
          } catch (err) {
            // Log error but continue - SSE should keep working
            logger.warn(`SSE: Failed to get documents for vault ${vaultId}:`, err);
          }
        }
        
        res.write(`data: ${JSON.stringify({
          event: 'index-update',
          data: {
            vaultId,
            status: status === 'ready' ? 'ready' : 
                    status === 'error' ? 'error' :
                    documentCount > 0 ? 'ready' : 'not_indexed',
            documentCount,
            lastIndexed: new Date().toISOString()
          }
        })}\n\n`);
      };
      
      sendStatus();
      
      // Send periodic updates (every 5 seconds)
      const interval = setInterval(sendStatus, 5000);
      
      // Clean up on client disconnect
      req.on('close', () => {
        clearInterval(interval);
        res.end();
      });
      
    } catch (err) {
      next(err);
    }
  });

  return router;
}