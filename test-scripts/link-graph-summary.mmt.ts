import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Generate a summary of the link graph showing statistics.
 * Demonstrates analytical capabilities on link data.
 */
export default class LinkGraphSummary implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // First derive a column for documents with links
            const withStats = table
              .derive({
                has_links: (d: any) => d.links_count > 0 ? 1 : 0
              });
            
            // Then calculate statistics
            const stats = withStats
              .rollup({
                total_documents: aq.op.count(),
                documents_with_links: aq.op.sum('has_links'),
                total_links: aq.op.sum('links_count'),
                avg_links_per_doc: aq.op.mean('links_count'),
                max_links: aq.op.max('links_count'),
                min_links: aq.op.min('links_count')
              });
            
            return stats;
          }
        }
      ],
      output: [
        {
          format: 'json',
          destination: 'console'
        }
      ]
    };
  }
}