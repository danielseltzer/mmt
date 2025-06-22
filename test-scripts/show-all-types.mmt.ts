import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Show all files and their type field values.
 * This helps discover what type values exist in the vault.
 */
export default class ShowAllTypes implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: {}, // Select all files
      filter: doc => doc.metadata.frontmatter.type !== undefined, // Only files with type field
      operations: [
        { type: 'custom', action: 'list' }
      ],
      output: {
        format: 'csv',
        fields: ['path', 'frontmatter.type']
      }
    };
  }
}