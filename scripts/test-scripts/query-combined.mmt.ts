import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Complex query example - combines multiple selection criteria.
 * 
 * Purpose: Demonstrate advanced document selection with multiple filters
 * Use case: Find documents matching both path and frontmatter conditions
 * Features: Path filtering, frontmatter queries, custom field selection
 * 
 * Comparable to Dataview:
 * ```dataview
 * TABLE status, modified
 * FROM "projects"
 * WHERE status = "active"
 * ```
 */
export default class QueryCombined implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: { 
        'fs:path': 'projects/*',
        'fm:status': 'active'
      },
      operations: [
        { type: 'custom', action: 'list' }
      ],
      output: [
        {
          format: 'csv',
          destination: 'console',
          fields: ['path', 'fm:status', 'modified']
        }
      ]
    };
  }
}