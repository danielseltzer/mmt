import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { Context } from '../context.js';
import { FilterCollection, FilterCondition } from '@mmt/entities';
import type { PageMetadata } from '@mmt/indexer';
import { validate } from '../middleware/validate.js';
import { Loggers } from '@mmt/logger';
import { 
  DocumentsQuerySchema, 
  DocumentsResponseSchema,
  ExportRequestSchema,
  ExportResponseSchema,
  FilterCriteria,
  parseDateExpression,
  parseSizeExpression,
} from '@mmt/entities';

// Apply declarative filters to documents (using PageMetadata from indexer)
function applyDeclarativeFilters(documents: PageMetadata[], filterCollection: FilterCollection, vaultPath: string): PageMetadata[] {
  return documents.filter(doc => {
    const results = filterCollection.conditions.map(condition => 
      evaluateFilter(doc, condition, vaultPath)
    );
    
    // Apply logic (AND/OR)
    if (filterCollection.logic === 'OR') {
      return results.some(r => r);
    } else {
      // Default to AND
      return results.every(r => r);
    }
  });
}

// Evaluate a single filter condition (using PageMetadata from indexer)
function evaluateFilter(doc: PageMetadata, filter: FilterCondition, vaultPath: string): boolean {
  switch (filter.field) {
    case 'name': {
      const textFilter = filter as any;
      const searchIn = doc.basename || '';
      return evaluateTextOperator(searchIn, textFilter.operator, textFilter.value, textFilter.caseSensitive);
    }
    
    case 'content': {
      const textFilter = filter as any;
      // For now, search in multiple fields since we don't have full content
      const searchableText = [
        doc.frontmatter?.title as string | undefined,
        doc.basename,
        doc.path,
        ...((doc.frontmatter?.aliases as string[] | undefined) || []),
        ...(doc.tags || [])
      ].filter(Boolean).join(' ');
      return evaluateTextOperator(searchableText, textFilter.operator, textFilter.value, textFilter.caseSensitive);
    }
    
    case 'folders': {
      const folderFilter = filter as any;
      const relativePath = doc.path.replace(vaultPath, '');
      const docFolder = relativePath.substring(0, relativePath.lastIndexOf('/')) || '/';
      
      if (folderFilter.operator === 'in') {
        return folderFilter.value.some((folder: string) => {
          if (folder === '/') {
            return !relativePath.substring(1).includes('/');
          }
          return docFolder === folder || docFolder.startsWith(folder + '/');
        });
      } else {
        // not_in
        return !folderFilter.value.some((folder: string) => {
          if (folder === '/') {
            return !relativePath.substring(1).includes('/');
          }
          return docFolder === folder || docFolder.startsWith(folder + '/');
        });
      }
    }
    
    case 'tags': {
      const tagFilter = filter as any;
      const docTags = doc.tags || [];
      return evaluateArrayOperator(docTags, tagFilter.operator, tagFilter.value);
    }
    
    case 'metadata': {
      const metaFilter = filter as any;
      if (!doc.frontmatter) return false;
      const metaValue = doc.frontmatter[metaFilter.key];
      // MVP: only equals operator for metadata
      return metaValue === metaFilter.value;
    }
    
    case 'modified': {
      const dateFilter = filter as any;
      if (!doc.mtime) return false;
      const docDate = new Date(doc.mtime);
      return evaluateDateOperator(docDate, dateFilter.operator, dateFilter.value);
    }
    
    case 'size': {
      const sizeFilter = filter as any;
      return evaluateSizeOperator(doc.size || 0, sizeFilter.operator, sizeFilter.value);
    }
    
    default:
      return true;
  }
}

// Helper functions for operators
function evaluateTextOperator(text: string, operator: string, value: string, caseSensitive?: boolean): boolean {
  const searchText = caseSensitive ? text : text.toLowerCase();
  const searchValue = caseSensitive ? value : value.toLowerCase();
  
  switch (operator) {
    case 'contains': return searchText.includes(searchValue);
    case 'not_contains': return !searchText.includes(searchValue);
    case 'equals': return searchText === searchValue;
    case 'not_equals': return searchText !== searchValue;
    case 'matches': {
      try {
        const regex = new RegExp(value, caseSensitive ? '' : 'i');
        return regex.test(text);
      } catch {
        return false;
      }
    }
    default: return true;
  }
}

function evaluateArrayOperator(arr: string[], operator: string, values: string[]): boolean {
  switch (operator) {
    case 'contains': return values.some(v => arr.includes(v));
    case 'not_contains': return !values.some(v => arr.includes(v));
    case 'contains_all': return values.every(v => arr.includes(v));
    case 'contains_any': return values.some(v => arr.includes(v));
    default: return true;
  }
}

