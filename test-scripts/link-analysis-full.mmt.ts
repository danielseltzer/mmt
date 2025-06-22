import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Comprehensive link analysis showing both incoming and outgoing links.
 * Demonstrates full bidirectional link extraction capabilities.
 */
export default class LinkAnalysisFull implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // First, show summary statistics
            console.log('\n=== LINK ANALYSIS SUMMARY ===\n');
            
            const stats = table
              .derive({
                has_outgoing: (d: any) => d.links_count > 0 ? 1 : 0,
                has_incoming: (d: any) => d.backlinks_count > 0 ? 1 : 0,
                is_orphan: (d: any) => d.links_count === 0 && d.backlinks_count === 0 ? 1 : 0,
                is_hub: (d: any) => d.links_count > 3 ? 1 : 0,
                is_popular: (d: any) => d.backlinks_count > 3 ? 1 : 0
              })
              .rollup({
                total_docs: aq.op.count(),
                docs_with_outgoing: aq.op.sum('has_outgoing'),
                docs_with_incoming: aq.op.sum('has_incoming'),
                orphan_docs: aq.op.sum('is_orphan'),
                hub_docs: aq.op.sum('is_hub'),
                popular_docs: aq.op.sum('is_popular'),
                total_outgoing_links: aq.op.sum('links_count'),
                total_incoming_links: aq.op.sum('backlinks_count'),
                avg_outgoing: aq.op.mean('links_count'),
                avg_incoming: aq.op.mean('backlinks_count'),
                max_outgoing: aq.op.max('links_count'),
                max_incoming: aq.op.max('backlinks_count')
              })
              .objects()[0];
            
            console.log(`Total documents: ${stats.total_docs}`);
            console.log(`Documents with outgoing links: ${stats.docs_with_outgoing}`);
            console.log(`Documents with incoming links: ${stats.docs_with_incoming}`);
            console.log(`Orphan documents (no links): ${stats.orphan_docs}`);
            console.log(`Hub documents (>3 outgoing): ${stats.hub_docs}`);
            console.log(`Popular documents (>3 incoming): ${stats.popular_docs}`);
            console.log(`\nTotal outgoing links: ${stats.total_outgoing_links}`);
            console.log(`Total incoming links: ${stats.total_incoming_links}`);
            console.log(`Average outgoing per doc: ${stats.avg_outgoing.toFixed(2)}`);
            console.log(`Average incoming per doc: ${stats.avg_incoming.toFixed(2)}`);
            console.log(`Max outgoing links: ${stats.max_outgoing}`);
            console.log(`Max incoming links: ${stats.max_incoming}`);
            
            // Return detailed table sorted by total connectivity
            return table
              .derive({
                total_connections: (d: any) => d.links_count + d.backlinks_count
              })
              .orderby(aq.desc('total_connections'))
              .select('name', 'links_count', 'backlinks_count', 'total_connections');
          }
        }
      ],
      output: {
        format: 'table'
      }
    };
  }
}