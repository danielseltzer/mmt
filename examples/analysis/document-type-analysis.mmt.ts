import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Document Type Analysis
 * ======================
 * 
 * This script demonstrates how to analyze documents based on their frontmatter
 * 'type' field, showing document counts and link statistics per type.
 * 
 * FRONTMATTER EXAMPLE:
 * ```yaml
 * ---
 * type: project
 * status: active
 * ---
 * ```
 * 
 * USE CASES:
 * - Understand the composition of your vault by document type
 * - See which types are most interconnected
 * - Identify types that might need more cross-linking
 * - Track growth of different content categories
 * 
 * CUSTOMIZATION:
 * - Change 'fm_type' to any other frontmatter field (fm_status, fm_category, etc.)
 * - Adjust the grouping and statistics as needed
 * - Add filters to focus on specific types
 * 
 * @example
 * ```bash
 * pnpm mmt --config your-vault.yaml script examples/analysis/document-type-analysis.mmt.ts
 * ```
 */
export default class DocumentTypeAnalysis implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Analyze all documents
      
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            // Group by type and calculate statistics
            const byType = table
              .derive({
                // Normalize missing types
                type: (d: any) => d.fm_type || '(no type)'
              })
              .groupby('type')
              .rollup({
                count: aq.op.count(),
                avg_size: aq.op.mean('size'),
                total_outgoing_links: aq.op.sum('links_count'),
                total_incoming_links: aq.op.sum('backlinks_count'),
                avg_outgoing: aq.op.mean('links_count'),
                avg_incoming: aq.op.mean('backlinks_count'),
                // Count documents with any links
                connected_docs: aq.op.sum((d: any) => 
                  d.links_count > 0 || d.backlinks_count > 0 ? 1 : 0
                )
              })
              .derive({
                // Calculate connectivity percentage
                connectivity_pct: (d: any) => 
                  ((d.connected_docs / d.count) * 100).toFixed(1) + '%'
              })
              .orderby(aq.desc('count'));
            
            // Print summary
            const types = byType.objects();
            console.log(`\n📊 DOCUMENT TYPE ANALYSIS\n${'='.repeat(50)}\n`);
            console.log(`Found ${types.length} different document types\n`);
            
            // Show top types
            console.log('Top 5 types by document count:');
            types.slice(0, 5).forEach((t: any, i: number) => {
              console.log(`  ${i + 1}. ${t.type}: ${t.count} documents (${t.connectivity_pct} connected)`);
            });
            
            console.log('\n' + '='.repeat(50) + '\n');
            
            // Return detailed table
            return byType
              .select(
                'type', 
                'count', 
                'connectivity_pct',
                'avg_outgoing',
                'avg_incoming',
                'total_outgoing_links',
                'total_incoming_links'
              )
              .derive({
                // Round averages for display
                avg_out: (d: any) => d.avg_outgoing.toFixed(2),
                avg_in: (d: any) => d.avg_incoming.toFixed(2)
              })
              .select('type', 'count', 'connectivity_pct', 'avg_out', 'avg_in');
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