function evaluateDateOperator(date: Date, operator: string, value: string | number | { from: string; to: string }): boolean {
  let targetDate: Date;
  
  if (typeof value === 'string') {
    // Handle relative dates like "-30d"
    if (value.match(/^-?\d+[dD]$/)) {
      const days = parseInt(value);
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
    } else {
      targetDate = new Date(value);
    }
  } else if (typeof value === 'number') {
    targetDate = new Date(value);
  } else {
    // Handle between operator
    const fromDate = new Date(value.from);
    const toDate = new Date(value.to);
    
    switch (operator) {
      case 'between': return date >= fromDate && date <= toDate;
      case 'not_between': return date < fromDate || date > toDate;
      default: return true;
    }
  }
  
  switch (operator) {
    case 'gt': return date > targetDate;
    case 'gte': return date >= targetDate;
    case 'lt': return date < targetDate;
    case 'lte': return date <= targetDate;
    default: return true;
  }
}

function evaluateSizeOperator(size: number, operator: string, value: number | { from: number; to: number }): boolean {
  if (typeof value === 'object') {
    // Handle between operator
    switch (operator) {
      case 'between': return size >= value.from && size <= value.to;
      default: return true;
    }
  }
  
  const targetSize = value as number;
  switch (operator) {
    case 'gt': return size > targetSize;
    case 'gte': return size >= targetSize;
    case 'lt': return size < targetSize;
    case 'lte': return size <= targetSize;
    default: return true;
  }
}

