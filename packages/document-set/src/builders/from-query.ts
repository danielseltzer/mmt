import type { VaultIndexer, Query as IndexerQuery, PageMetadata, LinkEntry } from '@mmt/indexer';
import type { Document } from '@mmt/entities';
import { QueryParser } from '@mmt/query-parser';
import { DocumentSet } from '../document-set.js';
import { documentsToTable } from '../converters/documents-to-table.js';

export interface FromQueryOptions {
  /**
   * Maximum number of documents to include in the set.
   * Default: 500
   */
  limit?: number;
  
  /**
   * Allow exceeding the default limit.
   * Default: false
   */
  overrideLimit?: boolean;
  
  /**
   * Materialize documents immediately.
   * Default: false (lazy loading)
   */
  materialize?: boolean;
}

/**
 * Creates a DocumentSet from a query string or query object.
 * The query is executed against the vault indexer to find matching documents.
 * 
 * @param query - Query string (e.g., "tag:important") or IndexerQuery object
 * @param indexer - Vault indexer instance
 * @param queryParser - Query parser instance (optional, only needed for string queries)
 * @param options - Options for creating the set
 * @returns A new DocumentSet
 * @throws Error if document count exceeds limit and overrideLimit is false
 */
export async function fromQuery(
  query: string | IndexerQuery,
  indexer: VaultIndexer,
  queryParser?: QueryParser,
  options: FromQueryOptions = {}
): Promise<DocumentSet> {
  const {
    limit = 500,
    overrideLimit = false,
    materialize = false,
  } = options;
  
  const startTime = Date.now();
  
  // Parse string query if needed
  let indexerQuery: IndexerQuery;
  if (typeof query === 'string') {
    if (!queryParser) {
      throw new Error('QueryParser required for string queries');
    }
    // Parse string into structured query format
    const input: Record<string, any> = {};
    
    // Simple tag:value parsing
    if (query.includes(':')) {
      const [field, value] = query.split(':', 2);
      if (field === 'tag') {
        input['fm:tags'] = value;
      } else {
        input[`fm:${field}`] = value;
      }
    } else {
      // Full text search
      input['content:text'] = query;
    }
    
    const parsed = queryParser.parse(input) as any;
    indexerQuery = convertToIndexerQuery(parsed);
  } else {
    indexerQuery = query;
  }
  
  // Execute the query
  const results = await indexer.query(indexerQuery);
  const executionTime = Date.now() - startTime;
  
  // Check document count against limit
  if (results.length > limit && !overrideLimit) {
    throw new Error(
      `Query returned ${results.length} documents, exceeding the limit of ${limit}. ` +
      `Use overrideLimit: true to proceed anyway.`
    );
  }
  
  // Convert metadata to documents
  const documents = await convertMetadataToDocuments(results, indexer);
  
  // Apply limit if needed
  const limitedDocs = documents.slice(0, limit);
  
  // Convert to table
  const table = documentsToTable(limitedDocs);
  
  // Create the document set
  const docSet = new DocumentSet({
    tableRef: table,
    sourceQuery: indexerQuery,
    limit,
    executionTime,
  });
  
  // Materialize if requested
  if (materialize) {
    await docSet.materialize();
  }
  
  return docSet;
}

/**
 * Convert QueryParser output to indexer query format.
 */
function convertToIndexerQuery(parsed: any): IndexerQuery {
  const conditions: IndexerQuery['conditions'] = [];
  
  // Handle filesystem conditions
  if (parsed.filesystem) {
    for (const [field, value] of Object.entries(parsed.filesystem)) {
      conditions.push({
        field: `fs:${field}`,
        operator: typeof value === 'string' && value.includes('*') ? 'matches' : 'equals',
        value,
      });
    }
  }
  
  // Handle frontmatter conditions
  if (parsed.frontmatter) {
    for (const [field, value] of Object.entries(parsed.frontmatter)) {
      conditions.push({
        field: `fm:${field}`,
        operator: 'equals',
        value,
      });
    }
  }
  
  // Handle content conditions
  if (parsed.content) {
    for (const [field, value] of Object.entries(parsed.content)) {
      conditions.push({
        field: 'content',
        operator: 'contains',
        value,
      });
    }
  }
  
  return { 
    conditions,
    sort: parsed.sort
  };
}

/**
 * Convert PageMetadata from indexer to Document format.
 */
async function convertMetadataToDocuments(
  metadata: PageMetadata[],
  indexer: VaultIndexer
): Promise<Document[]> {
  const documents: Document[] = [];
  
  for (const meta of metadata) {
    // Get additional link information
    const outgoingLinks = await indexer.getOutgoingLinks(meta.relativePath);
    const incomingLinks = await indexer.getBacklinks(meta.relativePath);
    
    documents.push({
      path: meta.path,
      content: '', // Content loaded on demand
      metadata: {
        name: meta.basename,
        modified: new Date(meta.mtime),
        size: meta.size,
        frontmatter: meta.frontmatter || {},
        tags: meta.tags || [],
        links: outgoingLinks.map(link => (link as any).targetPath || (link as any).target || ''),
        backlinks: incomingLinks.map(doc => doc.path),
      },
    });
  }
  
  return documents;
}