import type {
  Document,
  OperationReadyDocumentSet,
  QueryInput,
} from '@mmt/entities';
import type { ParsedArrayField } from './types.js';
import { 
  getDocumentRows, 
  getRowCount, 
  getColumnNames,
  sliceTable 
} from './table-utils.js';
import * as aq from 'arquero';

// Arquero doesn't export Table type properly, so we use the instance type
type Table = ReturnType<typeof aq.table>;

/**
 * Core DocumentSet class that represents a collection of documents
 * that can be operated on. This is the central abstraction of MMT.
 * 
 * A DocumentSet can be created from:
 * - A query executed against the index
 * - An explicit list of documents
 * - An Arquero table (for analysis results)
 * 
 * It maintains both a lazy table reference for efficient operations
 * and can materialize documents on demand for mutations.
 */
export class DocumentSet implements OperationReadyDocumentSet {
  readonly _type = 'DocumentSet' as const;
  readonly sourceQuery?: QueryInput; // Can be IndexerQuery or entities QueryInput
  readonly documentCount: number;
  readonly limit: number;
  readonly tableRef: Table;
  readonly metadata: {
    createdAt: Date;
    queryExecutionTime: number;
    isComplete: boolean;
    fields: string[];
  };
  
  private _documents?: Document[];
  
  constructor(data: {
    tableRef: Table;
    sourceQuery?: QueryInput;
    limit?: number;
    executionTime?: number;
  }) {
    this.tableRef = data.tableRef;
    this.sourceQuery = data.sourceQuery;
    this.documentCount = getRowCount(data.tableRef);
    this.limit = data.limit ?? 500;
    
    // Check if we're at or over the limit
    const isComplete = this.documentCount <= this.limit;
    
    this.metadata = {
      createdAt: new Date(),
      queryExecutionTime: data.executionTime ?? 0,
      isComplete,
      fields: getColumnNames(data.tableRef),
    };
  }
  
  /**
   * Get the documents array, materializing if needed.
   * This is lazy - documents are only materialized when accessed.
   */
  get documents(): Document[] | undefined {
    return this._documents;
  }
  
  /**
   * Check if documents have been materialized.
   */
  get isMaterialized(): boolean {
    return this._documents !== undefined;
  }
  
  /**
   * Get the number of documents in this set.
   */
  get size(): number {
    return this.documentCount;
  }
  
  /**
   * Check if this set is empty.
   */
  get isEmpty(): boolean {
    return this.documentCount === 0;
  }
  
  /**
   * Check if this set was truncated due to limit.
   */
  get wasTruncated(): boolean {
    return !this.metadata.isComplete;
  }
  
  /**
   * Materialize documents from the table.
   * This converts the Arquero table rows back into Document objects.
   * 
   * @returns The materialized documents array
   */
  materialize(): Promise<Document[]> {
    if (this._documents) {
      return Promise.resolve(this._documents);
    }
    
    const rows = getDocumentRows(this.tableRef);
    
    this._documents = rows.map((row) => {
      // Reconstruct frontmatter from fm_ prefixed fields
      const frontmatter: Record<string, unknown> = {};
      Object.entries(row).forEach(([key, value]) => {
        if (key.startsWith('fm_')) {
          frontmatter[key.slice(3)] = value;
        }
      });
      
      // Parse array fields back from strings
      const parseTags = (tags: ParsedArrayField): string[] => {
        if (Array.isArray(tags)) {
          return tags;
        }
        if (typeof tags === 'string' && tags) {
          return tags.split(', ').filter(Boolean);
        }
        return [];
      };
      
      const parseLinks = (links: ParsedArrayField): string[] => {
        if (Array.isArray(links)) {
          return links;
        }
        if (typeof links === 'string' && links) {
          return links.split(', ').filter(Boolean);
        }
        return [];
      };
      
      return {
        path: row.path,
        content: '', // Content not stored in table, loaded on demand
        metadata: {
          name: row.name,
          modified: row.modified instanceof Date ? row.modified : new Date(row.modified),
          size: typeof row.size === 'number' ? row.size : 0,
          frontmatter,
          tags: parseTags(row.tags),
          links: parseLinks(row.links),
          backlinks: row.backlinks !== undefined ? parseLinks(row.backlinks) : undefined,
        },
      };
    });
    
    return Promise.resolve(this._documents);
  }
  
  /**
   * Create a new DocumentSet with a filtered table.
   * This is used by operations that transform the set.
   */
  withTable(newTable: Table): DocumentSet {
    return new DocumentSet({
      tableRef: newTable,
      sourceQuery: this.sourceQuery,
      limit: this.limit,
      executionTime: this.metadata.queryExecutionTime,
    });
  }
  
  /**
   * Apply a limit to this DocumentSet, creating a new set.
   */
  withLimit(newLimit: number): DocumentSet {
    const limited = sliceTable(this.tableRef, 0, newLimit);
    return new DocumentSet({
      tableRef: limited,
      sourceQuery: this.sourceQuery,
      limit: newLimit,
      executionTime: this.metadata.queryExecutionTime,
    });
  }
}