import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Pipeline Preview with select.all', () => {
  let baseUrl: string;
  let testVaultPath: string;
  let testDoc1: string;
  let testDoc2: string;
  
  beforeAll(async () => {
    baseUrl = 'http://localhost:3001';
    
    // Get the vault path from the environment (set by setup.ts)
    testVaultPath = process.env.TEST_VAULT_PATH!;
    
    // Create test documents
    testDoc1 = join(testVaultPath, 'select-all-test1.md');
    testDoc2 = join(testVaultPath, 'select-all-test2.md');
    
    await fs.writeFile(testDoc1, `---
title: Select All Test 1
---

# Test Document 1`);
    
    await fs.writeFile(testDoc2, `---
title: Select All Test 2
---

# Test Document 2`);
    
    // Give the file watcher time to index the files
    await new Promise(resolve => setTimeout(resolve, 300));
  });
  
  afterAll(async () => {
    // Cleanup test documents
    await fs.unlink(testDoc1).catch(() => {});
    await fs.unlink(testDoc2).catch(() => {});
  });
  
  describe('POST /api/pipelines/execute with select.all', () => {
    it('should handle select.all: true in preview mode', async () => {
      const pipeline = {
        select: {
          all: true  // This is what the PreviewModal sends
        },
        operations: [
          {
            type: 'rename',
            newName: 'test-{name}.md'
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
      
      // Log the response for debugging
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response body:', responseText);
      
      expect(response.ok).toBe(true);
      
      // Parse the response
      const result = JSON.parse(responseText);
      
      // Should return preview response
      expect(result.preview).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.documentsAffected).toBeGreaterThanOrEqual(2); // At least our test docs
      expect(result.summary.operations).toHaveLength(1);
      
      const op = result.summary.operations[0];
      expect(op.type).toBe('rename');
      expect(op.description).toContain('Rename files using template');
    });
    
    it('should handle empty select object', async () => {
      const pipeline = {
        select: {},  // Empty select
        operations: [
          {
            type: 'rename',
            newName: 'test-{name}.md'
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
      console.log('Empty select response:', response.status, responseText);
      
      // This might fail - we need to see what the actual behavior is
      expect(response.ok).toBe(true);
    });
  });
});