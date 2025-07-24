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
    
    // Get the vault path from the environment (set by setup.ts)
    testVaultPath = process.env.TEST_VAULT_PATH!;
    
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
    
    // Documents should be indexed by the file watcher
    // No artificial wait - the system should handle this
  });
  
  afterAll(async () => {
    // Cleanup test documents only (vault cleanup is handled by setup.ts)
    await fs.unlink(testDoc1).catch(() => {});
    await fs.unlink(testDoc2).catch(() => {});
  });
  
  describe('POST /api/pipelines/execute', () => {
    it('should index files created after server startup', async () => {
      // Create a new file after server has started
      const newDoc = join(testVaultPath, 'created-after-startup.md');
      await fs.writeFile(newDoc, `---
title: Created After Startup
tags: [new, dynamic]
status: active
---

# New Document

This document was created after the server started.`);
      
      // Give the file watcher a moment to detect the change
      // The watcher has a default debounce of 50ms in test config
      // Add extra time for file system events to propagate
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // The pipeline should be able to select and filter this new document
      const pipeline = {
        select: {
          files: [newDoc]
        },
        filter: {
          conditions: [
            {
              field: 'metadata',
              key: 'status',
              operator: 'equals',
              value: 'active'
            }
          ],
          logic: 'AND'
        },
        operations: [
          {
            type: 'rename',
            newName: 'processed-{name}'
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
      
      // The document should be found and processed
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(1);
      expect(result.operations.skipped).toBe(1); // Preview mode
      
      // Verify the document has the correct metadata
      const skippedDoc = result.results.skipped[0];
      expect(skippedDoc.document.metadata.frontmatter.status).toBe('active');
      expect(skippedDoc.document.metadata.frontmatter.title).toBe('Created After Startup');
      expect(skippedDoc.document.metadata.tags).toEqual(['new', 'dynamic']);
      
      // Cleanup
      await fs.unlink(newDoc).catch(() => {});
    });
    
    it('should execute a simple select pipeline', async () => {
      const pipeline = {
        select: {
          files: [testDoc1, testDoc2]
        },
        operations: [
          {
            type: 'rename',
            newName: 'test-renamed.md'
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
      expect(result.documentsProcessed).toBe(2);
      expect(result.operations.skipped).toBe(2); // Both files skipped in preview mode
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
    
    it('should select documents without filters', async () => {
      const pipeline = {
        select: {
          files: [testDoc1, testDoc2]
        },
        operations: [
          {
            type: 'rename',
            newName: 'test-{name}'
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
      console.log('No filter test result:', JSON.stringify(result, null, 2));
      expect(result.success).toBe(true);
      expect(result.documentsProcessed).toBe(2); // Should process both documents
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
            type: 'rename',
            newName: 'draft-{name}'
          }
        ],
        options: {
          destructive: false // Preview mode
        }
      };
      
      console.log('Sending pipeline request with files:', pipeline.select.files);
      const response = await fetch(`${baseUrl}/api/pipelines/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pipeline)
      });
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      console.log('Pipeline result:', JSON.stringify(result, null, 2));
      console.log('Expected to process 1 document (test2.md has status: draft)');
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