export function documentsRouter(context: Context): Router {
  const router = Router();
  const logger = Loggers.apiRoutes();
  
  /**
   * GET /api/documents - Search and list documents with optional filtering
   * 
   * Query Parameters:
   * - q: (optional) Search query string
   * - limit: (optional) Number of results to return (default: 100, max: 1000)
   * - offset: (optional) Number of results to skip (default: 0)
   * - sortBy: (optional) Field to sort by: 'name' | 'modified' | 'size'
   * - sortOrder: (optional) Sort direction: 'asc' | 'desc' (default: 'asc')
   * - filters: (optional) JSON-encoded filter criteria object
   * 
   * Filter Criteria Object:
   * - name: (string) Filter by filename
   * - content: (string) Filter by content
   * - folders: (string[]) Filter by folder paths
   * - tags: (string[]) Filter by tags
   * - date: (DateFilter) Filter by date with operator and value
   * - dateExpression: (string) Natural language date filter (e.g., "last 30 days")
   * - size: (SizeFilter) Filter by size with operator and value
   * - sizeExpression: (string) Natural language size filter (e.g., "over 1mb")
   * 
   * Natural Language Date Expressions:
   * - "last N days", "past N days", "yesterday", "today"
   * - "this week", "this month", "this year"
   * - "since YYYY", "since MONTH", "since MONTH YYYY"
   * - "before YYYY", "until MONTH"
   * - "-30d" (shorthand for last 30 days)
   * - "< 7 days" (within last 7 days), "> 30 days" (older than 30 days)
   * - "< 2 weeks", "> 3 months", "< 1 year" (relative time with operators)
   * - Operator syntax: "> 2024-01-01", "<= yesterday", ">= last week"
   * 
   * Natural Language Size Expressions:
   * - "over SIZE", "under SIZE", "at least SIZE", "at most SIZE"
   * - Operator syntax: "> 10mb", "<= 500k", ">= 1.5gb"
   * - SIZE formats: "10k", "1.5mb", "2g", "500 bytes"
   * 
   * Example Request:
   * GET /api/documents?limit=10&filters={"dateExpression":"last 30 days","sizeExpression":"under 100k"}
   * 
   * Response:
   * {
   *   documents: Array<{ path: string, metadata: {...} }>,
   *   total: number,
   *   hasMore: boolean
   * }
   */
  router.get('/', 
    // validate(DocumentsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        // Manual validation for now
        const validatedLimit = parseInt(req.query.limit as string) || 100;
        const validatedOffset = parseInt(req.query.offset as string) || 0;
        const q = req.query.q as string | undefined;
        const sortBy = req.query.sortBy as string | undefined;
        const sortOrder = (req.query.sortOrder as string) || 'asc';
        let filterCollection: FilterCollection | null = null;
        
        if (req.query.filters && typeof req.query.filters === 'string') {
          try {
            const parsed = JSON.parse(req.query.filters);
            // Only accept FilterCollection format
            if (parsed.conditions && Array.isArray(parsed.conditions)) {
              filterCollection = parsed as FilterCollection;
            } else {
              throw new Error('Invalid filter format - must be FilterCollection with conditions array');
            }
          } catch {
            filterCollection = null;
          }
        }
        
        // Get all documents first from the vault's indexer
        let results = (req as any).vault.indexer.getAllDocuments();
        const vaultTotal = results.length; // Store total vault size before filtering
        
        // Apply search query if provided
        if (q) {
          results = (req as any).vault.indexer.query({
            conditions: [{
              field: 'content',
              operator: 'contains' as const,
              value: q
            }]
          });
        }
        
        // Apply filters if provided
        if (filterCollection && filterCollection.conditions.length > 0) {
          const vault = (req as any).vault;
          if (!vault) {
            return res.status(400).json({
              error: 'Vault not found in request'
            });
          }
          results = applyDeclarativeFilters(results, filterCollection, vault.config.path);
        }
        
        // Sort BEFORE pagination if requested
        if (sortBy) {
          results.sort((a: any, b: any) => {
            let aVal: string | number | undefined;
            let bVal: string | number | undefined;
            
            if (sortBy === 'name') {
              aVal = a.basename;
              bVal = b.basename; // Fixed: PageMetadata uses basename directly
            } else if (sortBy === 'modified') {
              aVal = a.mtime; // PageMetadata uses mtime (already a timestamp)
              bVal = b.mtime;
            } else if (sortBy === 'size') {
              aVal = a.size; // PageMetadata has size directly
              bVal = b.size;
            } else if (sortBy === 'path') {
              aVal = a.path;
              bVal = b.path;
            }
            
            // Handle null/undefined values
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            
            // Compare values
            if (sortOrder === 'desc') {
              return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
            }
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          });
        }
        
        // Apply pagination AFTER sorting
        const start = validatedOffset;
        const end = validatedOffset + validatedLimit;
        const paginatedDocs = results.slice(start, end);
        
        // Format response - map PageMetadata to Document format
        const response = DocumentsResponseSchema.parse({
          documents: paginatedDocs.map((doc: any) => {
            // PageMetadata has a folderPath field that contains the folder path relative to vault root
            // This is exactly what we need for the display path
            let displayPath = doc.folderPath || '/';
            
            return {
              path: displayPath, // Show cleaned path for display
              fullPath: doc.path, // Keep the full path for unique identification
              metadata: {
                name: doc.basename, // PageMetadata uses basename, not metadata.name
                modified: new Date(doc.mtime).toISOString(), // mtime is timestamp in ms
                size: doc.size,
                frontmatter: doc.frontmatter || {},
                tags: doc.tags || [],
                links: [], // TODO: get links from indexer
              },
            };
          }),
          total: results.length,
          vaultTotal: vaultTotal,
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
      
      const documents = await (req as any).vault.indexer.getAllDocuments();
      const document = documents.find((d: PageMetadata) => d.path === path || d.relativePath === path);
      
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
        const results = await (req as any).vault.indexer.query(query || '');
        
        let data: string;
        let mimeType: string;
        let filename: string;
        
        if (format === 'csv') {
          // Generate CSV
          const selectedColumns = columns || ['path', 'name', 'modified', 'size'];
          const headers = selectedColumns.join(',');
          const rows = results.map((doc: PageMetadata) => {
            return selectedColumns.map((col: string) => {
              if (col === 'path') return doc.path;
              if (col === 'name') return doc.basename; // PageMetadata uses basename
              if (col === 'modified') return new Date(doc.mtime).toISOString(); // mtime is timestamp
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
  
  // Preview file using QuickLook (macOS)
  router.post('/quicklook',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { filePath } = req.body;
        
        if (!filePath) {
          return res.status(400).json({ error: 'File path is required' });
        }
        
        // Check if file exists using filesystem-access
        const exists = await context.fs.exists(filePath);
        if (!exists) {
          return res.status(404).json({ error: `File not found: ${filePath}` });
        }
        
        // Use spawn for better handling of paths with spaces
        const { spawn } = await import('child_process');
        
        try {
          // qlmanage -p opens QuickLook preview
          const qlProcess = spawn('qlmanage', ['-p', filePath], {
            detached: true,
            stdio: 'ignore'
          });
          
          // Detach the process so it runs independently
          qlProcess.unref();
          
          res.json({ success: true, message: 'File preview opened' });
        } catch (error) {
          // Check if qlmanage is available (macOS only)
          if (error instanceof Error && error.message.includes('command not found')) {
            return res.status(501).json({ 
              error: 'QuickLook preview is only available on macOS',
              message: 'qlmanage command not found'
            });
          }
          throw error;
        }
      } catch (error) {
        next(error);
      }
    }
  );
  
  // Reveal file in system file manager
  /**
   * Get document preview - returns formatted content for display
   * GET /api/vaults/:vaultId/documents/preview/:path
   */
  router.get('/preview/:path(*)', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const documentPath = req.params.path;
      const vault = (req as any).vault;
      
      logger.debug('Preview endpoint called', { documentPath, vaultPath: vault?.path });
      
      if (!documentPath) {
        return res.status(400).json({ error: 'Missing document path' });
      }

      if (!vault || !vault.indexer) {
        return res.status(503).json({ error: 'Vault not available' });
      }

      // Get the document from the index
      const documents = await vault.indexer.getAllDocuments();
      const document = documents.find((d: PageMetadata) => 
        d.path === documentPath || d.relativePath === documentPath || d.basename === documentPath
      );
      
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      const fullPath = document.path;

      // Read the file content
      const path = await import('path');
      
      // Resolve the full path - if it's already absolute use it, otherwise make it relative to vault
      const absolutePath = path.isAbsolute(fullPath) ? fullPath : path.join(vault.path, fullPath);
      
      try {
        const content = await context.fs.readFile(absolutePath, 'utf-8');
        
        // Extract preview information
        const lines = content.split('\n');
        const maxLines = 20; // Maximum lines for preview
        const maxLength = 500; // Maximum total character length
        
        let preview = '';
        let charCount = 0;
        let lineCount = 0;
        
        // Skip frontmatter if present
        let inFrontmatter = false;
        let startIndex = 0;
        
        if (lines[0] === '---') {
          inFrontmatter = true;
          for (let i = 1; i < lines.length; i++) {
            if (lines[i] === '---') {
              startIndex = i + 1;
              break;
            }
          }
        }
        
        // Build preview from content
        for (let i = startIndex; i < lines.length && lineCount < maxLines; i++) {
          const line = lines[i];
          
          // Skip empty lines at the beginning
          if (preview === '' && line.trim() === '') {
            continue;
          }
          
          // Add line to preview
          if (charCount + line.length > maxLength) {
            // Truncate line if it would exceed max length
            const remainingChars = maxLength - charCount;
            if (remainingChars > 0) {
              preview += line.substring(0, remainingChars) + '...';
            }
            break;
          }
          
          preview += (preview ? '\n' : '') + line;
          charCount += line.length;
          lineCount++;
        }
        
        // Clean up the preview
        preview = preview.trim();
        
        // If we got no content after frontmatter, show a placeholder
        if (!preview) {
          preview = '(Empty document)';
        }
        
        // Add ellipsis if content was truncated
        if (lineCount === maxLines || charCount >= maxLength) {
          preview += '\n...';
        }
        
        res.json({
          path: document.relativePath,
          fullPath: fullPath,
          preview: preview,
          metadata: {
            title: document.title,
            size: document.size,
            mtime: document.mtime,
            tags: document.tags,
            frontmatter: document.frontmatter
          },
          hasMore: lines.length > startIndex + maxLines || content.length > maxLength
        });
        
      } catch (readError) {
        logger.error(`Failed to read document content: ${absolutePath}`, readError);
        return res.status(500).json({ error: 'Failed to read document content' });
      }
      
    } catch (error) {
      logger.error('Error in document preview:', error);
      next(error);
    }
  });

  router.post('/reveal-in-finder',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { filePath } = req.body;
        
        if (!filePath) {
          return res.status(400).json({ error: 'File path is required' });
        }
        
        // Use FileRevealer service with environment-based strategy
        const { FileRevealer } = await import('@mmt/filesystem-access');
        const fileRevealer = FileRevealer.createFromEnvironment();
        
        try {
          await fileRevealer.reveal(filePath);
          res.json({ success: true, message: 'File revealed in system file manager' });
        } catch (error) {
          // Handle specific error cases
          if (error instanceof Error) {
            if (error.message.includes('non-existent')) {
              return res.status(404).json({ error: error.message });
            }
            
            logger.error('Failed to reveal file', { error: error.message, filePath });
            res.status(500).json({ 
              error: 'Failed to reveal file in system file manager',
              details: error.message
            });
          } else {
            res.status(500).json({ 
              error: 'Failed to reveal file in system file manager',
              details: String(error)
            });
          }
        }
      } catch (error) {
        next(error);
      }
    }
  );
  
  return router;
}