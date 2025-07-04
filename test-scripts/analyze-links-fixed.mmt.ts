import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';
import { desc } from 'arquero';

/**
 * Analyze document links - find most linked-to pages.
 * Demonstrates link extraction capabilities with Arquero analysis.
 */
export default class AnalyzeLinksFixed implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { ops } = context as any;
    
    return {
      select: {}, // All documents
      operations: [
        {
          type: 'analyze',
          transform: (table: any) => {
            // First, expand links into individual rows
            const expanded = table
              .filter((d: any) => d.links && d.links.length > 0)
              .unroll('links')
              .select(['path', 'links']);
            
            // Group by link target and count
            return expanded
              .derive({
                target: (d: any) => {
                  // Extract target from link object
                  const link = d.links;
                  return link?.target || link?.href || link;
                }
              })
              .groupby('target')
              .rollup({
                incoming_links: ops.count(),
                from_pages: ops.array_agg('path')
              })
              .orderby(desc('incoming_links'))
              .derive({
                from_count: (d: any) => new Set(d.from_pages).size
              })
              .select(['target', 'incoming_links', 'from_count']);
          }
        }
      ],
      output: [
        {
          format: 'table',
          destination: 'console',
          fields: ['target', 'incoming_links', 'from_count']
        }
      ]
    };
  }
}