import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find all daily notes in the vault.
 * Daily notes typically have a date pattern in the filename or path.
 */
export default class FindDailyNotes implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: { 'fs:path': '**/Daily/*' }, // Look in Daily folders
      operations: [
        { type: 'custom', action: 'count' }
      ],
      output: [
        {
          format: 'summary',
          destination: 'console'
        }
      ]
    };
  }
}