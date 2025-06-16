import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { VaultIndexer } from '../src/vault-indexer.js';
import { NodeFileSystem } from '@mmt/filesystem-access';
import type { PageMetadata } from '../src/types.js';

describe('Indexer E2E', () => {
  let testVaultPath: string;
  let indexer: VaultIndexer;
  let fs: NodeFileSystem;

  beforeEach(async () => {
    // Create test vault with known structure
    testVaultPath = mkdtempSync(join(tmpdir(), 'mmt-indexer-test-'));
    fs = new NodeFileSystem();

    // Create test files
    writeFileSync(join(testVaultPath, 'doc1.md'), `# Document 1
This document contains [[doc2]] and [[doc3]].

It also has a regular [markdown link](doc3.md).`);

    writeFileSync(join(testVaultPath, 'doc2.md'), `---
kind: test
status: draft
---
# Document 2

This links back to [[doc1]].`);

    writeFileSync(join(testVaultPath, 'doc3.md'), `---
kind: test
tags: [important, test]
---
# Document 3

This has a [link to doc1](doc1.md).`);

    // Create a subfolder with more documents
    mkdirSync(join(testVaultPath, 'folder'));
    writeFileSync(join(testVaultPath, 'folder', 'nested.md'), `---
kind: nested
---
# Nested Document

Links to [[doc1]] in parent folder.`);

    // Initialize indexer
    indexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
    });
    
    await indexer.initialize();
  });

  afterEach(() => {
    // Clean up test vault
    rmSync(testVaultPath, { recursive: true, force: true });
  });

  it('indexes a small vault and finds all documents', async () => {
    const allDocs = await indexer.getAllDocuments();
    
    expect(allDocs).toHaveLength(4);
    expect(allDocs.map(d => d.relativePath).sort()).toEqual([
      'doc1.md',
      'doc2.md', 
      'doc3.md',
      'folder/nested.md'
    ]);
  });

  it('finds all files linking TO doc1 (should return doc2, doc3)', async () => {
    const backlinks = await indexer.getBacklinks('doc1.md');
    
    expect(backlinks).toHaveLength(3);
    expect(backlinks.map(d => d.relativePath).sort()).toEqual([
      'doc2.md',
      'doc3.md',
      'folder/nested.md'
    ]);
  });

  it('finds all files linked FROM doc1 (should return doc2, doc3)', async () => {
    const outgoingLinks = await indexer.getOutgoingLinks('doc1.md');
    
    expect(outgoingLinks).toHaveLength(2);
    expect(outgoingLinks.map(d => d.relativePath).sort()).toEqual([
      'doc2.md',
      'doc3.md'
    ]);
  });

  it('queries by frontmatter property kind:test', async () => {
    const results = await indexer.query({
      conditions: [
        { field: 'fm:kind', operator: 'equals', value: 'test' }
      ]
    });
    
    expect(results).toHaveLength(2);
    expect(results.map(d => d.relativePath).sort()).toEqual([
      'doc2.md',
      'doc3.md'
    ]);
  });

  it('queries by path pattern path:/folder/*', async () => {
    const results = await indexer.query({
      conditions: [
        { field: 'fs:path', operator: 'matches', value: 'folder/*' }
      ]
    });
    
    expect(results).toHaveLength(1);
    expect(results[0].relativePath).toBe('folder/nested.md');
  });

  it('combines text search with property filter', async () => {
    // Query for documents with kind:test that contain "Document"
    const results = await indexer.query({
      conditions: [
        { field: 'fm:kind', operator: 'equals', value: 'test' },
        { field: 'content', operator: 'contains', value: 'Document' }
      ]
    });
    
    expect(results).toHaveLength(2);
    expect(results.map(d => d.relativePath).sort()).toEqual([
      'doc2.md',
      'doc3.md'
    ]);
  });

  it('updates index when file is modified', async () => {
    // Modify doc1 to remove link to doc2
    writeFileSync(join(testVaultPath, 'doc1.md'), `# Document 1
This document only contains [[doc3]] now.`);
    
    // Trigger update
    await indexer.updateFile('doc1.md');
    
    // Check that doc2 is no longer in outgoing links
    const outgoingLinks = await indexer.getOutgoingLinks('doc1.md');
    expect(outgoingLinks).toHaveLength(1);
    expect(outgoingLinks[0].relativePath).toBe('doc3.md');
    
    // Check that doc2 no longer has doc1 as backlink
    const doc2Backlinks = await indexer.getBacklinks('doc2.md');
    expect(doc2Backlinks).toHaveLength(0);
  });

  it('updates links when file is moved', async () => {
    // Move doc2 to a new location
    const oldPath = join(testVaultPath, 'doc2.md');
    const newPath = join(testVaultPath, 'folder', 'doc2-moved.md');
    
    // Read content, delete old, write new
    const content = await fs.readFile(oldPath);
    await fs.unlink(oldPath);
    await fs.writeFile(newPath, content);
    
    // Update indexer
    await indexer.deleteFile('doc2.md');
    await indexer.updateFile('folder/doc2-moved.md');
    
    // Check that links are updated
    const doc1Backlinks = await indexer.getBacklinks('doc1.md');
    expect(doc1Backlinks.map(d => d.relativePath)).toContain('folder/doc2-moved.md');
  });

  it('handles 5000 files in < 5 seconds', async () => {
    // Create a large test vault
    const largeVaultPath = mkdtempSync(join(tmpdir(), 'mmt-large-vault-'));
    
    // Create 5000 test files
    console.log('Creating 5000 test files...');
    for (let i = 0; i < 5000; i++) {
      const folderNum = Math.floor(i / 100);
      const folderPath = join(largeVaultPath, `folder${folderNum}`);
      
      if (i % 100 === 0) {
        mkdirSync(folderPath, { recursive: true });
      }
      
      const content = `---
id: ${i}
category: ${folderNum}
tags: [tag${i % 10}, category${folderNum}]
---
# Document ${i}

This is test document number ${i}.

It links to [[doc${(i + 1) % 5000}]] and [[doc${(i + 2) % 5000}]].

#tag${i % 20} #anothertag
`;
      
      writeFileSync(join(folderPath, `doc${i}.md`), content);
    }
    
    // Create indexer and measure time
    const largeIndexer = new VaultIndexer({
      vaultPath: largeVaultPath,
      fileSystem: fs,
      useCache: true,
      useWorkers: true,
    });
    
    const startTime = Date.now();
    await largeIndexer.initialize();
    const duration = Date.now() - startTime;
    
    console.log(`Indexed 5000 files in ${duration}ms`);
    
    // Verify indexing completed
    const allDocs = await largeIndexer.getAllDocuments();
    expect(allDocs).toHaveLength(5000);
    
    // Check performance
    expect(duration).toBeLessThan(5000);
    
    // Clean up
    rmSync(largeVaultPath, { recursive: true, force: true });
  }, 10000); // 10 second timeout for this test
});