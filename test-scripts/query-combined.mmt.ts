import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Combined query with multiple conditions.
 * Tests complex queries like:
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