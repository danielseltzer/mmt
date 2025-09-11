import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('API Documents search functionality', () => {
  let app;
  let testVaultPath;
  let testIndexPath;
  let tempDir;

  beforeAll(async () => {
    // Create real temp directories for testing
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-api-search-test-'));
    testVaultPath = join(tempDir, 'vault');
    testIndexPath = join(tempDir, 'index');
    
    mkdirSync(testVaultPath, { recursive: true });
    mkdirSync(testIndexPath, { recursive: true });
    
    // Create test documents
    writeFileSync(join(testVaultPath, 'alpha-guide.md'), `# Alpha Guide

This is a comprehensive guide about alpha features.
It contains detailed information about the alpha release.`);

    writeFileSync(join(testVaultPath, 'beta-notes.md'), `# Beta Notes

Notes about beta testing and beta features.
No mention of the other Greek letter here.`);

    writeFileSync(join(testVaultPath, 'release-notes.md'), `# Release Notes

This document covers both alpha and beta releases.
It's a general overview of all features.`);

    writeFileSync(join(testVaultPath, 'readme.md'), `# Project README

General project information.
Nothing specific about alpha or beta.`);
    
    // Create app with test config
    app = await createApp({
      vaults: [{
        name: 'TestVault',
        path: testVaultPath,
        indexPath: testIndexPath
      }]
    });
  });

  afterAll(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true });
  });

  it('should return all documents when no query is provided', async () => {
    const response = await request(app)
      .get('/api/documents')
      .expect(200);
    
    expect(response.body.total).toBe(4);
    expect(response.body.documents).toHaveLength(4);
  });

  it('should filter documents by search query', async () => {
    const response = await request(app)
      .get('/api/documents?q=alpha')
      .expect(200);
    
    
    // Should return only documents with "alpha" in their name/title
    // Note: Since we don't index actual file content, we search in metadata
    expect(response.body.total).toBe(1);
    expect(response.body.documents).toHaveLength(1);
    
    const names = response.body.documents.map(d => d.metadata.name).sort();
    expect(names).toEqual(['alpha-guide']);
  });

  it('should return empty results for non-matching query', async () => {
    const response = await request(app)
      .get('/api/documents?q=gamma')
      .expect(200);
    
    expect(response.body.total).toBe(0);
    expect(response.body.documents).toHaveLength(0);
    expect(response.body.hasMore).toBe(false);
  });

  it('should be case insensitive', async () => {
    const lowerResponse = await request(app)
      .get('/api/documents?q=beta')
      .expect(200);
    
    const upperResponse = await request(app)
      .get('/api/documents?q=BETA')
      .expect(200);
    
    expect(lowerResponse.body.total).toBe(upperResponse.body.total);
    // Should match 'beta-notes' filename
    expect(lowerResponse.body.total).toBe(1);
  });

  it('should handle partial matches', async () => {
    const response = await request(app)
      .get('/api/documents?q=alph')
      .expect(200);
    
    // Should match "alpha-guide" filename
    expect(response.body.total).toBe(1);
  });

  it('should properly paginate search results', async () => {
    // Search for something that matches multiple files
    const response = await request(app)
      .get('/api/documents?q=notes&limit=2&offset=0');
    
    expect(response.status).toBe(200);
    
    // "notes" should match "beta-notes" and "release-notes"
    expect(response.body.documents).toHaveLength(2);
    expect(response.body.hasMore).toBe(false);
  });

  it('should handle special characters in query', async () => {
    // Test that special regex characters are escaped
    const response = await request(app)
      .get('/api/documents?q=alpha.*')
      .expect(200);
    
    // Should treat .* as literal characters, not regex
    expect(response.body.total).toBe(0);
  });

  it('should return documents with proper metadata including modified field', async () => {
    const response = await request(app)
      .get('/api/documents?q=alpha')
      .expect(200);
    
    expect(response.body.documents.length).toBeGreaterThan(0);
    
    for (const doc of response.body.documents) {
      expect(doc.metadata).toHaveProperty('name');
      expect(doc.metadata).toHaveProperty('modified');
      expect(doc.metadata).toHaveProperty('size');
      expect(doc.metadata).toHaveProperty('tags');
      expect(doc.metadata).toHaveProperty('frontmatter');
    }
  });
});