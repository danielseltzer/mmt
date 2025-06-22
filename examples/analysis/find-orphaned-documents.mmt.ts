import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find Orphaned Documents
 * =======================
 * 
 * This script identifies "orphaned" documents - markdown files that have no
 * incoming or outgoing links, making them isolated islands in your knowledge graph.
 * 
 * WHY THIS MATTERS:
 * - Orphaned notes are harder to discover through natural navigation
 * - They may represent forgotten ideas or incomplete thoughts
 * - Linking orphans can strengthen your knowledge network
 * 
 * WHAT TO DO WITH RESULTS:
 * 1. Review orphaned notes and consider if they're still relevant
 * 2. Link them to related concepts or project pages
 * 3. Move truly standalone items to an archive folder
 * 4. Add tags to make them discoverable through search
 * 
 * NOTE: Some orphans are intentional (daily notes, templates, etc.)
 * Consider your vault's structure when interpreting results.
 * 
 * @example
 * ```bash
 * pnpm mmt --config your-vault.yaml script examples/analysis/find-orphaned-documents.mmt.ts
 * ```
 */
export default class FindOrphanedDocuments implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Check all documents
      
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // First calculate total documents for percentage
            const total = table.numRows();
            
            // Filter to only orphaned documents
            const orphans = table
              .filter((d: any) => d.links_count === 0 && d.backlinks_count === 0)
              .derive({
                // Add file type from path
                folder: (d: any) => {
                  const parts = d.path.split('/');
                  return parts.length > 2 ? parts[parts.length - 2] : 'root';
                }
              })
              .orderby('folder', 'name');
            
            const orphanCount = orphans.numRows();
            const percentage = ((orphanCount / total) * 100).toFixed(1);
            
            console.log(`\n📊 Found ${orphanCount} orphaned documents out of ${total} total (${percentage}%)\n`);
            
            // Group by folder to show distribution
            const byFolder = orphans
              .groupby('folder')
              .rollup({ count: aq.op.count() })
              .orderby(aq.desc('count'));
            
            console.log('Distribution by folder:');
            byFolder.objects().forEach((row: any) => {
              console.log(`  ${row.folder}: ${row.count} orphans`);
            });
            console.log('');
            
            // Return detailed list
            return orphans
              .select('name', 'path', 'modified', 'size')
              .derive({
                // Make modified date more readable
                last_modified: (d: any) => {
                  const date = new Date(d.modified);
                  const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
                  return `${days} days ago`;
                }
              })
              .select('name', 'folder', 'last_modified', 'size');
          }
        }
      ],
      
      output: {
        format: 'table'
      }
    };
  }
}