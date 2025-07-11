import { Router, Request, Response, NextFunction } from 'express';
import type { Context } from '../context.js';
import { validate } from '../middleware/validate.js';
import { 
  DocumentsQuerySchema, 
  DocumentsResponseSchema,
  ExportRequestSchema,
  ExportResponseSchema,
} from '@mmt/entities';

export function documentsRouter(context: Context): Router {
  const router = Router();
  
  // GET /api/documents - Search and list documents
  router.get('/', 
    validate(DocumentsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const { q, limit, offset, sortBy, sortOrder } = req.query as any;
        
        // Execute query
        // If no query provided, get all documents
        const results = q 
          ? await context.indexer.query({
              conditions: [{
                field: 'content',
                operator: 'contains',
                value: q
              }]
            })
          : await context.indexer.getAllDocuments();
        
        // Apply pagination
        const start = offset;
        const end = offset + limit;
        const paginatedDocs = results.slice(start, end);
        
        // Sort if requested
        if (sortBy) {
          paginatedDocs.sort((a, b) => {
            let aVal: any;
            let bVal: any;
            
            if (sortBy === 'name') {
              aVal = a.basename;
              bVal = b.basename;
            } else if (sortBy === 'modified') {
              aVal = a.mtime;
              bVal = b.mtime;
            } else if (sortBy === 'size') {
              aVal = a.size;
              bVal = b.size;
            }
            
            if (sortOrder === 'desc') {
              return bVal > aVal ? 1 : -1;
            }
            return aVal > bVal ? 1 : -1;
          });
        }
        
        // Format response
        const response = DocumentsResponseSchema.parse({
          documents: paginatedDocs.map(doc => ({
            path: doc.path,
            metadata: {
              name: doc.basename,
              modified: new Date(doc.mtime).toISOString(),
              size: doc.size,
              frontmatter: doc.frontmatter || {},
              tags: doc.tags || [],
              links: [], // TODO: get links from indexer
            },
          })),
          total: results.length,
          hasMore: end < results.length,
        });
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    }
  );
  
  // GET /api/documents/by-path/* - Get single document metadata
  router.get('/by-path/*', async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract path from URL - remove the /by-path/ prefix
      const fullPath = req.path;
      const path = fullPath.substring('/by-path/'.length);
      
      const documents = await context.indexer.getAllDocuments();
      const document = documents.find(d => d.path === path || d.relativePath === path);
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      
      res.json({
        path: document.path,
        metadata: {
          name: document.basename,
          modified: new Date(document.mtime).toISOString(),
          size: document.size,
          frontmatter: document.frontmatter,
          tags: document.tags,
          links: [],
        },
      });
    } catch (error) {
      next(error);
    }
  });
  
  // POST /api/documents/export - Export documents
  router.post('/export',
    validate(ExportRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { format, query, columns } = req.body;
        
        // Get documents
        const results = await context.indexer.query(query || '');
        
        let data: string;
        let mimeType: string;
        let filename: string;
        
        if (format === 'csv') {
          // Generate CSV
          const selectedColumns = columns || ['path', 'name', 'modified', 'size'];
          const headers = selectedColumns.join(',');
          const rows = results.map((doc: any) => {
            return selectedColumns.map((col: any) => {
              if (col === 'path') return doc.path;
              if (col === 'name') return doc.basename;
              if (col === 'modified') return new Date(doc.mtime).toISOString();
              if (col === 'size') return doc.size.toString();
              return '';
            }).join(',');
          });
          
          data = [headers, ...rows].join('\n');
          mimeType = 'text/csv';
          filename = `mmt-export-${Date.now()}.csv`;
        } else {
          // Generate JSON
          data = JSON.stringify({
            exported: new Date().toISOString(),
            query,
            documents: results,
          }, null, 2);
          mimeType = 'application/json';
          filename = `mmt-export-${Date.now()}.json`;
        }
        
        const response = ExportResponseSchema.parse({
          format,
          data: Buffer.from(data).toString('base64'),
          filename,
          mimeType,
        });
        
        res.json(response);
      } catch (error) {
        next(error);
      }
    }
  );
  
  return router;
}