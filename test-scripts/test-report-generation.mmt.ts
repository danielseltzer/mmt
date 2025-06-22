import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Test script for markdown report generation.
 * Demonstrates how the --report flag generates comprehensive execution reports.
 * 
 * Usage:
 * pnpm mmt --config config.yaml script test-scripts/test-report-generation.mmt.ts --report
 * pnpm mmt --config config.yaml script test-scripts/test-report-generation.mmt.ts --report custom-report.md
 */
export default class TestReportGeneration implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        {
          type: 'custom',
          action: 'analyze',
          handler: (docs: any, { table }: any) => {
            console.log(`\nAnalyzing ${docs.length} documents for report generation test...\n`);
            
            // Group by frontmatter type
            const byType = table
              .derive({
                type: (d: any) => d.fm_type || 'untyped'
              })
              .groupby('type')
              .rollup({
                count: aq.op.count(),
                avg_links: aq.op.mean('links_count'),
                avg_backlinks: aq.op.mean('backlinks_count'),
                total_size: aq.op.sum('size')
              })
              .derive({
                avg_size_kb: aq.escape((d: any) => (d.total_size / d.count / 1024).toFixed(2))
              })
              .orderby(aq.desc('count'));
            
            // Log summary to console
            console.log('Document Types Summary:');
            byType.objects().forEach((row: any) => {
              console.log(`- ${row.type}: ${row.count} docs, avg ${row.avg_links.toFixed(1)} links`);
            });
            console.log('');
            
            return { table: byType };
          }
        }
      ],
      output: [
        {
          format: 'table',
          destination: 'console'
        },
        {
          format: 'csv',
          destination: 'file',
          path: '/tmp/mmt-report-data.csv'
        }
      ]
    };
  }
}