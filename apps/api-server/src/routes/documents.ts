import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { Context } from '../context.js';
import { Document, FilterCollection, FilterCondition } from '@mmt/entities';
import { validate } from '../middleware/validate.js';
import { 
  DocumentsQuerySchema, 
  DocumentsResponseSchema,
  ExportRequestSchema,
  ExportResponseSchema,
  FilterCriteria,
  parseDateExpression,
  parseSizeExpression,
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
  
  if (filters.metadata && filters.metadata.length > 0) {
    filtered = filtered.filter(doc => {
      if (!doc.frontmatter) return false;
      
      // Check if all metadata filters match
      return filters.metadata!.every((metadataFilter: string) => {
        const [key, value] = metadataFilter.split(':');
        if (!key) return false;
        
        const docValue = doc.frontmatter[key];
        if (!docValue) return false;
        
        // If no value specified, just check if key exists
        if (!value) return true;
        
        // Handle array values (like tags in frontmatter)
        if (Array.isArray(docValue)) {
          return docValue.some(v => String(v).toLowerCase() === value.toLowerCase());
        }
        
        // Handle single values
        return String(docValue).toLowerCase() === value.toLowerCase();
      });
    });
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

// Convert legacy FilterCriteria to new FilterCollection format
function convertLegacyFilters(filters: FilterCriteria): FilterCollection {
  const conditions: FilterCondition[] = [];
  
  if (filters.name) {
    conditions.push({
      field: 'name',
      operator: 'contains',
      value: filters.name,
      caseSensitive: false
    });
  }
  
  if (filters.content) {
    conditions.push({
      field: 'content',
      operator: 'contains',
      value: filters.content,
      caseSensitive: false
    });
  }
  
  if (filters.folders && filters.folders.length > 0) {
    conditions.push({
      field: 'folders',
      operator: 'in',
      value: filters.folders
    });
  }
  
  if (filters.metadata && filters.metadata.length > 0) {
    filters.metadata.forEach(metaFilter => {
      const [key, value] = metaFilter.split(':');
      if (key) {
        conditions.push({
          field: 'metadata',
          key,
          operator: 'equals',
          value: value === undefined ? true : value
        });
      }
    });
  }
  
  if (filters.dateExpression) {
    try {
      const parsed = parseDateExpression(filters.dateExpression);
      if (parsed) {
        conditions.push({
          field: 'modified',
          operator: parsed.operator as any,
          value: parsed.value
        });
      }
    } catch (e) {
      // Ignore invalid expressions
    }
  }
  
  if (filters.sizeExpression) {
    try {
      const parsed = parseSizeExpression(filters.sizeExpression);
      if (parsed) {
        conditions.push({
          field: 'size',
          operator: parsed.operator as any,
          value: parseInt(parsed.value) // Convert string to number
        });
      }
    } catch (e) {
      // Ignore invalid expressions
    }
  }
  
  return {
    conditions,
    logic: 'AND'
  };
}

// Apply declarative filters to documents
function applyDeclarativeFilters(documents: any[], filterCollection: FilterCollection, vaultPath: string): any[] {
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

// Evaluate a single filter condition
function evaluateFilter(doc: any, filter: FilterCondition, vaultPath: string): boolean {
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
        doc.title,
        doc.basename,
        doc.path,
        ...(doc.aliases || []),
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
            // Check if it's the new FilterCollection format
            if (parsed.conditions && Array.isArray(parsed.conditions)) {
              filterCollection = parsed as FilterCollection;
            } else {
              // Legacy FilterCriteria format - convert it
              filterCollection = convertLegacyFilters(parsed);
            }
          } catch {
            filterCollection = null;
          }
        }
        
        // Get all documents first
        let results = context.indexer.getAllDocuments();
        const vaultTotal = results.length; // Store total vault size before filtering
        
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
        if (filterCollection && filterCollection.conditions.length > 0) {
          results = applyDeclarativeFilters(results, filterCollection, context.config.vaultPath);
        }
        
        // Apply pagination
        const start = validatedOffset;
        const end = validatedOffset + validatedLimit;
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