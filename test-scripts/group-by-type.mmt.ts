import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Group and count all files by their type field.
 * Shows distribution of document types in the vault.
 */
export default class GroupByType implements Script {
  define(context: ScriptContext): OperationPipeline {
    // First, let's get ALL documents to see the distribution
    console.log('\n=== Document Type Distribution ===');
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'custom', 
          action: 'analyze',
          handler: (docs) => {
            const typeCount = new Map<string, number>();
            
            // Count documents by type
            for (const doc of docs) {
              const type = doc.metadata.frontmatter.type || '(no type)';
              typeCount.set(type, (typeCount.get(type) || 0) + 1);
            }
            
            // Sort by count descending
            const sorted = Array.from(typeCount.entries())
              .sort((a, b) => b[1] - a[1]);
            
            // Display results
            console.log(`\nTotal documents: ${docs.length}`);
            console.log(`Documents with type field: ${docs.filter(d => d.metadata.frontmatter.type).length}`);
            console.log(`\nBreakdown by type:`);
            
            for (const [type, count] of sorted) {
              const percentage = ((count / docs.length) * 100).toFixed(1);
              console.log(`  ${type}: ${count} (${percentage}%)`);
            }
            
            return { analyzed: docs.length };
          }
        }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}