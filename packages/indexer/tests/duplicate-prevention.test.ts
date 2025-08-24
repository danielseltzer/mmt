import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { VaultIndexer } from '../src/vault-indexer.js';
import { NodeFileSystem } from '@mmt/filesystem-access';

describe('Duplicate Prevention', () => {
  let testVaultPath: string;
  let indexer: VaultIndexer;
  let fs: NodeFileSystem;

  beforeEach(async () => {
    testVaultPath = mkdtempSync(join(tmpdir(), 'mmt-duplicate-test-'));
    fs = new NodeFileSystem();
    
    // Create initial test file
    writeFileSync(join(testVaultPath, 'test-doc.md'), `# Test Document
This is the initial content.`);
    
    indexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
    });
    
    await indexer.initialize();
  });

  afterEach(() => {
    rmSync(testVaultPath, { recursive: true, force: true });
  });

  it('should not create duplicate entries when file is updated multiple times', async () => {
    // GIVEN: A document that has been indexed
    // WHEN: The file is updated multiple times rapidly
    const filePath = join(testVaultPath, 'test-doc.md');
    
    // Update the file multiple times
    for (let i = 1; i <= 5; i++) {
      writeFileSync(filePath, `# Test Document
This is update number ${i}.`);
      await indexer.updateFile('test-doc.md');
    }
    
    // THEN: There should be only one entry for this document
    const allDocs = await indexer.getAllDocuments();
    const testDocs = allDocs.filter(doc => doc.relativePath === 'test-doc.md');
    
    expect(testDocs).toHaveLength(1);
    expect(testDocs[0].title).toBe('Test Document');
  });

  it('should handle file watcher events without creating duplicates', async () => {
    // GIVEN: A vault with file watching enabled
    const watchingIndexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
      fileWatching: {
        enabled: true,
        debounceMs: 50,
      },
    });
    
    await watchingIndexer.initialize();
    
    // WHEN: A file is modified multiple times (simulating file watcher events)
    const filePath = join(testVaultPath, 'watched-doc.md');
    
    // Create and modify file
    writeFileSync(filePath, '# Watched Document\nInitial content');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for watcher
    
    writeFileSync(filePath, '# Watched Document\nModified content');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for watcher
    
    writeFileSync(filePath, '# Watched Document\nFinal content');
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for watcher
    
    // THEN: There should be only one entry
    const allDocs = await watchingIndexer.getAllDocuments();
    const watchedDocs = allDocs.filter(doc => doc.relativePath === 'watched-doc.md');
    
    expect(watchedDocs).toHaveLength(1);
    expect(watchedDocs[0].title).toBe('Watched Document');
    
    await watchingIndexer.shutdown();
  });

  it('should handle re-indexing without creating duplicates', async () => {
    // GIVEN: A vault that has been indexed
    const allDocsInitial = await indexer.getAllDocuments();
    expect(allDocsInitial).toHaveLength(1);
    
    // WHEN: The indexer is re-initialized (simulating app restart)
    const newIndexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
    });
    
    await newIndexer.initialize();
    
    // THEN: There should still be only one entry
    const allDocsAfter = await newIndexer.getAllDocuments();
    expect(allDocsAfter).toHaveLength(1);
    expect(allDocsAfter[0].relativePath).toBe('test-doc.md');
  });
});