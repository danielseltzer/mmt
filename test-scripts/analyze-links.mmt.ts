import type { Script, ScriptContext, OperationPipeline } from '@mmt/scripting';

/**
 * Analyze document links - demonstrates link extraction capabilities.
 * Shows incoming and outgoing links for documents.
 */
export default class AnalyzeLinks implements Script {
  define(context: ScriptContext): OperationPipeline {
    // Do the analysis immediately since custom handlers aren't implemented yet
    const indexer = context.indexer;
    
    // Query for Daily notes
    const dailyNotes = await indexer.query({ 
      conditions: [{ field: 'fs:path', operator: 'matches', value: 'Daily/*' }] 
    });
    
    console.log('\n=== Link Analysis ===');
    console.log(`Analyzing ${dailyNotes.length} daily notes...\n`);
    
    for (const doc of dailyNotes.slice(0, 5)) {
      console.log(`\n📄 ${doc.path}`);
      
      // Get outgoing links
      const outgoing = await indexer.getOutgoingLinks(doc.path);
      console.log(`  ↗️  Outgoing links (${outgoing.length}):`);
      for (const target of outgoing.slice(0, 3)) {
        console.log(`     → ${target.path}`);
      }
      if (outgoing.length > 3) {
        console.log(`     ... and ${outgoing.length - 3} more`);
      }
      
      // Get incoming links (backlinks)
      const incoming = await indexer.getIncomingLinks(doc.path);
      console.log(`  ↖️  Incoming links (${incoming.length}):`);
      for (const source of incoming.slice(0, 3)) {
        console.log(`     ← ${source.path}`);
      }
      if (incoming.length > 3) {
        console.log(`     ... and ${incoming.length - 3} more`);
      }
    }
    
    // Summary statistics
    console.log('\n=== Summary ===');
    let totalOutgoing = 0;
    let totalIncoming = 0;
    let orphans = 0;
    
    for (const doc of dailyNotes) {
      const outgoing = await indexer.getOutgoingLinks(doc.path);
      const incoming = await indexer.getIncomingLinks(doc.path);
      
      totalOutgoing += outgoing.length;
      totalIncoming += incoming.length;
      
      if (incoming.length === 0 && outgoing.length === 0) {
        orphans++;
      }
    }
    
    console.log(`Total documents analyzed: ${dailyNotes.length}`);
    console.log(`Total outgoing links: ${totalOutgoing}`);
    console.log(`Total incoming links: ${totalIncoming}`);
    console.log(`Orphan documents (no links): ${orphans}`);
    console.log(`Average outgoing links per doc: ${(totalOutgoing / dailyNotes.length).toFixed(1)}`);
    console.log(`Average incoming links per doc: ${(totalIncoming / dailyNotes.length).toFixed(1)}`);
    
    return {
      select: { 'fs:path': 'Daily/*' },
      operations: [
        { type: 'custom', action: 'analyze-links' }
      ],
      output: {
        format: 'summary'
      }
    };
  }
}