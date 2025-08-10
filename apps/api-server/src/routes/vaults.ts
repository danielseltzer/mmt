import { Router } from 'express';
import type { Context } from '../context.js';

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
        ready: vaults.filter((v: any) => v.status === 'ready').length
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

  return router;
}