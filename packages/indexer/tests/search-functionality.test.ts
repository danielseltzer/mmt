import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { VaultIndexer } from '../src/vault-indexer.js';
import { NodeFileSystem } from '@mmt/filesystem-access';

describe('Indexer search functionality', () => {
  let testVaultPath: string;
  let indexer: VaultIndexer;
  let fs: NodeFileSystem;

  beforeEach(async () => {
    // Create test vault
    testVaultPath = mkdtempSync(join(tmpdir(), 'mmt-search-test-'));
    fs = new NodeFileSystem();
    
    // Create test documents with distinct content
    writeFileSync(join(testVaultPath, 'alpha-document.md'), `# Alpha Document

This document contains information about alpha features.
It should match searches for "alpha".`);

    writeFileSync(join(testVaultPath, 'beta-features.md'), `# Beta Features

This document describes beta functionality.
It has nothing to do with alpha.`);

    writeFileSync(join(testVaultPath, 'alpha-and-beta.md'), `# Alpha and Beta Combined

This document mentions both alpha and beta concepts.
It should match searches for either term.`);

    writeFileSync(join(testVaultPath, 'gamma-notes.md'), `# Gamma Notes

Completely unrelated content about gamma rays.
Should not match alpha or beta searches.`);

    // Create a document in a subdirectory
    mkdirSync(join(testVaultPath, 'subfolder'));
    writeFileSync(join(testVaultPath, 'subfolder', 'nested-alpha.md'), `# Nested Alpha

This alpha document is in a subfolder.`);

    // Initialize indexer
    indexer = new VaultIndexer({
      vaultPath: testVaultPath,
      fileSystem: fs,
    });
    await indexer.initialize();
  });

  afterEach(() => {
    // Clean up
    rmSync(testVaultPath, { recursive: true });
  });

  it('should return all documents when query is empty', async () => {
    const results = indexer.query({
      conditions: []
    });
    
    expect(results).toHaveLength(5);
  });

  it('should filter documents by content containing search term', async () => {
    const results = indexer.query({
      conditions: [{
        field: 'content',
        operator: 'contains',
        value: 'alpha'
      }]
    });
    
    // Should return documents with "alpha" in content
    expect(results).toHaveLength(3);
    const names = results.map(doc => doc.basename).sort();
    expect(names).toEqual(['alpha-and-beta', 'alpha-document', 'nested-alpha']);
  });

  it('should filter documents by title/name containing search term', async () => {
    const results = indexer.query({
      conditions: [{
        field: 'title',
        operator: 'contains',
        value: 'alpha'
      }]
    });
    
    // Should return documents with "alpha" in title
    expect(results).toHaveLength(3);
    const titles = results.map(doc => doc.title).sort();
    expect(titles).toContain('Alpha Document');
    expect(titles).toContain('Alpha and Beta Combined');
    expect(titles).toContain('Nested Alpha');
  });

  it('should filter documents by basename containing search term', async () => {
    const results = indexer.query({
      conditions: [{
        field: 'fs:name',
        operator: 'contains',
        value: 'alpha'
      }]
    });
    
    // Should return documents with "alpha" in filename
    expect(results).toHaveLength(3);
    const names = results.map(doc => doc.basename).sort();
    expect(names).toEqual(['alpha-and-beta', 'alpha-document', 'nested-alpha']);
  });

  it('should return empty array when no documents match', async () => {
    const results = indexer.query({
      conditions: [{
        field: 'content',
        operator: 'contains',
        value: 'zeta'
      }]
    });
    
    expect(results).toHaveLength(0);
  });

  it('should be case insensitive for content searches', async () => {
    const upperResults = indexer.query({
      conditions: [{
        field: 'content',
        operator: 'contains',
        value: 'ALPHA'
      }]
    });
    
    const lowerResults = indexer.query({
      conditions: [{
        field: 'content',
        operator: 'contains',
        value: 'alpha'
      }]
    });
    
    expect(upperResults).toHaveLength(3);
    expect(lowerResults).toHaveLength(3);
    expect(upperResults.map(d => d.basename).sort()).toEqual(
      lowerResults.map(d => d.basename).sort()
    );
  });

  it('should handle partial matches', async () => {
    const results = indexer.query({
      conditions: [{
        field: 'content',
        operator: 'contains',
        value: 'alph'
      }]
    });
    
    // Should match "alpha" documents
    expect(results).toHaveLength(3);
  });

  it('should combine multiple conditions with AND logic', async () => {
    const results = indexer.query({
      conditions: [
        {
          field: 'content',
          operator: 'contains',
          value: 'alpha'
        },
        {
          field: 'content',
          operator: 'contains',
          value: 'beta'
        }
      ]
    });
    
    // Only documents with both alpha AND beta
    expect(results).toHaveLength(1);
    expect(results[0].basename).toBe('alpha-and-beta');
  });

  it('should search in path for path queries', async () => {
    const results = indexer.query({
      conditions: [{
        field: 'fs:path',
        operator: 'contains',
        value: 'subfolder'
      }]
    });
    
    expect(results).toHaveLength(1);
    expect(results[0].basename).toBe('nested-alpha');
  });

  it('should work with the simplified string query API if provided', async () => {
    // If the indexer supports a simple string query API
    // This would search across name, title, content, and path
    // For now, let's test what the API expects
    const results = indexer.query({
      conditions: [{
        field: 'content',
        operator: 'contains',
        value: 'beta'
      }]
    });
    
    expect(results).toHaveLength(2);
    const names = results.map(doc => doc.basename).sort();
    expect(names).toEqual(['alpha-and-beta', 'beta-features']);
  });
});