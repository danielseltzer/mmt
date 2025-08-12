import { Router } from 'express';
import type { Context } from '../context.js';

export function similarityRouter(context: Context): Router {
  const router = Router();
  
  // Check if similarity search is enabled
  router.use((req, res, next) => {
    if (!context.similaritySearch) {
      return res.status(501).json({
        error: 'Similarity search is not enabled',
        message: 'Enable similarity search in your configuration file'
      });
    }
    next();
  });
  
  // GET /api/similarity/status - Get current status
  router.get('/status', async (req, res) => {
    try {
      const status = await context.similaritySearch!.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get similarity search status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // GET /api/similarity/events - Server-sent events for status updates
  router.get('/events', (req, res) => {
    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial status
    context.similaritySearch!.getStatus().then(status => {
      res.write(`data: ${JSON.stringify({
        event: 'status',
        data: status
      })}\n\n`);
    });
    
    // Set up event listeners
    const statusChangeHandler = (data: any) => {
      res.write(`data: ${JSON.stringify({
        event: 'status-changed',
        data
      })}\n\n`);
    };
    
    const progressHandler = (data: any) => {
      res.write(`data: ${JSON.stringify({
        event: 'progress',
        data
      })}\n\n`);
    };
    
    context.similaritySearch!.on('status-changed', statusChangeHandler);
    context.similaritySearch!.on('progress', progressHandler);
    
    // Keep connection alive
    const keepAlive = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 30000);
    
    // Clean up on disconnect
    req.on('close', () => {
      clearInterval(keepAlive);
      context.similaritySearch!.off('status-changed', statusChangeHandler);
      context.similaritySearch!.off('progress', progressHandler);
    });
  });
  
  // POST /api/similarity/search - Search for similar documents
  router.post('/search', async (req, res) => {
    const { documentPath, query, limit = 10, includeExcerpt = true } = req.body;
    
    if (!documentPath && !query) {
      return res.status(400).json({
        error: 'Missing required parameter',
        message: 'Either documentPath or query must be provided'
      });
    }
    
    try {
      let searchQuery = query;
      
      // If documentPath is provided, use the document content as the query
      if (documentPath) {
        const content = await context.fs.readFile(documentPath);
        searchQuery = content;
      }
      
      const results = await context.similaritySearch!.search(searchQuery, {
        limit,
        includeExcerpt
      });
      
      res.json({
        query: query || documentPath,
        results
      });
    } catch (error) {
      res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // POST /api/similarity/reindex - Manually trigger reindexing
  router.post('/reindex', async (req, res) => {
    const { force = false } = req.body;
    
    try {
      // Check current status
      const status = await context.similaritySearch!.getStatus();
      if (status.indexStatus === 'indexing' && !force) {
        return res.status(409).json({
          error: 'Indexing already in progress',
          message: 'Use force=true to restart indexing'
        });
      }
      
      // Start reindexing in the background
      const vault = (req as any).vault;
      if (!vault) {
        return res.status(400).json({
          error: 'Vault not found in request'
        });
      }
      context.similaritySearch!.indexDirectory(vault.config.path)
        .catch(error => {
          console.error('Reindexing failed:', error);
        });
      
      res.json({
        message: 'Reindexing started',
        status: 'indexing'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to start reindexing',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  return router;
}