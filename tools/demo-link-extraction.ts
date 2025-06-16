#!/usr/bin/env tsx

/**
 * Standalone demonstration of link extraction capabilities.
 * This bypasses the scripting system to directly show indexer functionality.
 */

import { VaultIndexer } from '../packages/indexer/src/vault-indexer.js';
import { NodeFileSystem } from '../packages/filesystem-access/src/index.js';
import { join } from 'path';

async function demonstrateLinkExtraction() {
  console.log('=== Link Extraction Demo ===\n');
  
  // Initialize indexer with test vault
  const vaultPath = join(process.cwd(), 'test-vault');
  const indexPath = join(process.cwd(), '.mmt-data/indexes/demo');
  
  console.log(`Vault: ${vaultPath}`);
  console.log(`Index: ${indexPath}\n`);
  
  const fs = new NodeFileSystem();
  const indexer = new VaultIndexer({
    vaultPath,
    indexPath,
    useCache: false, // Fresh index for demo
    fileSystem: fs,
  });
  
  // Initialize the indexer
  await indexer.initialize();
  console.log('Indexing complete\n');
  
  // Get all documents
  const allDocs = await indexer.getAllDocuments();
  console.log(`Found ${allDocs.length} documents\n`);
  
  console.log('=== Document Link Analysis ===\n');
  
  for (const doc of allDocs) {
    console.log(`📄 ${doc.path}`);
    
    // Convert to relative path
    const relativePath = doc.path.replace(vaultPath + '/', '');
    
    // Get outgoing links
    const outgoing = await indexer.getOutgoingLinks(relativePath);
    if (outgoing.length > 0) {
      console.log(`  ↗️  Outgoing links (${outgoing.length}):`);
      for (const target of outgoing) {
        console.log(`     → ${target.path}`);
      }
    }
    
    // Get incoming links
    const incoming = await indexer.getBacklinks(relativePath);
    if (incoming.length > 0) {
      console.log(`  ↖️  Incoming links (${incoming.length}):`);
      for (const source of incoming) {
        console.log(`     ← ${source.path}`);
      }
    }
    
    if (outgoing.length === 0 && incoming.length === 0) {
      console.log(`  ⚠️  No links`);
    }
    
    console.log();
  }
  
  // Show link statistics
  console.log('=== Link Statistics ===\n');
  
  let totalOutgoing = 0;
  let totalIncoming = 0;
  let orphanDocs = 0;
  
  for (const doc of allDocs) {
    const relativePath = doc.path.replace(vaultPath + '/', '');
    const outgoing = await indexer.getOutgoingLinks(relativePath);
    const incoming = await indexer.getBacklinks(relativePath);
    
    totalOutgoing += outgoing.length;
    totalIncoming += incoming.length;
    
    if (outgoing.length === 0 && incoming.length === 0) {
      orphanDocs++;
    }
  }
  
  console.log(`Total documents: ${allDocs.length}`);
  console.log(`Total outgoing links: ${totalOutgoing}`);
  console.log(`Total incoming links: ${totalIncoming}`);
  console.log(`Documents with no links: ${orphanDocs}`);
  console.log(`Average outgoing links per doc: ${(totalOutgoing / allDocs.length).toFixed(1)}`);
  console.log(`Average incoming links per doc: ${(totalIncoming / allDocs.length).toFixed(1)}`);
  
  // Clean up is automatic
}

// Run the demo
demonstrateLinkExtraction().catch(console.error);