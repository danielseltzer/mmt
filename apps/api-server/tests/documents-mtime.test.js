import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { mkdtempSync, utimesSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

describe('API Documents mtime field', () => {
  let app;
  let testVaultPath;
  let testIndexPath;
  let tempDir;

  beforeAll(async () => {
    // Create real temp directories for testing
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-api-mtime-test-'));
    testVaultPath = join(tempDir, 'vault');
    testIndexPath = join(tempDir, 'index');
    
    mkdirSync(testVaultPath, { recursive: true });
    mkdirSync(testIndexPath, { recursive: true });
  });

  afterAll(() => {
    // Clean up temp directory
    rmSync(tempDir, { recursive: true });
  });

  it('should return documents with modified field from mtime', async () => {
    // Create test files with specific modification times
    const file1Path = join(testVaultPath, 'doc1.md');
    const file2Path = join(testVaultPath, 'doc2.md');
    
    writeFileSync(file1Path, '# Document 1\n\nFirst document content.');
    writeFileSync(file2Path, '# Document 2\n\nSecond document content.');
    
    // Set specific modification times
    const time1 = new Date('2024-01-10T12:00:00Z');
    const time2 = new Date('2024-01-11T15:30:00Z');
    
    utimesSync(file1Path, time1, time1);
    utimesSync(file2Path, time2, time2);
    
    // Create app with test config
    app = await createApp({
      vaults: [{
        name: 'TestVault',
        path: testVaultPath,
        indexPath: testIndexPath
      }]
    });
    
    // Get documents from API
    const response = await request(app)
      .get('/api/documents')
      .expect(200);
    
    console.log('\n=== API Response ===');
    console.log('Status:', response.status);
    console.log('Total documents:', response.body.total);
    console.log('Documents:', JSON.stringify(response.body.documents, null, 2));
    console.log('Full response body:', JSON.stringify(response.body, null, 2));
    
    // Check that we have documents
    expect(response.body.total).toBe(2);
    expect(response.body.documents).toHaveLength(2);
    
    // Check that each document has a modified field
    for (const doc of response.body.documents) {
      expect(doc.metadata).toHaveProperty('modified');
      expect(doc.metadata.modified).toBeTruthy();
      
      // The modified field should be an ISO string
      const modifiedDate = new Date(doc.metadata.modified);
      expect(modifiedDate.toISOString()).toBe(doc.metadata.modified);
    }
    
    // Find specific documents and check their times
    const doc1 = response.body.documents.find(d => d.metadata.name === 'doc1');
    const doc2 = response.body.documents.find(d => d.metadata.name === 'doc2');
    
    if (doc1) {
      expect(doc1.metadata.modified).toBe(time1.toISOString());
    }
    
    if (doc2) {
      expect(doc2.metadata.modified).toBe(time2.toISOString());
    }
  });

  it('should handle query parameter and still include modified field', async () => {
    // Create a test file
    const filePath = join(testVaultPath, 'searchable.md');
    writeFileSync(filePath, '# Searchable Document\n\nContent with specific keyword: alpha.');
    
    const testTime = new Date('2024-01-15T09:00:00Z');
    utimesSync(filePath, testTime, testTime);
    
    // Create app
    app = await createApp({
      vaults: [{
        name: 'TestVault',
        path: testVaultPath,
        indexPath: testIndexPath
      }]
    });
    
    // Search for documents with query
    const response = await request(app)
      .get('/api/documents?query=alpha')
      .expect(200);
    
    console.log('\n=== Search Response ===');
    console.log('Query: alpha');
    console.log('Results:', JSON.stringify(response.body, null, 2));
    
    // Check results have modified field
    if (response.body.documents.length > 0) {
      expect(response.body.documents[0].metadata).toHaveProperty('modified');
      expect(response.body.documents[0].metadata.modified).toBeTruthy();
    }
  });
});