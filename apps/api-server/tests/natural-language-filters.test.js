import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFileSync, mkdirSync, utimesSync } from 'fs';

describe('Natural Language Filter API', () => {
  let app;
  let testVaultPath;
  let testIndexPath;
  let tempDir;

  beforeAll(async () => {
    // Mock current date for consistent testing
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));

    // Create real temp directories for testing
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-api-nl-filter-test-'));
    testVaultPath = join(tempDir, 'vault');
    testIndexPath = join(tempDir, 'index');
    
    mkdirSync(testVaultPath, { recursive: true });
    mkdirSync(testIndexPath, { recursive: true });
    
    // Create test documents with various dates and sizes
    const now = new Date('2024-06-15T12:00:00Z');
    
    // Document from today
    const todayPath = join(testVaultPath, 'today.md');
    writeFileSync(todayPath, 'Today content');
    utimesSync(todayPath, now, now);
    
    // Document from 5 days ago
    const recentPath = join(testVaultPath, 'recent.md');
    writeFileSync(recentPath, 'Recent content that is a bit longer');
    const fiveDaysAgo = new Date(now);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    utimesSync(recentPath, fiveDaysAgo, fiveDaysAgo);
    
    // Document from 40 days ago
    const olderPath = join(testVaultPath, 'older.md');
    writeFileSync(olderPath, 'Older content');
    const fortyDaysAgo = new Date(now);
    fortyDaysAgo.setDate(fortyDaysAgo.getDate() - 40);
    utimesSync(olderPath, fortyDaysAgo, fortyDaysAgo);
    
    // Large document from 3 days ago
    const largePath = join(testVaultPath, 'large.md');
    writeFileSync(largePath, 'L'.repeat(15 * 1024)); // Exactly 15KB file
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    utimesSync(largePath, threeDaysAgo, threeDaysAgo);
    
    // Very large document from last year
    const veryLargePath = join(testVaultPath, 'very-large.md');
    writeFileSync(veryLargePath, 'X'.repeat(1024 * 1024 + 100)); // Just over 1MB
    const lastYear = new Date(now);
    lastYear.setFullYear(lastYear.getFullYear() - 1);
    utimesSync(veryLargePath, lastYear, lastYear);
    
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
    vi.useRealTimers();
    // Clean up temp directory
    rmSync(tempDir, { recursive: true });
  });

  describe('Date Expression Filters', () => {
    it('should filter documents from last 7 days', async () => {
      const filters = JSON.stringify({ dateExpression: 'last 7 days' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(3); // today, recent, large
      const names = response.body.documents.map(d => d.metadata.name).sort();
      expect(names).toEqual(['large', 'recent', 'today']);
    });

    it('should filter documents using "< 7 days" syntax', async () => {
      const filters = JSON.stringify({ dateExpression: '< 7 days' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(3); // today, recent, large (same as "last 7 days")
      const names = response.body.documents.map(d => d.metadata.name).sort();
      expect(names).toEqual(['large', 'recent', 'today']);
    });

    it('should filter documents from last 30 days', async () => {
      const filters = JSON.stringify({ dateExpression: 'last 30 days' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(3); // today, recent, large (not older)
    });

    it('should filter documents from this year', async () => {
      const filters = JSON.stringify({ dateExpression: 'this year' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(4); // all except very-large
    });

    it('should filter documents since a specific year', async () => {
      const filters = JSON.stringify({ dateExpression: 'since 2024' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(4); // all 2024 documents
    });
  });

  describe('Size Expression Filters', () => {
    it('should filter documents over 10k', async () => {
      const filters = JSON.stringify({ sizeExpression: 'over 10k' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(2); // large and very-large
      const names = response.body.documents.map(d => d.metadata.name).sort();
      expect(names).toEqual(['large', 'very-large']);
    });

    it('should filter documents under 1kb', async () => {
      const filters = JSON.stringify({ sizeExpression: 'under 1kb' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(3); // today, recent, older (small files)
    });

    it('should filter documents over 1mb', async () => {
      const filters = JSON.stringify({ sizeExpression: 'over 1mb' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(1); // only very-large
      expect(response.body.documents[0].metadata.name).toBe('very-large');
    });

    it('should filter documents at least 15kb', async () => {
      const filters = JSON.stringify({ sizeExpression: 'at least 15kb' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(2); // large (15KB) and very-large
    });
  });

  describe('Combined Filters', () => {
    it('should combine date and size filters', async () => {
      const filters = JSON.stringify({ 
        dateExpression: 'last 7 days',
        sizeExpression: 'under 10k'
      });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(2); // today and recent (not large)
      const names = response.body.documents.map(d => d.metadata.name).sort();
      expect(names).toEqual(['recent', 'today']);
    });

    it('should combine natural language with other filters', async () => {
      const filters = JSON.stringify({ 
        dateExpression: 'this year',
        sizeExpression: 'over 10k',
        name: 'large' // traditional filter
      });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      expect(response.body.total).toBe(1); // only large (not very-large due to year filter)
      expect(response.body.documents[0].metadata.name).toBe('large');
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid date expressions gracefully', async () => {
      const filters = JSON.stringify({ dateExpression: 'invalid date' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      // Should return all documents when filter is invalid
      expect(response.body.total).toBe(5);
    });

    it('should handle invalid size expressions gracefully', async () => {
      const filters = JSON.stringify({ sizeExpression: 'not a size' });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      // Should return all documents when filter is invalid
      expect(response.body.total).toBe(5);
    });

    it('should handle empty filter expressions', async () => {
      const filters = JSON.stringify({ 
        dateExpression: '',
        sizeExpression: ''
      });
      const response = await request(app)
        .get(`/api/documents?filters=${encodeURIComponent(filters)}`)
        .expect(200);
      
      // Should return all documents
      expect(response.body.total).toBe(5);
    });
  });

  describe('API Usage Documentation', () => {
    it('demonstrates proper filter encoding', async () => {
      // Example 1: Simple date filter
      const dateFilter = { dateExpression: 'last 30 days' };
      const encodedDate = encodeURIComponent(JSON.stringify(dateFilter));
      // URL: /api/documents?filters=%7B%22dateExpression%22%3A%22last%2030%20days%22%7D
      
      // Example 2: Simple size filter  
      const sizeFilter = { sizeExpression: 'over 1mb' };
      const encodedSize = encodeURIComponent(JSON.stringify(sizeFilter));
      // URL: /api/documents?filters=%7B%22sizeExpression%22%3A%22over%201mb%22%7D
      
      // Example 3: Combined filters
      const combinedFilter = {
        dateExpression: 'this week',
        sizeExpression: 'under 100k',
        name: 'readme'
      };
      const encodedCombined = encodeURIComponent(JSON.stringify(combinedFilter));
      
      // All should return valid responses
      await request(app).get(`/api/documents?filters=${encodedDate}`).expect(200);
      await request(app).get(`/api/documents?filters=${encodedSize}`).expect(200);
      await request(app).get(`/api/documents?filters=${encodedCombined}`).expect(200);
    });
  });
});

/**
 * Natural Language Filter API Usage Guide
 * ======================================
 * 
 * The MMT API supports natural language expressions for date and size filtering.
 * Filters must be sent as a JSON-encoded string in the `filters` query parameter.
 * 
 * Date Expressions:
 * - "last N days" / "past N days" - Documents modified in the last N days
 * - "yesterday" - Documents modified yesterday
 * - "today" - Documents modified today
 * - "this week" - Documents modified this week (since Sunday)
 * - "this month" - Documents modified this month
 * - "this year" - Documents modified this year
 * - "since YYYY" - Documents modified since the start of year YYYY
 * - "since MONTH" - Documents modified since the start of MONTH in current year
 * - "since MONTH YYYY" - Documents modified since MONTH in year YYYY
 * - "before YYYY" - Documents modified before year YYYY
 * - "-30d" - Shorthand for last 30 days
 * - "+7d" - Documents that will be modified in next 7 days (future dates)
 * 
 * Size Expressions:
 * - "over SIZE" / "greater than SIZE" - Files larger than SIZE
 * - "under SIZE" / "less than SIZE" - Files smaller than SIZE
 * - "at least SIZE" - Files SIZE or larger
 * - "at most SIZE" - Files SIZE or smaller
 * - SIZE can be: "10k", "1.5mb", "2g", "500 bytes", etc.
 * 
 * Example API Calls:
 * 
 * 1. Get documents from last week:
 *    GET /api/documents?filters={"dateExpression":"last 7 days"}
 * 
 * 2. Get large files (over 1MB):
 *    GET /api/documents?filters={"sizeExpression":"over 1mb"}
 * 
 * 3. Get recent small files:
 *    GET /api/documents?filters={"dateExpression":"last 30 days","sizeExpression":"under 10k"}
 * 
 * 4. Combine with traditional filters:
 *    GET /api/documents?filters={"dateExpression":"this year","name":"readme","tags":["important"]}
 * 
 * Remember to properly URL-encode the JSON string when making requests.
 */