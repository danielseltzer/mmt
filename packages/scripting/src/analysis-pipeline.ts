import * as aq from 'arquero';
import type { Table } from 'arquero';
import type {
  Document,
  OperationReadyDocumentSet,
  ToDocumentSetOptions,
} from '@mmt/entities';

/**
 * Converts an array of documents to an Arquero table for analysis.
 * The table will have columns for all document metadata fields.
 */
export function documentsToTable(documents: Document[]): Table {
  console.log('documentsToTable called with', documents.length, 'documents');
  // Transform documents into a flat structure for Arquero
  const rows = documents.map(doc => {
    const row: Record<string, any> = {
      // File system properties
      path: doc.path,
      name: doc.metadata.name,
      modified: doc.metadata.modified.toISOString(),
      size: doc.metadata.size,
      
      // Convert arrays to counts and joined strings
      tags_count: doc.metadata.tags?.length || 0,
      tags: doc.metadata.tags?.join(', ') || '',
      links_count: doc.metadata.links?.length || 0,
      links: doc.metadata.links?.join(', ') || '',
      backlinks_count: doc.metadata.backlinks?.length || 0,
      backlinks: doc.metadata.backlinks?.join(', ') || '',
    };
    
    // Add frontmatter fields at top level
    if (doc.metadata.frontmatter) {
      for (const [key, value] of Object.entries(doc.metadata.frontmatter)) {
        // Skip arrays for now
        if (!Array.isArray(value)) {
          row[`fm_${key}`] = value;
        }
      }
    }
    
    return row;
  });
  
  console.log('Creating table with', rows.length, 'rows');
  console.log('First row:', JSON.stringify(rows[0], null, 2));
  
  try {
    const table = aq.from(rows);
    console.log('Table created successfully');
    return table;
  } catch (error) {
    console.error('Error creating Arquero table:', error);
    throw error;
  }
}

/**
 * Creates an OperationReadyDocumentSet from an Arquero table.
 * This validates the document count against limits and prepares
 * the set for mutation operations.
 */
export async function tableToDocumentSet(
  table: Table,
  options: Partial<ToDocumentSetOptions> & { sourceQuery?: any; executionTime?: number } = {}
): Promise<OperationReadyDocumentSet> {
  const {
    limit = 500,
    overrideLimit = false,
    materialize = false,
    sourceQuery,
    executionTime = 0,
  } = options;
  
  const documentCount = table.numRows();
  
  // Check document count limit
  if (documentCount > limit && !overrideLimit) {
    throw new Error(
      `Document set contains ${documentCount} documents, exceeding the limit of ${limit}. ` +
      `Use overrideLimit: true to proceed anyway.`
    );
  }
  
  // Get available fields from the table
  const fields = table.columnNames();
  
  const documentSet: OperationReadyDocumentSet = {
    _type: 'DocumentSet',
    sourceQuery,
    documentCount,
    limit,
    tableRef: table,
    metadata: {
      createdAt: new Date(),
      queryExecutionTime: executionTime,
      isComplete: documentCount <= limit,
      fields,
    },
  };
  
  // Materialize documents if requested
  if (materialize) {
    documentSet.documents = await materializeDocuments(table);
  }
  
  return documentSet;
}

/**
 * Materializes documents from an Arquero table back into Document objects.
 * This is used when documents need to be passed to mutation operations.
 */
export async function materializeDocuments(table: Table): Promise<Document[]> {
  const rows = table.objects();
  
  return rows.map((row: any) => {
    // Reconstruct frontmatter from fm_ prefixed fields
    const frontmatter: Record<string, any> = {};
    Object.entries(row).forEach(([key, value]) => {
      if (key.startsWith('fm_')) {
        frontmatter[key.slice(3)] = value;
      }
    });
    
    // Use the nested frontmatter object if no fm_ fields found
    if (Object.keys(frontmatter).length === 0 && row.frontmatter) {
      Object.assign(frontmatter, row.frontmatter);
    }
    
    return {
      path: row.path,
      content: '', // Content not stored in table
      metadata: {
        name: row.name,
        modified: row.modified instanceof Date ? row.modified : new Date(row.modified),
        size: row.size || 0,
        frontmatter,
        tags: row.tags || [],
        links: row.links || [],
      },
    };
  });
}

/**
 * Export the Arquero namespace for scripts to use
 */
export { aq };