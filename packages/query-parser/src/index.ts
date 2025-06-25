/**
 * @fileoverview Query parser for MMT - converts user queries to structured format
 */

import type { QueryInput, StructuredQuery } from '@mmt/entities';
import { StructuredQuerySchema } from '@mmt/entities';

/**
 * Query parser class for converting user queries to structured format
 */
export class QueryParser {
  /**
   * Parse a user-facing query into structured format
   * @param input - Query with namespace:property format
   * @returns Structured query with separated namespaces
   */
  parse(input: QueryInput): StructuredQuery {
    return parseQuery(input);
  }
}

/**
 * Parse a user-facing query into structured format
 * @param input - Query with namespace:property format
 * @returns Structured query with separated namespaces
 * @example
 * parseQuery({ 'fs:path': 'posts/**', 'fm:status': 'draft' })
 * // Returns: { filesystem: { path: 'posts/**' }, frontmatter: { status: 'draft' } }
 */
export function parseQuery(input: QueryInput): StructuredQuery {
  const structured: {
    filesystem?: Record<string, unknown>;
    frontmatter?: Record<string, unknown>;
    content?: Record<string, unknown>;
    inline?: Record<string, unknown>;
    sort?: { field: string; order: 'asc' | 'desc' };
  } = {};
  
  for (const [key, value] of Object.entries(input)) {
    if (key === 'sort' || key === 'order') {
      // Handle sort options
      if (input.sort) {
        structured.sort = { 
          field: input.sort, 
          order: input.order ?? 'asc' 
        };
      }
      continue;
    }
    
    // Parse namespace:property
    const colonIndex = key.indexOf(':');
    if (colonIndex === -1) {
      continue; // Skip invalid keys
    }
    
    const namespace = key.substring(0, colonIndex);
    const property = key.substring(colonIndex + 1);
    
    switch (namespace) {
      case 'fs':
        structured.filesystem ??= {};
        structured.filesystem[property] = value;
        break;
      case 'fm':
        structured.frontmatter ??= {};
        structured.frontmatter[property] = value;
        break;
      case 'content':
        structured.content ??= {};
        structured.content[property] = value;
        break;
      case 'inline':
        structured.inline ??= {};
        structured.inline[property] = value;
        break;
      default:
        // Ignore unknown namespaces
        break;
    }
  }
  
  return StructuredQuerySchema.parse(structured);
}