import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Count files by frontmatter type field.
 * Uses Arquero to properly group and count all document types.
 * 
 * Equivalent to Dataview query:
 * ```dataview
 * TABLE length(rows) as Count
 * FROM ""
 * GROUP BY type
 * ```
 */
export default class CountByType implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any; // Arquero namespace from context
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            .derive({ 
              // Create a normalized type field - using fm_ prefix from table structure
              type: (d: any) => d.fm_type || '(no type)' 
            })
            .groupby('type')
            .rollup({ 
              count: aq.op.count() 
            })
            .orderby(aq.desc('count'))
        }
      ],
      output: {
        format: 'table' // Display as table
      }
    };
  }
}