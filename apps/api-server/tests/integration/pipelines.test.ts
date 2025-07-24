import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Pipeline Execution API', () => {
  let baseUrl: string;
  let testVaultPath: string;
  let testDoc1: string;
  let testDoc2: string;
  
  beforeAll(async () => {
    baseUrl = 'http://localhost:3001';
    
    // Create test vault with some documents
    testVaultPath = join(tmpdir(), `mmt-pipeline-test-${Date.now()}`);
    await fs.mkdir(testVaultPath, { recursive: true });
    
    // Create test documents
    testDoc1 = join(testVaultPath, 'test1.md');
    testDoc2 = join(testVaultPath, 'test2.md');
    
    await fs.writeFile(testDoc1, `---
title: Test Document 1
tags: [test, sample]
---

# Test Document 1

This is a test document.`);
    
    await fs.writeFile(testDoc2, `---
title: Test Document 2
tags: [test, demo]
status: draft
---

# Test Document 2

Another test document.`);
  });
  
  afterAll(async () => {
    // Cleanup
    await fs.rm(testVaultPath, { recursive: true, force: true });
  });
  
  describe('POST /api/pipelines/execute', () => {
    it('should execute a simple select pipeline', async () => {
      const pipeline = {
        select: {
          files: [testDoc1, testDoc2]
        },
        operations: [
          {
            type: 'analyze',
            analysis: 'list'
          }
        ]
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
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(2);
    });
    
    it('should execute a rename operation in preview mode', async () => {
      const pipeline = {
        select: {
          files: [testDoc1]
        },
        operations: [
          {
            type: 'rename',
            newName: 'renamed-test.md'
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
      expect(result.success).toBe(true);
      expect(result.operations.skipped).toBe(1); // Should be skipped in preview
      
      // Verify file was not actually renamed
      const exists = await fs.access(testDoc1).then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
    
    it('should apply declarative filters', async () => {
      const pipeline = {
        select: {
          files: [testDoc1, testDoc2]
        },
        filter: {
          conditions: [
            {
              field: 'metadata',
              key: 'status',
              operator: 'equals',
              value: 'draft'
            }
          ],
          logic: 'AND'
        },
        operations: [
          {
            type: 'analyze',
            analysis: 'list'
          }
        ]
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
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(1); // Only test2.md has status: draft
    });
    
    it('should handle updateFrontmatter operation', async () => {
      const pipeline = {
        select: {
          files: [testDoc1]
        },
        operations: [
          {
            type: 'updateFrontmatter',
            updates: {
              status: 'published',
              lastModified: '2024-01-08'
            }
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
      expect(result.success).toBe(true);
      expect(result.operations.skipped).toBe(1); // Should be skipped in preview
    });
    
    it('should reject invalid pipeline schema', async () => {
      const invalidPipeline = {
        // Missing required 'select' field
        operations: [
          {
            type: 'rename',
            newName: 'test.md'
          }
        ]
      };
      
      const response = await fetch(`${baseUrl}/api/pipelines/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidPipeline)
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400); // Bad Request
    });
  });
});