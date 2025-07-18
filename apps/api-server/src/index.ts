import express from 'express';
import cors from 'cors';
import { configRouter } from './routes/config.js';
import { documentsRouter } from './routes/documents.js';
import { pipelinesRouter } from './routes/pipelines.js';
import { createContext } from './context.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';

const PORT = process.env.PORT || 3001;

async function main() {
  // Create app context with all services
  const context = await createContext();
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  
  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: '0.1.0' });
  });
  
  // API routes
  app.use('/api/config', configRouter(context));
  app.use('/api/documents', documentsRouter(context));
  app.use('/api/pipelines', pipelinesRouter(context));
  
  // Error handling
  app.use(errorHandler);
  
  // Start server
  app.listen(PORT, () => {
    console.log(`MMT API Server running on http://localhost:${PORT}`);
    console.log(`Vault path: ${context.config.vaultPath}`);
    console.log(`Index path: ${context.config.indexPath}`);
  });
}

main().catch(console.error);