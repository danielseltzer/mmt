import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find all files in a specific folder.
 * Comparable to Dataview:
 * ```dataview
 * LIST
 * FROM "journal"
 * ```
 */
export default class FindInPath implements Script {
  define(context: ScriptContext): OperationPipeline {
    const folder = context.cliOptions.folder || 'journal';
    
    return {
      select: { 'fs:path': `${folder}/*` },
      operations: [
        { type: 'custom', action: 'list' }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}