import express, { Express } from 'express';
import cors from 'cors';
import { Config } from '@mmt/entities';
import { configRouter } from './routes/config.js';
import { documentsRouter } from './routes/documents.js';
import { pipelinesRouter } from './routes/pipelines.js';
import { similarityRouter } from './routes/similarity.js';
import { vaultsRouter } from './routes/vaults.js';
import { createContext } from './context.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { validateVault } from './middleware/vault-middleware.js';

export async function createApp(config: Config): Promise<Express> {
  // Create app context with all services
  const context = await createContext(config);
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  
  // Health check
  app.get('/health', (req, res) => {
    const vaultCount = context.vaultRegistry.getVaultIds().length;
    res.json({ 
      status: 'ok', 
      version: '0.1.0',
      vaults: vaultCount
    });
  });
  
  // Vault management routes
  app.use('/api/vaults', vaultsRouter(context));
  
  // Vault-scoped routes
  const vaultRouter = express.Router({ mergeParams: true });
  vaultRouter.use(validateVault(context));
  vaultRouter.use('/documents', documentsRouter(context));
  vaultRouter.use('/pipelines', pipelinesRouter(context));
  vaultRouter.use('/similarity', similarityRouter(context));
  app.use('/api/vaults/:vaultId', vaultRouter);
  
  // Legacy routes (use first vault as default for backward compatibility)
  app.use('/api/config', configRouter(context));
  app.use('/api/documents', documentsRouter(context));
  app.use('/api/pipelines', pipelinesRouter(context));
  app.use('/api/similarity', similarityRouter(context));
  
  // Error handling
  app.use(errorHandler);
  
  return app;
}