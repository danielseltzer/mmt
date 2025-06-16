import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Count files by frontmatter type field.
 * This allows comparison with Dataview queries like:
 * ```dataview
 * TABLE length(rows) as Count
 * FROM ""
 * GROUP BY type
 * ```
 */
export default class CountByType implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: { 'fm:type': 'daily' },
      operations: [
        { type: 'custom', action: 'count' }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}