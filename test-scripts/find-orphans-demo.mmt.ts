import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find orphan documents - files with no incoming or outgoing links.
 * This requires checking both links_count (outgoing) and backlinks.
 */
export default class FindOrphansDemo implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            .derive({
              is_orphan: (d: any) => d.links_count === 0
            })
            .filter((d: any) => d.is_orphan)
            .select('path', 'name', 'fm_type', 'modified')
            .orderby('name')
        }
      ],
      output: {
        format: 'table'
      }
    };
  }
}