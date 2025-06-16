import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * List all files with a specific tag.
 * Comparable to Dataview:
 * ```dataview
 * LIST
 * FROM #project
 * ```
 */
export default class ListByTag implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: { 'tag': 'project' },
      operations: [
        { type: 'custom', action: 'list' }
      ],
      output: {
        format: 'detailed'
      }
    };
  }
}