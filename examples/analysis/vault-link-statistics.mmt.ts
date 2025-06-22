import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Vault Link Statistics
 * =====================
 * 
 * This script provides comprehensive statistics about the link structure of your vault,
 * helping you understand how well-connected your notes are.
 * 
 * METRICS CALCULATED:
 * - Total documents and link counts
 * - Documents with/without links (orphans)
 * - Hub documents (many outgoing links)
 * - Popular documents (many incoming links)
 * - Average connectivity metrics
 * - Most connected documents overall
 * 
 * USE CASES:
 * - Assess the overall connectivity of your knowledge base
 * - Find orphaned notes that might need linking
 * - Identify hub pages that reference many other documents
 * - Discover your most referenced (popular) documents
 * - Track vault organization over time
 * 
 * INTERPRETING RESULTS:
 * - High orphan count: Consider linking isolated notes or organizing them into folders
 * - Low average links: Your vault might benefit from more cross-referencing
 * - Hub documents: These are likely index/contents pages or project overviews
 * - Popular documents: These are your most important reference materials
 * 
 * @example
 * ```bash
 * pnpm mmt --config your-vault.yaml script examples/analysis/vault-link-statistics.mmt.ts
 * ```
 */
export default class VaultLinkStatistics implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Analyze all documents
      
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // Calculate derived metrics for each document
            const withMetrics = table
              .derive({
                has_outgoing: (d: any) => d.links_count > 0 ? 1 : 0,
                has_incoming: (d: any) => d.backlinks_count > 0 ? 1 : 0,
                is_orphan: (d: any) => d.links_count === 0 && d.backlinks_count === 0 ? 1 : 0,
                is_hub: (d: any) => d.links_count > 5 ? 1 : 0,        // >5 outgoing = hub
                is_popular: (d: any) => d.backlinks_count > 5 ? 1 : 0, // >5 incoming = popular
                total_connections: (d: any) => d.links_count + d.backlinks_count
              });
            
            // Calculate summary statistics
            const stats = withMetrics
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
            
            // Print formatted summary
            console.log('\n📊 VAULT LINK STATISTICS\n' + '='.repeat(50));
            console.log(`\n📁 Total documents: ${stats.total_docs}`);
            console.log(`   ├─ With outgoing links: ${stats.docs_with_outgoing} (${(stats.docs_with_outgoing/stats.total_docs*100).toFixed(1)}%)`);
            console.log(`   ├─ With incoming links: ${stats.docs_with_incoming} (${(stats.docs_with_incoming/stats.total_docs*100).toFixed(1)}%)`);
            console.log(`   └─ Orphaned (no links): ${stats.orphan_docs} (${(stats.orphan_docs/stats.total_docs*100).toFixed(1)}%)`);
            
            console.log(`\n🔗 Link Analysis:`);
            console.log(`   ├─ Total outgoing links: ${stats.total_outgoing_links}`);
            console.log(`   ├─ Total incoming links: ${stats.total_incoming_links}`);
            console.log(`   ├─ Avg outgoing per doc: ${stats.avg_outgoing.toFixed(2)}`);
            console.log(`   └─ Avg incoming per doc: ${stats.avg_incoming.toFixed(2)}`);
            
            console.log(`\n🌟 Special Documents:`);
            console.log(`   ├─ Hub documents (>5 outgoing): ${stats.hub_docs}`);
            console.log(`   ├─ Popular documents (>5 incoming): ${stats.popular_docs}`);
            console.log(`   ├─ Most outgoing links: ${stats.max_outgoing}`);
            console.log(`   └─ Most incoming links: ${stats.max_incoming}`);
            
            console.log('\n' + '='.repeat(50) + '\n');
            console.log('🔝 TOP 10 MOST CONNECTED DOCUMENTS:\n');
            
            // Return table of most connected documents
            return withMetrics
              .orderby(aq.desc('total_connections'))
              .select('name', 'links_count', 'backlinks_count', 'total_connections')
              .slice(0, 10);
          }
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