/**
 * @fileoverview Utility functions for working with MMT schemas.
 * 
 * This file contains helper functions that operate on the schemas defined
 * in other files. These utilities provide common transformations and
 * parsing operations.
 */

import { QueryInput, StructuredQuery, StructuredQuerySchema } from './query.schema.js';

/**
 * Parse a user-facing query into internal structured format.
 * 
 * Converts the namespace:property syntax used in QueryInput into the
 * structured format used internally by the indexer. This function handles
 * the parsing of namespaces and organizes properties into their respective
 * categories.
 * 
 * @param input - User query with namespace:property syntax
 * @returns Structured query ready for execution
 * 
 * @example Basic query parsing
 * ```typescript
 * const input: QueryInput = {
 *   'fs:path': 'posts/notes',
 *   'fm:status': 'draft',
 *   sort: 'modified',
 *   order: 'desc'
 * };
 * 
 * const structured = parseQuery(input);
 * // Result:
 * // {
 * //   filesystem: { path: 'posts/notes' },
 * //   frontmatter: { status: 'draft' },
 * //   sort: { field: 'modified', order: 'desc' }
 * // }
 * ```
 * 
 * @example Complex query with operators
 * ```typescript
 * const input: QueryInput = {
 *   'fs:size': { gt: 1000 },
 *   'fm:priority': { between: [1, 5] },
 *   'content:text': 'TODO',
 *   'inline:tags': ['urgent', 'bug']
 * };
 * 
 * const structured = parseQuery(input);
 * ```
 */
export function parseQuery(input: QueryInput): StructuredQuery {
  const structured: any = {};
  
  for (const [key, value] of Object.entries(input)) {
    // Handle sort options specially
    if (key === 'sort' || key === 'order') {
      if (input.sort) {
        structured.sort = { 
          field: input.sort, 
          order: input.order || 'asc' 
        };
      }
      continue;
    }
    
    // Parse namespace:property format
    const colonIndex = key.indexOf(':');
    if (colonIndex === -1) continue; // Skip invalid keys
    
    const namespace = key.substring(0, colonIndex);
    const property = key.substring(colonIndex + 1);
    
    // Route to appropriate namespace object
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
        // Unknown namespace, ignore
        console.warn(`Unknown query namespace: ${namespace}`);
    }
  }
  
  // Validate and return the structured query
  return StructuredQuerySchema.parse(structured);
}