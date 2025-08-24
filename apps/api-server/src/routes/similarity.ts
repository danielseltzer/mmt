import { Router } from 'express';
import type { Context } from '../context.js';
import { Loggers, type Logger } from '@mmt/logger';

const logger: Logger = Loggers.api();

export function similarityRouter(context: Context): Router {
  const router = Router();
  
  // GET /api/similarity/status - Get current indexing status (new format for issue #221)
  router.get('/status', async (req, res) => {
    try {
      // Check if similarity search is configured
      if (!context.similaritySearch) {
        return res.json({
          status: 'not_configured',
          totalDocuments: 0,
          indexedDocuments: 0,
          percentComplete: 0,
          estimatedTimeRemaining: null
        });
      }
      
      const status = await context.similaritySearch.getIndexingStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get similarity search status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  // GET /api/similarity/status/detailed - Get detailed status (legacy format)
  router.get('/status/detailed', async (req, res) => {
    try {
      if (!context.similaritySearch) {
        return res.status(501).json({
          error: 'Similarity search is not configured',
          message: 'To enable similarity search, add a similarity provider (e.g., Qdrant) to your configuration file'
        });
      }
      const status = await context.similaritySearch.getStatus();
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
    if (!context.similaritySearch) {
      return res.status(501).json({
        error: 'Similarity search is not configured',
        message: 'To enable similarity search, add a similarity provider (e.g., Qdrant) to your configuration file'
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
    if (!context.similaritySearch) {
      return res.status(501).json({
        error: 'Similarity search is not configured',
        message: 'To enable similarity search, add a similarity provider (e.g., Qdrant) to your configuration file'
      });
    }
    
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
    if (!context.similaritySearch) {
      return res.status(501).json({
        error: 'Similarity search is not configured',
        message: 'To enable similarity search, add a similarity provider (e.g., Qdrant) to your configuration file'
      });
    }
    
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
      
      // Get all documents from the indexer
      const documents = await vault.indexer.getAllDocuments();
      const docsWithContent = await Promise.all(
        documents.map(async (doc: any) => {
          try {
            const content = await context.fs.readFile(doc.path);
            return {
              path: doc.path,  // Use the absolute path
              content: content,
              // Include metadata from the indexed document (PageMetadata structure)
              metadata: {
                title: doc.title || doc.basename,
                modified: doc.mtime ? new Date(doc.mtime).toISOString() : undefined,
                size: doc.size,
                tags: doc.tags || []
              }
            };
          } catch (error) {
            logger.warn(`Failed to read file ${doc.path} during reindex:`, {
              error: error instanceof Error ? error.message : String(error),
              path: doc.path
            });
            return {
              path: doc.path,  // Use the absolute path
              content: '',
              metadata: {
                title: doc.title || doc.basename,
                modified: doc.mtime ? new Date(doc.mtime).toISOString() : undefined,
                size: doc.size,
                tags: doc.tags || []
              }
            };
          }
        })
      );
      
      context.similaritySearch!.reindexAll(docsWithContent)
        .catch((error: any) => {
          logger.error('Background reindexing failed', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            documentCount: docsWithContent.length
          });
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