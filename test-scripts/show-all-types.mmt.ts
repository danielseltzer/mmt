import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Show all files with their type field values.
 * This helps discover what type values exist in the vault.
 * 
 * Uses Arquero to filter and display only documents with a type field.
 */
export default class ShowAllTypes implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => table
            // Filter to only documents with type field
            .filter((d: any) => d.fm_type !== undefined && d.fm_type !== null)
            // Select relevant columns
            .select('name', 'fm_type', 'path')
            // Sort by type then name
            .orderby('fm_type', 'name')
        }
      ],
      output: {
        format: 'table'
      }
    };
  }
}