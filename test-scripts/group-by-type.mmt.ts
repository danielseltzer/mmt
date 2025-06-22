import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Group and count all files by their type field.
 * Shows distribution of document types in the vault using Arquero.
 * 
 * This properly demonstrates grouping and aggregation operations.
 */
export default class GroupByType implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            .derive({ 
              // Normalize type field
              type: (d: any) => d.fm_type || '(no type)' 
            })
            .groupby('type')
            .rollup({
              count: aq.op.count(),
              size_total: aq.op.sum('size'),
              size_avg: aq.op.mean('size'),
              links_total: aq.op.sum('links_count'),
              links_avg: aq.op.mean('links_count')
            })
            .orderby(aq.desc('count'))
        }
      ],
      output: [
        {
          format: 'table',
          destination: 'console'
        }
      ]
    };
  }
}