import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, utimesSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { VaultIndexer } from '../src/vault-indexer.js';
import { NodeFileSystem } from '@mmt/filesystem-access';

describe('Indexer mtime field', () => {
  let testVaultPath: string;
  let indexer: VaultIndexer;
  let fs: NodeFileSystem;

  beforeEach(async () => {
    // Create test vault
    testVaultPath = mkdtempSync(join(tmpdir(), 'mmt-mtime-test-'));
    fs = new NodeFileSystem();
  });

  afterEach(() => {
    // Clean up
    rmSync(testVaultPath, { recursive: true });
  });

  it('should include mtime field in indexed documents', async () => {
    // Create a test file with a specific modification time
    const filePath = join(testVaultPath, 'test-doc.md');
    writeFileSync(filePath, '# Test Document\n\nThis is a test document.');
    
    // Set a specific modification time (1 hour ago)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    utimesSync(filePath, oneHourAgo, oneHourAgo);

    // Initialize and run indexer
    indexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
    });
    await indexer.initialize();

    // Get all documents
    const documents = indexer.getAllDocuments();
    
    // Assert we have one document
    expect(documents).toHaveLength(1);
    
    // Assert the document has the mtime field
    const doc = documents[0];
    expect(doc).toHaveProperty('mtime');
    expect(doc.mtime).toBe(oneHourAgo.getTime());
    
    // Also check that other expected fields are present
    expect(doc).toHaveProperty('path', filePath);
    expect(doc).toHaveProperty('basename', 'test-doc');
    expect(doc).toHaveProperty('title', 'Test Document');
    expect(doc).toHaveProperty('size');
    expect(doc).toHaveProperty('ctime');
  });

  it('should include mtime field in query results', async () => {
    // Create multiple test files with different modification times
    const file1Path = join(testVaultPath, 'alpha.md');
    const file2Path = join(testVaultPath, 'beta.md');
    
    writeFileSync(file1Path, '# Alpha Document\n\nContent with alpha keyword.');
    writeFileSync(file2Path, '# Beta Document\n\nContent with beta keyword.');
    
    // Set different modification times
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    utimesSync(file1Path, twoHoursAgo, twoHoursAgo);
    utimesSync(file2Path, oneHourAgo, oneHourAgo);

    // Initialize and run indexer
    indexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
    });
    await indexer.initialize();

    // Query for documents containing "alpha"
    const results = indexer.query({
      conditions: [{
        field: 'content',
        operator: 'contains',
        value: 'alpha'
      }]
    });
    
    // Assert we get results with mtime field
    expect(results.length).toBeGreaterThan(0);
    
    for (const doc of results) {
      expect(doc).toHaveProperty('mtime');
      expect(typeof doc.mtime).toBe('number');
      expect(doc.mtime).toBeGreaterThan(0);
    }
  });

  it('should update mtime when a file is modified', async () => {
    // Create a test file
    const filePath = join(testVaultPath, 'changing-doc.md');
    writeFileSync(filePath, '# Original Document\n\nOriginal content.');
    
    // Set initial modification time
    const initialTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
    utimesSync(filePath, initialTime, initialTime);

    // Initialize indexer
    indexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
    });
    await indexer.initialize();

    // Get initial document
    const initialDocs = indexer.getAllDocuments();
    expect(initialDocs[0].mtime).toBe(initialTime.getTime());

    // Update the file
    writeFileSync(filePath, '# Updated Document\n\nUpdated content.');
    const updatedTime = new Date();
    utimesSync(filePath, updatedTime, updatedTime);

    // Update the index
    await indexer.updateFile('changing-doc.md');

    // Get updated document
    const updatedDocs = indexer.getAllDocuments();
    expect(updatedDocs[0].mtime).toBe(updatedTime.getTime());
    expect(updatedDocs[0].title).toBe('Updated Document');
  });
});