import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Pipeline Preview API', () => {
  let baseUrl: string;
  let testVaultPath: string;
  let testDoc1: string;
  let testDoc2: string;
  
  beforeAll(async () => {
    baseUrl = 'http://localhost:3001';
    
    // Get the vault path from the environment (set by setup.ts)
    testVaultPath = process.env.TEST_VAULT_PATH!;
    
    // Create test documents
    testDoc1 = join(testVaultPath, 'preview-test1.md');
    testDoc2 = join(testVaultPath, 'preview-test2.md');
    
    await fs.writeFile(testDoc1, `---
title: Preview Test 1
tags: [test, preview]
status: draft
---

# Preview Test 1

This is a test document for preview functionality.`);
    
    await fs.writeFile(testDoc2, `---
title: Preview Test 2
tags: [test, preview]
status: published
---

# Preview Test 2

Another test document for preview functionality.`);
    
    // Give the file watcher time to index the files
    await new Promise(resolve => setTimeout(resolve, 300));
  });
  
  afterAll(async () => {
    // Cleanup test documents
    await fs.unlink(testDoc1).catch(() => {});
    await fs.unlink(testDoc2).catch(() => {});
  });
  
  describe('POST /api/pipelines/execute (preview mode)', () => {
    it('should return detailed preview for rename operation', async () => {
      const pipeline = {
        select: {
          files: [testDoc1, testDoc2]
        },
        operations: [
          {
            type: 'rename',
            newName: '{date}-{name}.md'
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
      expect(result.summary.operations).toHaveLength(1);
      
      const op = result.summary.operations[0];
      expect(op.type).toBe('rename');
      expect(op.description).toContain('Rename files using template');
      expect(op.examples).toHaveLength(2);
      expect(op.examples[0].from).toBe('preview-test1.md');
      expect(op.examples[0].to).toMatch(/^\d{4}-\d{2}-\d{2}-preview-test1\.md$/);
      
      expect(result.validation.valid).toBe(true);
      expect(result.documents).toHaveLength(2);
    });
    
    it('should return preview with warnings for delete operation', async () => {
      const pipeline = {
        select: {
          files: [testDoc1]
        },
        operations: [
          {
            type: 'delete',
            permanent: true
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
      expect(result.summary.hasDestructiveOperations).toBe(true);
      
      const op = result.summary.operations[0];
      expect(op.warnings).toContain('This operation will permanently delete files and cannot be undone');
      expect(op.warnings).toContain('1 files will be deleted');
    });
    
    it('should return preview with filter description', async () => {
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
            type: 'updateFrontmatter',
            updates: {
              status: 'reviewed'
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
      
      expect(response.ok).toBe(true);
      const result = await response.json();
      
      expect(result.preview).toBe(true);
      expect(result.filterDescription).toBe('has frontmatter: status');
      expect(result.summary.documentsAffected).toBe(1); // Only draft document
      
      const op = result.summary.operations[0];
      expect(op.description).toContain('Set frontmatter: status = "reviewed"');
      expect(op.examples[0].from).toBe('status: draft');
      expect(op.examples[0].to).toBe('status: reviewed');
    });
    
    it('should validate invalid operations in preview', async () => {
      const pipeline = {
        select: {
          files: [testDoc1]
        },
        operations: [
          {
            type: 'rename'
            // Missing newName
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
      expect(result.validation.valid).toBe(false);
      expect(result.validation.errors).toContain('Rename operation requires a template');
    });
    
    it('should handle preview for multiple operations', async () => {
      const pipeline = {
        select: {
          files: [testDoc1]
        },
        operations: [
          {
            type: 'updateFrontmatter',
            updates: {
              reviewed: true,
              reviewer: 'admin'
            }
          },
          {
            type: 'rename',
            newName: 'reviewed-{name}.md'
          },
          {
            type: 'move',
            destination: '/reviewed'
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
      expect(result.summary.operations).toHaveLength(3);
      
      expect(result.summary.operations[0].description).toBe('Update 2 frontmatter fields');
      expect(result.summary.operations[1].description).toContain('Rename files using template');
      expect(result.summary.operations[2].description).toBe('Move files to: /reviewed');
    });
  });
});