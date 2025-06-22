import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find orphaned documents - pages with no incoming links.
 * This helps identify disconnected content in the vault.
 */
export default class FindOrphans implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { ops } = context as any;
    
    return {
      select: {}, // All documents
      operations: [
        {
          type: 'analyze', 
          transform: (table: any) => {
            // Get all documents
            const allDocs = table.select(['path', 'name', 'modified']);
            
            // Get all link targets
            const linkedTargets = table
              .filter((d: any) => d.links && d.links.length > 0)
              .unroll('links')
              .derive({
                target: (d: any) => {
                  const link = d.links;
                  return link?.target || link?.href || link;
                }
              })
              .dedupe('target')
              .array('target');
            
            // Find documents not in the linked targets
            return allDocs
              .derive({
                has_incoming_links: (d: any) => linkedTargets.includes(d.path)
              })
              .filter((d: any) => !d.has_incoming_links)
              .derive({
                days_old: (d: any) => {
                  const now = new Date();
                  const modified = new Date(d.modified);
                  return Math.floor((now.getTime() - modified.getTime()) / (1000 * 60 * 60 * 24));
                }
              })
              .orderby('days_old')
              .select(['path', 'name', 'modified', 'days_old']);
          }
        }
      ],
      output: {
        format: 'table'
      }
    };
  }
}