import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Pipeline Preview with Client Format Filters', () => {
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
    testFolder = join(testVaultPath, 'client-format-test');
    await fs.mkdir(testFolder, { recursive: true });
    
    testDoc1 = join(testFolder, 'client-test1.md');
    testDoc2 = join(testFolder, 'client-test2.md');
    
    await fs.writeFile(testDoc1, `---
title: Client Format Test 1
status: draft
---

# Test Document 1`);
    
    await fs.writeFile(testDoc2, `---
title: Client Format Test 2
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
  
  describe('POST /api/pipelines/execute with client-style filters', () => {
    it('should handle updateFrontmatter operation with single key-value', async () => {
      const pipeline = {
        select: {
          all: true
        },
        filter: {
          conditions: [
            {
              field: 'folders',
              operator: 'in',
              value: [testFolder]
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
            },
            mode: 'merge'
          }
        ],
        options: {
          destructive: false // Preview mode
        }
      };
      
      const response = await fetch(`${baseUrl}/api/pipelines/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipeline)
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      // Should return preview response
      expect(result.preview).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.documentsAffected).toBe(2);
      
      const op = result.summary.operations[0];
      expect(op.type).toBe('updateFrontmatter');
      expect(op.description).toContain('Update 2 frontmatter fields');
    });
    
    it('should handle rename operation with template pattern', async () => {
      const pipeline = {
        select: {
          all: true
        },
        filter: {
          conditions: [
            {
              field: 'folders',
              operator: 'in',
              value: [testFolder]
            }
          ],
          logic: 'AND'
        },
        operations: [
          {
            type: 'rename',
            newName: '{date}-{name}.md'
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
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.preview).toBe(true);
      const op = result.summary.operations[0];
      expect(op.type).toBe('rename');
      expect(op.description).toContain('Rename files using template');
      expect(op.examples).toHaveLength(2);
    });
    
    it('should handle date filter with ISO string', async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const pipeline = {
        select: {
          all: true
        },
        filter: {
          conditions: [
            {
              field: 'modified',
              operator: 'gt',
              value: sevenDaysAgo.toISOString()
            }
          ],
          logic: 'AND'
        },
        operations: [
          {
            type: 'rename',
            newName: 'recent-{name}.md'
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
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.preview).toBe(true);
      // Should include our recently created test files
      expect(result.summary.documentsAffected).toBeGreaterThanOrEqual(2);
    });
  });
});