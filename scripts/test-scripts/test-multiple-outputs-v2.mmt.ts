import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Multiple output demo - shows how to export results in various formats.
 * 
 * Purpose: Demonstrate flexible output options for analysis results
 * Use case: Export data for different consumers (console, CSV, JSON)
 * Features: Multiple simultaneous outputs with different formats/limits
 * 
 * Outputs link analysis in multiple formats:
 * 1. Console as a summary
 * 2. Console as a table (top 5)
 * 3. CSV file with top 20
 * 4. JSON file with all documents
 */
export default class TestMultipleOutputsV2 implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: {}, // Select all files
      operations: [
        {
          type: 'custom',
          action: 'analyze',
          handler: (docs: any, { table, aq }: any) => {
            // Sort by backlinks count and add rank
            const sorted = table
              .orderby(aq.desc('backlinks_count'))
              .derive({ rank: () => aq.op.row_number() });
            
            return { table: sorted };
          }
        }
      ],
      output: [
        // Summary to console
        {
          format: 'summary',
          destination: 'console'
        },
        // Table to console (will show first few rows)
        {
          format: 'table',
          destination: 'console',
          fields: ['rank', 'name', 'backlinks_count', 'links_count']
        },
        // CSV file with top documents
        {
          format: 'csv',
          destination: 'file',
          path: '/tmp/mmt-top-docs.csv',
          fields: ['rank', 'name', 'path', 'backlinks_count', 'links_count', 'tags']
        },
        // JSON file with all data
        {
          format: 'json',
          destination: 'file',
          path: '/tmp/mmt-all-docs.json'
        }
      ]
    };
  }
}