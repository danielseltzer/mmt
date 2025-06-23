import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join, dirname } from 'path';
import { readFile } from 'fs/promises';
import { RenameOperation } from '../../src/operations/rename-operation.js';
import { createTestVault, createTestDocument, createTestContext } from '../test-utils.js';
import type { OperationContext } from '../../src/types.js';

describe('RenameOperation', () => {
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
    it('should validate rename with valid new name', async () => {
      // GIVEN: A document and a valid new name
      // WHEN: Validating a rename operation
      // THEN: The operation should be valid
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/old-name.md',
        '# Old Document'
      );
      
      const operation = new RenameOperation({ newName: 'new-name.md' });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });

    it('should fail validation when new name is empty', async () => {
      // GIVEN: A document and an empty name
      // WHEN: Validating a rename operation
      // THEN: The operation should be invalid
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      const operation = new RenameOperation({ newName: '' });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Name cannot be empty');
    });

    it('should fail validation when new name contains path separators', async () => {
      // GIVEN: A document and a name with path separators
      // WHEN: Validating a rename operation
      // THEN: The operation should be invalid to prevent directory changes
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      const operation = new RenameOperation({ newName: 'folder/new-name.md' });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Name cannot contain path separators');
    });

    it('should fail validation when target file already exists', async () => {
      // GIVEN: A document and a name that conflicts with existing file
      // WHEN: Validating a rename operation
      // THEN: The operation should be invalid to prevent overwriting
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/old.md',
        '# Old'
      );
      
      await createTestDocument(
        testVault.vaultPath,
        'notes/existing.md',
        '# Existing'
      );
      
      const operation = new RenameOperation({ newName: 'existing.md' });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('should fail validation when renaming to same name', async () => {
      // GIVEN: A document and its current name
      // WHEN: Validating a rename to same name
      // THEN: The operation should be invalid as no-op
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      const operation = new RenameOperation({ newName: 'test.md' });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('same as current');
    });

    it('should automatically add .md extension if missing', async () => {
      // GIVEN: A document and a name without .md extension
      // WHEN: Validating a rename operation
      // THEN: Should auto-append .md and validate successfully
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      const operation = new RenameOperation({ newName: 'renamed' });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });
  });

  describe('preview', () => {
    it('should preview rename with affected links', async () => {
      // GIVEN: Documents with wikilinks using the old name
      // WHEN: Previewing a rename operation
      // THEN: Should identify all files needing link updates
      // Create documents with links
      const doc1 = await createTestDocument(
        testVault.vaultPath,
        'notes/original.md',
        '# Original\n\nLink to [[other]]'
      );
      
      const doc2 = await createTestDocument(
        testVault.vaultPath,
        'notes/other.md',
        '# Other\n\nLink back to [[original]]'
      );
      
      // Re-initialize indexer to establish links
      await context.indexer.initialize();
      
      const operation = new RenameOperation({ newName: 'renamed.md' });
      const preview = await operation.preview(doc1, context);
      
      expect(preview.type).toBe('rename');
      expect(preview.source).toBe(doc1.path);
      expect(preview.target).toBe(join(dirname(doc1.path), 'renamed.md'));
      expect(preview.changes).toHaveLength(2); // File rename + link update
      
      const renameChange = preview.changes.find(c => c.type === 'file-rename');
      expect(renameChange).toBeDefined();
      expect(renameChange?.description).toContain('renamed.md');
      
      const linkChange = preview.changes.find(c => c.type === 'link-update');
      expect(linkChange).toBeDefined();
      expect(linkChange?.file).toBe(doc2.path);
    });

    it('should preview rename without link updates when disabled', async () => {
      // GIVEN: A document and updateLinks disabled
      // WHEN: Previewing a rename operation
      // THEN: Should only show the file rename change
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      context.options.updateLinks = false;
      
      const operation = new RenameOperation({ newName: 'renamed.md' });
      const preview = await operation.preview(doc, context);
      
      expect(preview.changes).toHaveLength(1);
      expect(preview.changes[0].type).toBe('file-rename');
    });
  });

  describe('execute', () => {
    it('should rename file successfully', async () => {
      // GIVEN: A document with one name
      // WHEN: Executing rename to new name
      // THEN: File should have new name with content preserved
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/old-name.md',
        '# Old Name\n\nContent here'
      );
      
      const operation = new RenameOperation({ newName: 'new-name.md' });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.document?.path).toBe(join(dirname(doc.path), 'new-name.md'));
      
      // Verify old file doesn't exist
      const oldExists = await context.fs.exists(doc.path);
      expect(oldExists).toBe(false);
      
      // Verify new file exists with same content
      const newPath = join(dirname(doc.path), 'new-name.md');
      const newExists = await context.fs.exists(newPath);
      expect(newExists).toBe(true);
      
      const content = await readFile(newPath, 'utf-8');
      expect(content).toBe('# Old Name\n\nContent here');
    });

    it('should update links when file is renamed', async () => {
      // GIVEN: Documents with wikilinks using basename references
      // WHEN: Renaming a linked document
      // THEN: All links and self-references should update
      // Create linked documents
      const doc1 = await createTestDocument(
        testVault.vaultPath,
        'notes/original.md',
        '# Original\n\nSelf link: [[original]]'
      );
      
      const doc2 = await createTestDocument(
        testVault.vaultPath,
        'notes/linker.md',
        '# Linker\n\nLink to [[original]] document'
      );
      
      // Re-initialize indexer
      await context.indexer.initialize();
      
      const operation = new RenameOperation({ newName: 'renamed.md' });
      const result = await operation.execute(doc1, context);
      
      expect(result.success).toBe(true);
      
      // Check that links were updated
      const doc2Content = await readFile(doc2.path, 'utf-8');
      expect(doc2Content).toContain('[[renamed]]');
      expect(doc2Content).not.toContain('[[original]]');
      
      // Check self-links were updated
      const renamedContent = await readFile(result.document!.path, 'utf-8');
      expect(renamedContent).toContain('[[renamed]]');
      expect(renamedContent).not.toContain('[[original]]');
    });

    it('should handle rename with no extension', async () => {
      // GIVEN: A document and new name without extension
      // WHEN: Executing rename operation
      // THEN: Should add .md extension automatically
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      const operation = new RenameOperation({ newName: 'renamed' });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.document?.path).toBe(join(dirname(doc.path), 'renamed.md'));
      
      // Verify file has .md extension
      const exists = await context.fs.exists(join(dirname(doc.path), 'renamed.md'));
      expect(exists).toBe(true);
    });

    it('should create backup when enabled', async () => {
      // GIVEN: A document and createBackup enabled
      // WHEN: Executing rename operation
      // THEN: Should create backup before renaming
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      context.options.createBackup = true;
      
      const operation = new RenameOperation({ newName: 'renamed.md' });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();
      expect(result.backup?.originalPath).toBe(doc.path);
      
      // Verify backup exists
      const backupExists = await context.fs.exists(result.backup!.backupPath);
      expect(backupExists).toBe(true);
    });

    it('should respect dry run mode', async () => {
      // GIVEN: A document and dryRun enabled
      // WHEN: Executing rename operation
      // THEN: Should simulate rename without changing files
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      context.options.dryRun = true;
      
      const operation = new RenameOperation({ newName: 'renamed.md' });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      
      // Verify file was NOT renamed
      const oldExists = await context.fs.exists(doc.path);
      expect(oldExists).toBe(true);
      
      const newExists = await context.fs.exists(join(dirname(doc.path), 'renamed.md'));
      expect(newExists).toBe(false);
    });

    it('should handle rename errors gracefully', async () => {
      // GIVEN: A document and conflicting target name
      // WHEN: Executing rename that will fail
      // THEN: Should return error and preserve original
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test'
      );
      
      // Create a file with the target name to cause an error
      await createTestDocument(
        testVault.vaultPath,
        'notes/conflict.md',
        '# Conflict'
      );
      
      const operation = new RenameOperation({ newName: 'conflict.md' });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already exists');
      
      // Verify original file still exists
      const exists = await context.fs.exists(doc.path);
      expect(exists).toBe(true);
    });

    it('should preserve frontmatter when renaming', async () => {
      // GIVEN: A document with frontmatter
      // WHEN: Renaming the document
      // THEN: All metadata should remain intact
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document',
        { title: 'Test', tags: ['important', 'work'] }
      );
      
      const operation = new RenameOperation({ newName: 'renamed.md' });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      // Verify frontmatter is preserved
      const content = await readFile(result.document!.path, 'utf-8');
      expect(content).toContain('title: Test');
      expect(content).toContain('tags: important');
    });
  });
});