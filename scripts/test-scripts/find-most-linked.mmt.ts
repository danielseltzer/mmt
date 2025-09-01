import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Ranking/sorting example - finds documents with most incoming links.
 * 
 * Purpose: Identify hub/important documents based on reference count
 * Use case: Discover central concepts or frequently referenced content
 * Features: Backlink counting, sorting, and limiting results
 */
export default class FindMostLinked implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            // Filter to documents with at least one backlink
            .filter((d: any) => d.backlinks_count > 0)
            // Sort by backlink count descending
            .orderby(aq.desc('backlinks_count'))
            // Select relevant fields
            .select('name', 'path', 'backlinks_count', 'backlinks')
            // Take top 10
            .slice(0, 10)
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