import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Shows bidirectional link analysis - both outgoing and incoming links.
 * Note: Currently only shows outgoing links as incoming link API is not yet exposed.
 */
export default class ShowBidirectionalLinks implements Script {
  define(context: ScriptContext): OperationPipeline {
    const { aq } = context as any;
    
    return {
      select: {}, // Select all files
      operations: [
        { 
          type: 'analyze',
          transform: (table: any) => {
            console.log('\n=== BIDIRECTIONAL LINK ANALYSIS ===\n');
            
            // Show each document's outgoing links
            const docs = table.objects();
            for (const doc of docs) {
              console.log(`📄 ${doc.name}`);
              console.log(`   Path: ${doc.path}`);
              
              if (doc.links_count > 0) {
                console.log(`   ↗️  Outgoing links (${doc.links_count}):`);
                const links = doc.links.split(', ');
                for (const link of links) {
                  console.log(`      → ${link}`);
                }
              } else {
                console.log(`   ↗️  No outgoing links`);
              }
              
              // Note: Incoming links would require additional API
              console.log(`   ↖️  Incoming links: (API not yet exposed in scripting)\n`);
            }
            
            return table;
          }
        }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}