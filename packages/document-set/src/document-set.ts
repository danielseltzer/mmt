import type { Table } from 'arquero';
import type {
  Document,
  OperationReadyDocumentSet,
} from '@mmt/entities';
import type { Query as IndexerQuery } from '@mmt/indexer';

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
  readonly sourceQuery?: any; // Can be IndexerQuery or entities QueryInput
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
    sourceQuery?: any;
    limit?: number;
    executionTime?: number;
  }) {
    this.tableRef = data.tableRef;
    this.sourceQuery = data.sourceQuery;
    this.documentCount = data.tableRef.numRows();
    this.limit = data.limit ?? 500;
    
    // Check if we're at or over the limit
    const isComplete = this.documentCount <= this.limit;
    
    this.metadata = {
      createdAt: new Date(),
      queryExecutionTime: data.executionTime ?? 0,
      isComplete,
      fields: data.tableRef.columnNames(),
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
  async materialize(): Promise<Document[]> {
    if (this._documents) {
      return this._documents;
    }
    
    const rows = this.tableRef.objects();
    
    this._documents = rows.map((row: any) => {
      // Reconstruct frontmatter from fm_ prefixed fields
      const frontmatter: Record<string, any> = {};
      Object.entries(row).forEach(([key, value]) => {
        if (key.startsWith('fm_')) {
          frontmatter[key.slice(3)] = value;
        }
      });
      
      // Parse array fields back from strings
      const parseTags = (tags: any): string[] => {
        if (Array.isArray(tags)) return tags;
        if (typeof tags === 'string' && tags) {
          return tags.split(', ').filter(Boolean);
        }
        return [];
      };
      
      const parseLinks = (links: any): string[] => {
        if (Array.isArray(links)) return links;
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
          size: row.size || 0,
          frontmatter,
          tags: parseTags(row.tags),
          links: parseLinks(row.links),
          backlinks: row.backlinks ? parseLinks(row.backlinks) : undefined,
        },
      };
    });
    
    return this._documents!;
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
    const limited = (this.tableRef as any).slice(0, newLimit);
    return new DocumentSet({
      tableRef: limited,
      sourceQuery: this.sourceQuery,
      limit: newLimit,
      executionTime: this.metadata.queryExecutionTime,
    });
  }
}