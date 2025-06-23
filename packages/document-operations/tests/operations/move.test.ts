import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { MoveOperation } from '../../src/operations/move-operation.js';
import { createTestVault, createTestDocument, createTestContext } from '../test-utils.js';
import type { OperationContext } from '../../src/types.js';

describe('MoveOperation', () => {
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
    it('should validate move to existing directory', async () => {
      // GIVEN: A document and a target directory that exists
      // WHEN: Validating a move operation to that directory
      // THEN: The operation should be valid
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      const operation = new MoveOperation({ 
        targetPath: join(testVault.vaultPath, 'archive/test.md') 
      });
      
      // Create target directory
      await context.fs.mkdir(join(testVault.vaultPath, 'archive'), { recursive: true });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });

    it('should fail validation when target directory does not exist', async () => {
      // GIVEN: A document and a target path with non-existent directory
      // WHEN: Validating a move operation
      // THEN: The operation should be invalid with appropriate error
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      const operation = new MoveOperation({ 
        targetPath: join(testVault.vaultPath, 'nonexistent/test.md') 
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Target directory does not exist');
    });

    it('should fail validation when target file already exists', async () => {
      // GIVEN: A document and a target path where a file already exists
      // WHEN: Validating a move operation
      // THEN: The operation should be invalid to prevent overwriting
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      // Create target file
      await createTestDocument(
        testVault.vaultPath,
        'archive/test.md',
        '# Existing Document'
      );
      
      const operation = new MoveOperation({ 
        targetPath: join(testVault.vaultPath, 'archive/test.md') 
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Target file already exists');
    });

    it('should fail validation when trying to move file to itself', async () => {
      // GIVEN: A document and a target path that is the same as source
      // WHEN: Validating a move operation
      // THEN: The operation should be invalid
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      const operation = new MoveOperation({ 
        targetPath: doc.path 
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Source and target paths are the same');
    });

    it('should validate moves outside vault when allowed', async () => {
      // GIVEN: A document and allowOutsideVault option enabled
      // WHEN: Validating a move to a path outside the vault
      // THEN: The operation should be valid
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      const operation = new MoveOperation({ 
        targetPath: '/tmp/test.md' 
      });
      
      // Enable moving outside vault
      context.options.allowOutsideVault = true;
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(true);
    });

    it('should fail validation when moving outside vault is not allowed', async () => {
      // GIVEN: A document and default security settings
      // WHEN: Validating a move to a path outside the vault
      // THEN: The operation should be invalid for security
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      const operation = new MoveOperation({ 
        targetPath: '/tmp/test.md' 
      });
      
      const result = await operation.validate(doc, context);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside vault');
    });
  });

  describe('preview', () => {
    it('should preview file move with affected links', async () => {
      // GIVEN: Documents with wikilinks between them
      // WHEN: Previewing a move operation
      // THEN: Should identify all files that need link updates
      // Create documents with links
      const doc1 = await createTestDocument(
        testVault.vaultPath,
        'notes/doc1.md',
        '# Document 1\n\nLink to [[doc2]]'
      );
      
      const doc2 = await createTestDocument(
        testVault.vaultPath,
        'notes/doc2.md',
        '# Document 2\n\nLink back to [[notes/doc1]]'
      );
      
      // Re-initialize the indexer to pick up the new documents
      await context.indexer.initialize();
      
      const operation = new MoveOperation({ 
        targetPath: join(testVault.vaultPath, 'archive/doc1.md') 
      });
      
      const preview = await operation.preview(doc1, context);
      
      expect(preview.type).toBe('move');
      expect(preview.source).toBe(doc1.path);
      expect(preview.target).toBe(join(testVault.vaultPath, 'archive/doc1.md'));
      expect(preview.changes).toHaveLength(2); // File move + link update
      
      const fileMoveChange = preview.changes.find(c => c.type === 'file-move');
      expect(fileMoveChange).toBeDefined();
      expect(fileMoveChange?.file).toBe(doc1.path);
      
      const linkUpdateChange = preview.changes.find(c => c.type === 'link-update');
      expect(linkUpdateChange).toBeDefined();
      expect(linkUpdateChange?.file).toBe(doc2.path);
    });

    it('should preview move without link updates when disabled', async () => {
      // GIVEN: A document and updateLinks option disabled
      // WHEN: Previewing a move operation
      // THEN: Should only show the file move without link updates
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      context.options.updateLinks = false;
      
      const operation = new MoveOperation({ 
        targetPath: join(testVault.vaultPath, 'archive/test.md') 
      });
      
      const preview = await operation.preview(doc, context);
      
      expect(preview.changes).toHaveLength(1);
      expect(preview.changes[0].type).toBe('file-move');
    });
  });

  describe('execute', () => {
    it('should move file to new location', async () => {
      // GIVEN: A document in one directory
      // WHEN: Executing a move to another directory
      // THEN: File should be moved and content preserved
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document\n\nSome content'
      );
      
      const targetPath = join(testVault.vaultPath, 'archive/test.md');
      const operation = new MoveOperation({ targetPath });
      
      // Create target directory
      await context.fs.mkdir(join(testVault.vaultPath, 'archive'), { recursive: true });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.document?.path).toBe(targetPath);
      
      // Verify file was moved
      const exists = await context.fs.exists(targetPath);
      expect(exists).toBe(true);
      
      const oldExists = await context.fs.exists(doc.path);
      expect(oldExists).toBe(false);
      
      // Verify content is preserved
      const content = await readFile(targetPath, 'utf-8');
      expect(content).toBe('# Test Document\n\nSome content');
    });

    it('should update links when file is moved', async () => {
      // GIVEN: Documents with wikilinks between them
      // WHEN: Moving a linked document
      // THEN: All links should be updated to new path
      // Create linked documents
      const doc1 = await createTestDocument(
        testVault.vaultPath,
        'notes/doc1.md',
        '# Document 1\n\nLink to [[doc2]]'
      );
      
      const doc2 = await createTestDocument(
        testVault.vaultPath,
        'notes/doc2.md',
        '# Document 2\n\nLink back to [[notes/doc1]]'
      );
      
      // Re-initialize the indexer to pick up the new documents
      await context.indexer.initialize();
      
      const targetPath = join(testVault.vaultPath, 'archive/doc1.md');
      const operation = new MoveOperation({ targetPath });
      
      // Create target directory
      await context.fs.mkdir(join(testVault.vaultPath, 'archive'), { recursive: true });
      
      const result = await operation.execute(doc1, context);
      
      expect(result.success).toBe(true);
      
      // Verify link was updated
      const doc2Content = await readFile(doc2.path, 'utf-8');
      expect(doc2Content).toContain('[[archive/doc1]]');
      expect(doc2Content).not.toContain('[[notes/doc1]]');
    });

    it('should create backup when enabled', async () => {
      // GIVEN: A document and createBackup option enabled
      // WHEN: Executing a move operation
      // THEN: Should create a backup before moving
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      context.options.createBackup = true;
      
      const targetPath = join(testVault.vaultPath, 'archive/test.md');
      const operation = new MoveOperation({ targetPath });
      
      await context.fs.mkdir(join(testVault.vaultPath, 'archive'), { recursive: true });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.backup).toBeDefined();
      expect(result.backup?.originalPath).toBe(doc.path);
      expect(result.backup?.backupPath).toContain('.backup');
      
      // Verify backup exists
      const backupExists = await context.fs.exists(result.backup!.backupPath);
      expect(backupExists).toBe(true);
    });

    it('should handle move errors gracefully', async () => {
      // GIVEN: A document and an invalid target path
      // WHEN: Executing a move operation that will fail
      // THEN: Should return error and preserve original file
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      // Don't create target directory to cause error
      const targetPath = join(testVault.vaultPath, 'nonexistent/test.md');
      const operation = new MoveOperation({ targetPath });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Target directory does not exist');
      
      // Verify original file still exists
      const exists = await context.fs.exists(doc.path);
      expect(exists).toBe(true);
    });

    it('should respect dry run mode', async () => {
      // GIVEN: A document and dryRun option enabled
      // WHEN: Executing a move operation
      // THEN: Should simulate move without actually moving file
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document'
      );
      
      context.options.dryRun = true;
      
      const targetPath = join(testVault.vaultPath, 'archive/test.md');
      const operation = new MoveOperation({ targetPath });
      
      await context.fs.mkdir(join(testVault.vaultPath, 'archive'), { recursive: true });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      
      // Verify file was NOT moved
      const oldExists = await context.fs.exists(doc.path);
      expect(oldExists).toBe(true);
      
      const newExists = await context.fs.exists(targetPath);
      expect(newExists).toBe(false);
    });

    it('should preserve frontmatter when moving', async () => {
      // GIVEN: A document with frontmatter metadata
      // WHEN: Moving the document
      // THEN: All frontmatter should be preserved intact
      const doc = await createTestDocument(
        testVault.vaultPath,
        'notes/test.md',
        '# Test Document',
        { title: 'Test', tags: ['important', 'work'] }
      );
      
      const targetPath = join(testVault.vaultPath, 'archive/test.md');
      const operation = new MoveOperation({ targetPath });
      
      await context.fs.mkdir(join(testVault.vaultPath, 'archive'), { recursive: true });
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      // Verify frontmatter is preserved
      const content = await readFile(targetPath, 'utf-8');
      expect(content).toContain('title: Test');
      expect(content).toContain('tags: important');
    });
  });
});