import { Router, Request, Response, NextFunction } from 'express';
import type { Context } from '../context.js';
import { Document } from '@mmt/entities';
import { validate } from '../middleware/validate.js';
import { 
  DocumentsQuerySchema, 
  DocumentsResponseSchema,
  ExportRequestSchema,
  ExportResponseSchema,
  FilterCriteria,
} from '@mmt/entities';

// Helper function to apply filters to documents
function applyFilters(documents: any[], filters: FilterCriteria, vaultPath: string): any[] {
  let filtered = [...documents];
  
  if (filters.name) {
    filtered = filtered.filter(doc => 
      doc.basename.toLowerCase().includes(filters.name!.toLowerCase())
    );
  }
  
  if (filters.content) {
    const searchLower = filters.content.toLowerCase();
    filtered = filtered.filter(doc => {
      // Search in multiple fields for content
      if (doc.title?.toLowerCase().includes(searchLower)) return true;
      if (doc.basename?.toLowerCase().includes(searchLower)) return true;
      if (doc.path.toLowerCase().includes(searchLower)) return true;
      if (doc.aliases?.some((alias: string) => alias.toLowerCase().includes(searchLower))) return true;
      if (doc.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower))) return true;
      return false;
    });
  }
  
  if (filters.folders && filters.folders.length > 0) {
    filtered = filtered.filter(doc => {
      // Get the relative path from the vault root
      const relativePath = doc.path.replace(vaultPath, '');
      const docFolder = relativePath.substring(0, relativePath.lastIndexOf('/')) || '/';
      
      // Check if the document is in any of the selected folders
      return filters.folders!.some((folder: string) => {
        if (folder === '/') {
          // Root folder - check if file is directly in vault root
          return !relativePath.substring(1).includes('/');
        }
        // Check if document path starts with the selected folder
        return docFolder === folder || docFolder.startsWith(folder + '/');
      });
    });
  }
  
  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(doc => 
      filters.tags!.some((tag: string) => doc.tags?.includes(tag))
    );
  }
  
  if (filters.date) {
    filtered = filtered.filter(doc => {
      if (!doc.mtime) return false;
      const docDate = new Date(doc.mtime);
      
      // Parse date value
      const { operator, value } = filters.date!;
      let targetDate: Date;
      
      // Handle relative dates like "-30d"
      if (value.match(/^-?\d+[dD]$/)) {
        const days = parseInt(value);
        targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);
      } else {
        // Parse absolute dates
        targetDate = new Date(value);
        if (isNaN(targetDate.getTime())) return true; // Invalid date, skip filter
      }
      
      switch (operator) {
        case '<': return docDate < targetDate;
        case '<=': return docDate <= targetDate;
        case '>': return docDate > targetDate;
        case '>=': return docDate >= targetDate;
        default: return true;
      }
    });
  }
  
  if (filters.size) {
    filtered = filtered.filter(doc => {
      const docSize = doc.size || 0;
      const { operator, value } = filters.size!;
      
      // Parse size value (e.g., "1k", "10M")
      let targetSize = 0;
      const match = value.match(/^(\d+(?:\.\d+)?)(k|K|m|M|g|G)?$/i);
      if (!match) return true; // Invalid format, skip filter
      
      const num = parseFloat(match[1]);
      const unit = match[2]?.toLowerCase();
      
      switch (unit) {
        case 'k': targetSize = num * 1024; break;
        case 'm': targetSize = num * 1024 * 1024; break;
        case 'g': targetSize = num * 1024 * 1024 * 1024; break;
        default: targetSize = num;
      }
      
      switch (operator) {
        case '<': return docSize < targetSize;
        case '<=': return docSize <= targetSize;
        case '>': return docSize > targetSize;
        case '>=': return docSize >= targetSize;
        default: return true;
      }
    });
  }
  
  return filtered;
}

export function documentsRouter(context: Context): Router {
  const router = Router();
  
  // GET /api/documents - Search and list documents
  router.get('/', 
    validate(DocumentsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const { q, limit, offset, sortBy, sortOrder, filters } = req.query as any;
        
        // Get all documents first
        let results = context.indexer.getAllDocuments();
        
        // Apply search query if provided
        if (q) {
          results = context.indexer.query({
            conditions: [{
              field: 'content',
              operator: 'contains' as const,
              value: q
            }]
          });
        }
        
        // Apply filters if provided
        if (filters && Object.keys(filters).length > 0) {
          results = applyFilters(results, filters as FilterCriteria, context.config.vaultPath);
        }
        
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