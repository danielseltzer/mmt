import { Request, Response, NextFunction } from 'express';
import type { Context } from '../context.js';

declare global {
  namespace Express {
    interface Request {
      vaultId?: string;
      vault?: any;
    }
  }
}

/**
 * Middleware to validate and attach vault to request
 */
export function validateVault(context: Context) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { vaultId } = req.params;

    if (!vaultId) {
      return res.status(400).json({
        error: 'Vault ID is required'
      });
    }

    try {
      const vault = context.vaultRegistry.getVault(vaultId);
      
      if (!vault) {
        return res.status(404).json({
          error: `Vault '${vaultId}' not found`
        });
      }

      // Check vault status
      if (vault.status === 'error') {
        return res.status(503).json({
          error: `Vault '${vaultId}' is in error state`,
          details: vault.error?.message
        });
      }

      if (vault.status === 'initializing') {
        return res.status(503).json({
          error: `Vault '${vaultId}' is still initializing`
        });
      }

      // Attach vault to request for use in handlers
      req.vaultId = vaultId;
      req.vault = vault;
      next();
      
    } catch (err) {
      res.status(500).json({
        error: `Failed to access vault '${vaultId}'`,
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  };
}