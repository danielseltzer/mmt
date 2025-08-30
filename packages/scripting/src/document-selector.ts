import type { Document, SelectCriteria } from '@mmt/entities';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import type { VaultIndexer, Query, PageMetadata } from '@mmt/indexer';

export interface DocumentSelectorOptions {
  fileSystem: FileSystemAccess;
  indexer?: VaultIndexer;
}

/**
 * Handles document selection based on various criteria.
 */
export class DocumentSelector {
  private readonly fs: FileSystemAccess;
  private indexer?: VaultIndexer;

  constructor(options: DocumentSelectorOptions) {
    this.fs = options.fileSystem;
    this.indexer = options.indexer;
  }

  /**
   * Set or update the indexer instance.
   */
  setIndexer(indexer: VaultIndexer): void {
    this.indexer = indexer;
  }

  /**
   * Select documents based on criteria.
   * 
   * Supports both explicit file lists and query-based selection using the indexer.
   */
  async selectDocuments(criteria: SelectCriteria): Promise<Document[]> {
    // Handle explicit file list
    if ('files' in criteria && criteria.files !== undefined) {
      return this.selectFromFileList(criteria.files);
    }

    // Query-based selection using indexer
    if (this.indexer === undefined) {
      throw new Error('Indexer not initialized');
    }

    const query = Object.entries(criteria as Record<string, unknown>)
      .filter(([key]) => key !== 'files')
      .reduce<Record<string, unknown>>((acc, [key, value]) => ({ ...acc, [key]: value }), {});

    if (Object.keys(query).length === 0) {
      // No criteria - return all documents
      const allDocs = this.indexer.getAllDocuments();
      return this.convertMetadataToDocuments(allDocs);
    }

    // Convert criteria to indexer query
    const indexerQuery = this.buildIndexerQuery(query);
    const results = this.indexer.query(indexerQuery);
    return this.convertMetadataToDocuments(results);
  }

  /**
   * Select documents from an explicit file list.
   */
  private async selectFromFileList(files: readonly unknown[]): Promise<Document[]> {
    const docs: Document[] = [];
    for (const filePath of files) {
      if (typeof filePath !== 'string') {
        continue;
      }
      const exists = await this.fs.exists(filePath);
      if (exists) {
        const stats = await this.fs.stat(filePath);
        const fileName = filePath.replace(/\.md$/u, '').split('/').pop() ?? filePath;
        docs.push({
          path: filePath,
          content: '', // Content loading on demand
          metadata: {
            name: fileName,
            modified: stats.mtime,
            size: stats.size,
            frontmatter: {},
            tags: [],
            links: [],
          },
        });
      }
    }
    return docs;
  }

  /**
   * Build an indexer query from script selection criteria.
   */
  private buildIndexerQuery(criteria: Record<string, unknown>): Query {
    const conditions: Query['conditions'] = [];

    for (const [field, value] of Object.entries(criteria)) {
      // Determine operator based on value type
      let operator: Query['conditions'][0]['operator'] = 'equals';
      if (typeof value === 'string' && value.includes('*')) {
        operator = 'matches';
      }

      conditions.push({
        field,
        operator,
        value,
      });
    }

    return { conditions };
  }

  /**
   * Convert PageMetadata from indexer to Document format for scripts.
   */
  private convertMetadataToDocuments(metadata: PageMetadata[]): Document[] {
    if (this.indexer === undefined) {
      throw new Error('Indexer not initialized');
    }
    
    const documents: Document[] = [];
    
    for (const meta of metadata) {
      // Get outgoing links for this document
      const outgoingLinks = this.indexer.getOutgoingLinks(meta.relativePath);
      
      // Get incoming links (backlinks) for this document
      const incomingLinks = this.indexer.getBacklinks(meta.relativePath);
      
      documents.push({
        path: meta.path,
        content: '', // Content loaded on demand
        metadata: {
          name: meta.basename,
          modified: new Date(meta.mtime),
          size: meta.size,
          frontmatter: meta.frontmatter,
          tags: meta.tags,
          // Convert PageMetadata targets to relative paths
          links: outgoingLinks.map(targetDoc => targetDoc.relativePath),
          backlinks: incomingLinks.map(sourceDoc => sourceDoc.relativePath),
        },
      });
    }
    
    return documents;
  }
}