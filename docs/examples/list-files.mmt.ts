import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Example MMT script that lists files - the only fully working example.
 * 
 * This demonstrates:
 * - Explicit file list selection (the only working selection method)
 * - Preview mode (no operations executed)
 * - Different output formats
 * 
 * This script WORKS because it only uses preview mode and doesn't
 * attempt any actual operations.
 */
export default class ListFiles implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      // Only explicit file selection currently works
      select: { 
        files: [
          'README.md',
          'CLAUDE.md',
          'package.json',
        ]
      },
      
      // We define operations but they won't execute in preview mode
      operations: [
        { 
          type: 'move',
          destination: 'archived'
        }
      ],
      
      // Try different output formats
      output: { 
        format: 'detailed'  // or 'summary', 'json', 'csv'
      }
      
      // No executeNow - stays in safe preview mode
    };
  }
}