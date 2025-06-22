import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Demonstrates link extraction capabilities.
 * Shows all documents with their outgoing links.
 */
export default class AnalyzeLinksDemo implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            .select('path', 'name', 'links_count', 'links')
            .filter((d: any) => d.links_count > 0)
            .orderby(aq.desc('links_count'))
        }
      ],
      output: {
        format: 'table'
      }
    };
  }
}