import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Find broken links in the vault.
 * Identifies links that point to non-existent documents.
 */
export default class FindBrokenLinks implements Script {
  define(context: ScriptContext): OperationPipeline {
    return {
      select: {}, // Check all documents
      operations: [
        { 
          type: 'custom', 
          action: 'find-broken-links',
          handler: async (docs) => {
            const indexer = context.indexer;
            const brokenLinks: Array<{
              source: string;
              target: string;
              display: string;
            }> = [];
            
            console.log('\n=== Scanning for Broken Links ===');
            console.log(`Checking ${docs.length} documents...\n`);
            
            // Get all links from index
            const allLinks = await indexer.getAllLinks();
            
            // Check each link to see if target exists
            for (const link of allLinks) {
              const targetDoc = await indexer.getDocument(link.target);
              if (!targetDoc) {
                brokenLinks.push({
                  source: link.source,
                  target: link.target,
                  display: link.display || link.target,
                });
              }
            }
            
            if (brokenLinks.length === 0) {
              console.log('✅ No broken links found!');
            } else {
              console.log(`❌ Found ${brokenLinks.length} broken links:\n`);
              
              // Group by source document
              const bySource = new Map<string, typeof brokenLinks>();
              for (const link of brokenLinks) {
                if (!bySource.has(link.source)) {
                  bySource.set(link.source, []);
                }
                bySource.get(link.source)!.push(link);
              }
              
              // Display results
              let shown = 0;
              for (const [source, links] of bySource) {
                if (shown >= 10) {
                  console.log(`\n... and ${bySource.size - shown} more documents with broken links`);
                  break;
                }
                
                console.log(`\n📄 ${source}`);
                for (const link of links.slice(0, 5)) {
                  console.log(`   ❌ [[${link.display}]] → ${link.target} (not found)`);
                }
                if (links.length > 5) {
                  console.log(`   ... and ${links.length - 5} more broken links`);
                }
                shown++;
              }
            }
            
            return { 
              brokenLinks: brokenLinks.length,
              documentsAffected: new Set(brokenLinks.map(l => l.source)).size,
            };
          }
        }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}