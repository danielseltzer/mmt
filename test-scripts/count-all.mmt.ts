import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Count all markdown files in the vault.
 * Simple test to verify indexer is working.
 */
export default class CountAll implements Script {
  define(context: ScriptContext): OperationPipeline {
    console.log('Vault path:', context.vaultPath);
    console.log('Indexer available:', !!context.indexer);
    
    return {
      select: {}, // Empty criteria = all files
      operations: [
        { type: 'custom', action: 'count' }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}