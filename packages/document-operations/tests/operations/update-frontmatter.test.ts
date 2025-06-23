import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { UpdateFrontmatterOperation } from '../../src/operations/update-frontmatter.js';
import { createTestVault, createTestDocument, createTestContext } from '../test-utils.js';
import type { OperationContext } from '../../src/types.js';

describe('UpdateFrontmatterOperation', () => {
  let testVault: { vaultPath: string; cleanup: () => Promise<void> };
  let context: OperationContext;

  beforeEach(async () => {
    testVault = await createTestVault();
    context = await createTestContext(testVault.vaultPath);
  });

  afterEach(async () => {
    await testVault.cleanup();
  });

  describe('validation', () => {
    it('should validate frontmatter updates', async () => {
      // GIVEN: A document and valid frontmatter updates
      // WHEN: Validating an update operation
      // THEN: Valid because updates object contains at least one property change
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document',
        { title: 'Original Title' }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { title: 'New Title', tags: ['test'] }
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });

    it('should validate removal of properties', async () => {
      // GIVEN: A document with frontmatter and null values to remove
      // WHEN: Validating an update with null values
      // THEN: Valid because null values are used to remove properties from frontmatter
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { title: 'Test', status: 'draft' }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { status: null }
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });

    it('should fail validation when updates is empty', async () => {
      // GIVEN: A document and empty updates object
      // WHEN: Validating an update operation
      // THEN: Invalid because empty updates would be a no-op (nothing to change)
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: {}
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('No updates provided');
    });

    it('should validate merge mode', async () => {
      // GIVEN: A document and merge mode configuration
      // WHEN: Validating with merge mode
      // THEN: Valid in merge mode which preserves existing properties while adding new ones
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { existing: 'value' }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { new: 'value' },
        mode: 'merge'
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });

    it('should validate replace mode', async () => {
      // GIVEN: A document and replace mode configuration
      // WHEN: Validating with replace mode
      // THEN: Valid in replace mode which completely replaces all frontmatter (use with caution)
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { will: 'be replaced' }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { new: 'frontmatter' },
        mode: 'replace'
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });
  });

  describe('preview', () => {
    it('should preview frontmatter changes in merge mode', async () => {
      // GIVEN: A document with existing frontmatter
      // WHEN: Previewing updates in merge mode
      // THEN: Should show what will be added/changed
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { 
          title: 'Original', 
          status: 'draft',
          tags: ['old']
        }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          title: 'Updated',
          author: 'John Doe',
          tags: ['new', 'updated']
        },
        mode: 'merge'
      });
      
      const preview = await operation.preview(doc, context);
      
      expect(preview.type).toBe('updateFrontmatter');
      expect(preview.source).toBe(doc.path);
      expect(preview.changes).toHaveLength(1);
      expect(preview.changes[0].type).toBe('frontmatter-update');
      expect(preview.changes[0].before).toContain('title: Original');
      expect(preview.changes[0].after).toContain('title: Updated');
      expect(preview.changes[0].after).toContain('author: John Doe');
    });

    it('should preview complete replacement', async () => {
      // GIVEN: A document with existing frontmatter
      // WHEN: Previewing updates in replace mode
      // THEN: Should show complete replacement
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { 
          old: 'data',
          will: 'be gone'
        }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          brand: 'new',
          frontmatter: 'only'
        },
        mode: 'replace'
      });
      
      const preview = await operation.preview(doc, context);
      
      expect(preview.changes[0].before).toContain('old: data');
      expect(preview.changes[0].after).not.toContain('old: data');
      expect(preview.changes[0].after).toContain('brand: new');
    });

    it('should preview property removal', async () => {
      // GIVEN: A document with properties to remove
      // WHEN: Previewing updates with null values
      // THEN: Should show properties will be removed
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { 
          keep: 'this',
          remove: 'this',
          alsoRemove: 'this'
        }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          remove: null,
          alsoRemove: null
        }
      });
      
      const preview = await operation.preview(doc, context);
      
      expect(preview.changes[0].after).toContain('keep: this');
      expect(preview.changes[0].after).not.toContain('remove:');
      expect(preview.changes[0].after).not.toContain('alsoRemove:');
    });
  });

  describe('execute', () => {
    it('should update frontmatter in merge mode', async () => {
      // GIVEN: A document with existing frontmatter
      // WHEN: Executing updates in merge mode
      // THEN: Should merge new values with existing
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document\n\nContent here',
        { 
          title: 'Original',
          status: 'draft'
        }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          title: 'Updated Title',
          author: 'Jane Doe',
          tags: ['test', 'updated']
        }
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      const content = await readFile(doc.path, 'utf-8');
      expect(content).toContain('title: Updated Title');
      expect(content).toContain('status: draft'); // Original kept
      expect(content).toContain('author: Jane Doe'); // New added
      expect(content).toContain('# Test Document'); // Content preserved
    });

    it('should replace all frontmatter in replace mode', async () => {
      // GIVEN: A document with existing frontmatter
      // WHEN: Executing updates in replace mode
      // THEN: Should replace all frontmatter
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test\n\nContent',
        { 
          old: 'frontmatter',
          will: 'be replaced'
        }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          completely: 'new',
          frontmatter: 'here'
        },
        mode: 'replace'
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      const content = await readFile(doc.path, 'utf-8');
      expect(content).not.toContain('old:');
      expect(content).not.toContain('will:');
      expect(content).toContain('completely: new');
      expect(content).toContain('frontmatter: here');
    });

    it('should remove properties with null values', async () => {
      // GIVEN: A document with properties to remove
      // WHEN: Executing updates with null values
      // THEN: Should remove those properties
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { 
          keep: 'this value',
          remove: 'this one',
          status: 'draft'
        }
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          remove: null,
          status: null,
          new: 'value'
        }
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      const content = await readFile(doc.path, 'utf-8');
      expect(content).toContain('keep: this value');
      expect(content).not.toContain('remove:');
      expect(content).not.toContain('status:');
      expect(content).toContain('new: value');
    });

    it('should handle documents without frontmatter', async () => {
      // GIVEN: A document without any frontmatter
      // WHEN: Adding frontmatter
      // THEN: Should create new frontmatter section
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document\n\nNo frontmatter here'
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          title: 'New Title',
          tags: ['test']
        }
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      const content = await readFile(doc.path, 'utf-8');
      expect(content).toMatch(/^---\n/);
      expect(content).toContain('title: New Title');
      expect(content).toContain('tags:');
      expect(content).toContain('  - test');
      expect(content).toContain('# Test Document');
    });

    it('should handle complex nested structures', async () => {
      // GIVEN: A document needing complex nested updates
      // WHEN: Updating with nested objects and arrays
      // THEN: Should properly serialize complex structures
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { 
          metadata: {
            author: {
              name: 'John Doe',
              email: 'john@example.com'
            },
            reviewers: ['Jane', 'Bob']
          },
          tags: ['complex', 'nested'],
          published: true,
          rating: 4.5
        }
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      const content = await readFile(doc.path, 'utf-8');
      expect(content).toContain('metadata:');
      expect(content).toContain('  author:');
      expect(content).toContain('    name: John Doe');
      expect(content).toContain('published: true');
      expect(content).toContain('rating: 4.5');
    });

    it('should create backup when enabled', async () => {
      // GIVEN: A document and backup option enabled
      // WHEN: Executing frontmatter updates
      // THEN: Should create backup before modifying
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { original: 'data' }
      );
      
      context.options.createBackup = true;
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { updated: 'data' }
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();
      expect(result.backup?.originalPath).toBe(doc.path);
      
      const backupExists = await context.fs.exists(result.backup!.backupPath);
      expect(backupExists).toBe(true);
    });

    it('should respect dry run mode', async () => {
      // GIVEN: A document and dry run enabled
      // WHEN: Executing frontmatter updates
      // THEN: Should simulate without changing file
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test',
        { original: 'value' }
      );
      
      context.options.dryRun = true;
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { original: 'changed' }
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      
      const content = await readFile(doc.path, 'utf-8');
      expect(content).toContain('original: value'); // Unchanged
      expect(content).not.toContain('original: changed');
    });

    it('should handle errors gracefully', async () => {
      // GIVEN: A document that will cause an error
      // WHEN: Executing updates that fail
      // THEN: Should return error and preserve original
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      // Delete the file to simulate an error
      await context.fs.unlink(doc.path);
      
      const operation = new UpdateFrontmatterOperation({ 
        updates: { test: 'value' }
      });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('ENOENT');
    });
  });
});