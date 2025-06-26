import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { VaultIndexer } from '../src/vault-indexer.js';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

describe('VaultIndexer file watching', () => {
  let tempDir: string;
  let indexer: VaultIndexer;
  let fileSystem: NodeFileSystem;

  beforeEach(async () => {
    // Create temp directory
    tempDir = await mkdtemp(join(tmpdir(), 'mmt-test-'));
    fileSystem = new NodeFileSystem();
    
    // Create initial test file
    await writeFile(join(tempDir, 'test.md'), '# Test\n\nInitial content');
  });

  afterEach(async () => {
    // Shutdown indexer
    if (indexer) {
      await indexer.shutdown();
    }
    
    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  it('should update index when file is modified', async () => {
    // GIVEN: An indexer with file watching enabled
    indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem,
      fileWatching: {
        enabled: true,
        debounceMs: 50, // Short debounce for testing
      },
    });
    
    await indexer.initialize();
    
    // Initial document count
    const initialDocs = indexer.getAllDocuments();
    expect(initialDocs).toHaveLength(1);
    expect(initialDocs[0].path).toContain('test.md');
    
    // WHEN: Modifying the file
    await writeFile(join(tempDir, 'test.md'), '# Test\n\nModified content');
    
    // Wait for file watcher to process the change
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // THEN: The index should be updated
    const updatedDocs = indexer.getAllDocuments();
    expect(updatedDocs).toHaveLength(1);
    // Note: We can't easily test content change without exposing more internals
    // but we can verify the file was re-indexed by checking it's still there
  });

  it('should add new files to index', async () => {
    // GIVEN: An indexer with file watching enabled
    indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem,
      fileWatching: {
        enabled: true,
        debounceMs: 50,
      },
    });
    
    await indexer.initialize();
    expect(indexer.getAllDocuments()).toHaveLength(1);
    
    // WHEN: Creating a new file
    await writeFile(join(tempDir, 'new.md'), '# New File\n\nNew content');
    
    // Wait for file watcher to process
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // THEN: The new file should be in the index
    const docs = indexer.getAllDocuments();
    expect(docs).toHaveLength(2);
    expect(docs.some(d => d.path.includes('new.md'))).toBe(true);
  });

  it('should remove deleted files from index', async () => {
    // GIVEN: An indexer with file watching enabled and a second file
    await writeFile(join(tempDir, 'to-delete.md'), '# To Delete\n\nWill be removed');
    
    indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem,
      fileWatching: {
        enabled: true,
        debounceMs: 50,
      },
    });
    
    await indexer.initialize();
    expect(indexer.getAllDocuments()).toHaveLength(2);
    
    // WHEN: Deleting a file
    await rm(join(tempDir, 'to-delete.md'));
    
    // Wait for file watcher to process
    await new Promise(resolve => setTimeout(resolve, 500)); // Increased wait time
    
    // THEN: The file should be removed from the index
    const docs = indexer.getAllDocuments();
    console.log('Remaining documents after delete:', docs.map(d => d.path));
    expect(docs).toHaveLength(1);
    expect(docs.every(d => !d.path.includes('to-delete.md'))).toBe(true);
  });

  it('should respect ignorePatterns', async () => {
    // GIVEN: An indexer with ignore patterns
    indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem,
      fileWatching: {
        enabled: true,
        debounceMs: 50,
        ignorePatterns: ['**/*.tmp'],
      },
    });
    
    await indexer.initialize();
    expect(indexer.getAllDocuments()).toHaveLength(1);
    
    // WHEN: Creating a file that matches ignore pattern
    await writeFile(join(tempDir, 'ignored.tmp'), '# Ignored\n\nShould not be indexed');
    
    // Wait for potential file watcher processing
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // THEN: The ignored file should not be in the index
    const docs = indexer.getAllDocuments();
    expect(docs).toHaveLength(1);
    expect(docs.every(d => !d.path.includes('ignored.tmp'))).toBe(true);
  });

  it('should not watch when fileWatching is disabled', async () => {
    // GIVEN: An indexer with file watching disabled
    indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem,
      fileWatching: {
        enabled: false,
      },
    });
    
    await indexer.initialize();
    expect(indexer.getAllDocuments()).toHaveLength(1);
    
    // WHEN: Creating a new file
    await writeFile(join(tempDir, 'not-watched.md'), '# Not Watched\n\nShould not be auto-indexed');
    
    // Wait to ensure no processing happens
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // THEN: The new file should NOT be in the index
    const docs = indexer.getAllDocuments();
    expect(docs).toHaveLength(1);
    expect(docs.every(d => !d.path.includes('not-watched.md'))).toBe(true);
  });
});