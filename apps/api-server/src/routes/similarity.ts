import { Router } from 'express';
import type { Request, Response } from 'express';
import type { Context } from '../context.js';
import type { Document } from '@mmt/entities';
import { Loggers, type Logger } from '@mmt/logger';

const logger: Logger = Loggers.api();

// Extend Express Request to include vaultId from route params
interface VaultRequest extends Request {
  params: {
    vaultId: string;
    [key: string]: string;
  };
}

export function similarityRouter(context: Context): Router {
  const router = Router({ mergeParams: true });
  
  // GET /api/vaults/:vaultId/similarity/status - Get current indexing status
  router.get('/status', async (req: Request, res: Response) => {
    try {
      // Get vault from request (attached by middleware)
      const vault = (req as any).vault;
      const vaultId = (req as any).vaultId;
      
      if (!vault) {
        return res.status(404).json({
          error: 'Vault not found',
          message: `Vault not found: ${vaultId}`
        });
      }
      const similaritySearch = vault.similaritySearch;
      
      // Check if similarity search is configured for this vault
      if (!similaritySearch) {
        return res.json({
          status: 'not_configured',
          totalDocuments: 0,
          indexedDocuments: 0,
          percentComplete: 0,
          estimatedTimeRemaining: null,
          message: `Similarity search is not configured for vault ${vaultId}`
        });
      }
      
      const status = await similaritySearch.getStatus();
      res.json({
        vaultId,
        ...status
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it's a vault not found error
      if (errorMessage.includes('Vault not found')) {
        return res.status(404).json({
          error: 'Vault not found',
          message: errorMessage
        });
      }
      
      res.status(500).json({
        error: 'Failed to get similarity search status',
        message: errorMessage
      });
    }
  });
  
  // GET /api/vaults/:vaultId/similarity/events - Server-sent events for status updates
  router.get('/events', (req: Request, res: Response) => {
    const vaultId = (req as any).vaultId;
    
    try {
      const vault = (req as any).vault;
      const similaritySearch = vault?.similaritySearch;
      
      if (!similaritySearch) {
        return res.status(501).json({
          error: 'Similarity search is not configured',
          message: `To enable similarity search for vault ${vaultId}, add a similarity configuration to the vault`
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
      similaritySearch.getStatus().then((status: any) => {
        res.write(`data: ${JSON.stringify({
          event: 'status',
          data: { vaultId, ...status }
        })}\n\n`);
      });
      
      // Set up event listeners
      const statusChangeHandler = (data: unknown) => {
        res.write(`data: ${JSON.stringify({
          event: 'status-changed',
          data: { vaultId, ...data as any }
        })}\n\n`);
      };
      
      const progressHandler = (data: unknown) => {
        res.write(`data: ${JSON.stringify({
          event: 'progress',
          data: { vaultId, ...data as any }
        })}\n\n`);
      };
      
      similaritySearch.on('status-changed', statusChangeHandler);
      similaritySearch.on('indexing-progress', progressHandler);
      
      // Keep connection alive
      const keepAlive = setInterval(() => {
        res.write(':keepalive\n\n');
      }, 30000);
      
      // Clean up on disconnect
      req.on('close', () => {
        clearInterval(keepAlive);
        similaritySearch.off('status-changed', statusChangeHandler);
        similaritySearch.off('indexing-progress', progressHandler);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Vault not found')) {
        return res.status(404).json({
          error: 'Vault not found',
          message: errorMessage
        });
      }
      
      res.status(500).json({
        error: 'Failed to set up event stream',
        message: errorMessage
      });
    }
  });
  
  // POST /api/vaults/:vaultId/similarity/search - Search for similar documents
  router.post('/search', async (req: Request, res: Response) => {
    const vaultId = (req as any).vaultId;
    
    try {
      const vault = (req as any).vault;
      const similaritySearch = vault?.similaritySearch;
      
      if (!similaritySearch) {
        return res.status(501).json({
          error: 'Similarity search is not configured',
          message: `To enable similarity search for vault ${vaultId}, add a similarity configuration to the vault`
        });
      }
      
      const { documentPath, query, limit = 10 } = req.body;
      
      if (!documentPath && !query) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'Either documentPath or query must be provided'
        });
      }
      
      let searchQuery = query;
      
      // If documentPath is provided, use the document content as the query
      if (documentPath) {
        const content = await context.fs.readFile(documentPath);
        searchQuery = content;
      }
      
      const results = await similaritySearch.search(searchQuery, limit);
      
      res.json({
        vaultId,
        query: query || documentPath,
        results
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Vault not found')) {
        return res.status(404).json({
          error: 'Vault not found',
          message: errorMessage
        });
      }
      
      res.status(500).json({
        error: 'Search failed',
        message: errorMessage
      });
    }
  });
  
  // POST /api/vaults/:vaultId/similarity/reindex - Manually trigger reindexing
  router.post('/reindex', async (req: Request, res: Response) => {
    const vaultId = (req as any).vaultId;
    
    try {
      const vault = (req as any).vault;
      const similaritySearch = vault?.similaritySearch;
      
      if (!similaritySearch) {
        return res.status(501).json({
          error: 'Similarity search is not configured',
          message: `To enable similarity search for vault ${vaultId}, add a similarity configuration to the vault`
        });
      }
      
      const { force = false } = req.body;
      
      // Check current status
      const status = await similaritySearch.getStatus();
      if (status.indexStatus === 'indexing' && !force) {
        return res.status(409).json({
          error: 'Indexing already in progress',
          message: 'Use force: true to restart indexing'
        });
      }
      
      // Get all documents from the vault's indexer
      const documents = await vault.indexer.getAllDocuments();
      
      // Convert to the format expected by similarity service
      // Note: PageMetadata doesn't include content, so we need to read files for similarity indexing
      const documentsToIndex = documents.map((doc: any) => ({
        id: doc.path,
        path: doc.path,
        content: '', // Content needs to be loaded separately for similarity indexing
        metadata: {
          title: doc.title,
          tags: doc.tags,
          modified: new Date(doc.mtime).toISOString(),
          size: doc.size
        }
      }));
      
      // Start reindexing (async)
      similaritySearch.indexDocuments(documentsToIndex).then((result: any) => {
        logger.info(`Similarity reindex completed for vault ${vaultId}`, result);
      }).catch((error: any) => {
        logger.error(`Similarity reindex failed for vault ${vaultId}`, { error });
      });
      
      res.json({
        message: 'Reindexing started',
        vaultId,
        documentCount: documents.length
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Vault not found')) {
        return res.status(404).json({
          error: 'Vault not found',
          message: errorMessage
        });
      }
      
      res.status(500).json({
        error: 'Failed to start reindexing',
        message: errorMessage
      });
    }
  });
  
  // GET /api/vaults/:vaultId/similarity/health - Check similarity service health
  router.get('/health', async (req: Request, res: Response) => {
    const vaultId = (req as any).vaultId;
    
    try {
      const vault = (req as any).vault;
      const similaritySearch = vault?.similaritySearch;
      
      if (!similaritySearch) {
        return res.json({
          vaultId,
          healthy: false,
          configured: false,
          message: `Similarity search is not configured for vault ${vaultId}`
        });
      }
      
      const status = await similaritySearch.getStatus();
      
      res.json({
        vaultId,
        healthy: status.available && status.ollamaHealthy,
        configured: true,
        ollamaHealthy: status.ollamaHealthy,
        indexStatus: status.indexStatus,
        documentsIndexed: status.stats.documentsIndexed,
        lastUpdated: status.stats.lastUpdated
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Vault not found')) {
        return res.status(404).json({
          error: 'Vault not found',
          message: errorMessage
        });
      }
      
      res.status(500).json({
        error: 'Health check failed',
        message: errorMessage
      });
    }
  });
  
  return router;
}