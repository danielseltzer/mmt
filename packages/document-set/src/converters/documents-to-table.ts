import * as aq from 'arquero';
import type { Document } from '@mmt/entities';

// Arquero doesn't export Table type properly, so we use the instance type
type Table = ReturnType<typeof aq.table>;

/**
 * Converts an array of documents to an Arquero table for analysis.
 * The table will have columns for all document metadata fields.
 * 
 * This flattens the document structure into a tabular format:
 * - Basic fields: path, name, modified, size
 * - Array fields: converted to counts and comma-separated strings
 * - Frontmatter: fields prefixed with 'fm_'
 */
export function documentsToTable(documents: Document[]): Table {
  // Transform documents into a flat structure for Arquero
  const rows = documents.map(doc => {
    const row: Record<string, unknown> = {
      // File system properties
      path: doc.path,
      name: doc.metadata.name,
      modified: doc.metadata.modified.toISOString(),
      size: doc.metadata.size,
      
      // Convert arrays to counts and joined strings for analysis
      tags_count: doc.metadata.tags.length,
      tags: doc.metadata.tags.join(', '),
      links_count: doc.metadata.links.length,
      links: doc.metadata.links.join(', '),
      backlinks_count: doc.metadata.backlinks?.length ?? 0,
      backlinks: doc.metadata.backlinks?.join(', ') ?? '',
    };
    
    // Add frontmatter fields at top level with fm_ prefix
    for (const [key, value] of Object.entries(doc.metadata.frontmatter)) {
      // Skip arrays and complex objects for now
      if (!Array.isArray(value) && typeof value !== 'object') {
        row[`fm_${key}`] = value;
      }
    }
    
    return row;
  });
  
  return aq.from(rows);
}