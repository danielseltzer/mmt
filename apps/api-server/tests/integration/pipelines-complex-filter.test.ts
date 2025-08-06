import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Pipeline Preview with Complex Filters', () => {
  let baseUrl: string;
  let testVaultPath: string;
  let testFolder: string;
  let testDoc1: string;
  let testDoc2: string;
  
  beforeAll(async () => {
    baseUrl = 'http://localhost:3001';
    
    // Get the vault path from the environment (set by setup.ts)
    testVaultPath = process.env.TEST_VAULT_PATH!;
    
    // Create test folder and documents
    testFolder = join(testVaultPath, 'test-folder');
    await fs.mkdir(testFolder, { recursive: true });
    
    testDoc1 = join(testFolder, 'complex-filter-test1.md');
    testDoc2 = join(testFolder, 'complex-filter-test2.md');
    
    await fs.writeFile(testDoc1, `---
title: Complex Filter Test 1
status: draft
---

# Test Document 1`);
    
    await fs.writeFile(testDoc2, `---
title: Complex Filter Test 2
status: published  
---

# Test Document 2`);
    
    // Give the file watcher time to index the files
    await new Promise(resolve => setTimeout(resolve, 300));
  });
  
  afterAll(async () => {
    // Cleanup test documents
    await fs.unlink(testDoc1).catch(() => {});
    await fs.unlink(testDoc2).catch(() => {});
    await fs.rmdir(testFolder).catch(() => {});
  });
  
  describe('POST /api/pipelines/execute with folder and date filters', () => {
    it('should handle folder and modified date filters with updateFrontmatter', async () => {
      // Get the current date for the modified filter
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();
      
      const pipeline = {
        select: {
          all: true  // Start with all documents
        },
        filter: {
          conditions: [
            {
              field: 'folders',
              operator: 'in',
              value: [testFolder]
            },
            {
              field: 'modified',
              operator: 'between',
              value: {
                from: startOfDay,
                to: endOfDay
              }
            }
          ],
          logic: 'AND'
        },
        operations: [
          {
            type: 'updateFrontmatter',
            updates: {
              reviewed: true,
              reviewDate: new Date().toISOString()
            }
          }
        ],
        options: {
          destructive: false // Preview mode
        }
      };
      
      console.log('Sending pipeline:', JSON.stringify(pipeline, null, 2));
      
      const response = await fetch(`${baseUrl}/api/pipelines/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipeline)
      });
      
      // Log the response for debugging
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response body:', responseText);
      
      // If we got a bad request, let's see the error
      if (response.status === 400) {
        console.error('Bad Request Error:', responseText);
      }
      
      expect(response.ok).toBe(true);
      
      // Parse the response
      const result = JSON.parse(responseText);
      
      // Should return preview response
      expect(result.preview).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.documentsAffected).toBeGreaterThanOrEqual(2); // At least our test docs
      
      const op = result.summary.operations[0];
      expect(op.type).toBe('updateFrontmatter');
      expect(op.description).toContain('Update 2 frontmatter fields');
    });
    
    it('should handle date filter edge cases', async () => {
      // Test with a specific date range format that might cause issues
      const pipeline = {
        select: {
          all: true
        },
        filter: {
          conditions: [
            {
              field: 'modified',
              operator: 'gt',
              value: '2024-01-01' // String date format
            }
          ],
          logic: 'AND'
        },
        operations: [
          {
            type: 'updateFrontmatter',
            updates: {
              status: 'archived'
            }
          }
        ],
        options: {
          destructive: false
        }
      };
      
      const response = await fetch(`${baseUrl}/api/pipelines/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipeline)
      });
      
      const responseText = await response.text();
      console.log('Date filter response:', response.status, responseText);
      
      expect(response.ok).toBe(true);
    });
  });
});