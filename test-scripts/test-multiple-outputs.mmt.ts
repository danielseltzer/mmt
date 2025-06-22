import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Test script demonstrating multiple output destinations.
 * Outputs the same link analysis to:
 * 1. Console as a summary
 * 2. CSV file with all documents
 * 3. JSON file with top 10 most linked
 */
export default class TestMultipleOutputs implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: {}, // Select all files
      operations: [
        {
          type: 'custom',
          action: 'analyze',
          handler: (docs: any, { table, aq }: any) => {
            // Sort by backlinks count
            const sorted = table
              .orderby(aq.desc('backlinks_count'))
              .derive({ rank: aq.rowNumber() });
            
            return { table: sorted };
          }
        }
      ],
      output: [
        {
          format: 'summary',
          destination: 'console'
        },
        {
          format: 'csv',
          destination: 'file',
          path: '/tmp/mmt-test-all-docs.csv',
          fields: ['rank', 'name', 'backlinks_count', 'links_count']
        },
        {
          format: 'json',
          destination: 'file',
          path: '/tmp/mmt-test-top-10.json',
          fields: ['rank', 'name', 'backlinks_count', 'links_count']
        }
      ]
    };
  }
}