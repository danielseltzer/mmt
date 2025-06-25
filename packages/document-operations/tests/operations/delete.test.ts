import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { join } from 'path';
import { DeleteOperation } from '../../src/operations/delete-operation.js';
import { createTestVault, createTestDocument, createTestContext } from '../test-utils.js';
import type { OperationContext } from '../../src/types.js';
import type { Document } from '@mmt/entities';

describe('DeleteOperation', () => {
  let vaultPath: string;
  let cleanup: () => Promise<void>;
  let context: OperationContext;
  let doc: Document;
  
  beforeEach(async () => {
    const vault = await createTestVault();
    vaultPath = vault.vaultPath;
    cleanup = vault.cleanup;
    context = await createTestContext(vaultPath);
    
    // Create a test document
    doc = await createTestDocument(
      vaultPath,
      'notes/test-note.md',
      '# Test Note\n\nThis is a test note.',
      { status: 'active', tags: ['test'] }
    );
  });
  
  afterEach(async () => {
    await cleanup();
  });
  
  describe('validation', () => {
    it('should validate delete operation for existing file', async () => {
      // GIVEN: A document that exists in the vault
      // WHEN: Validating a delete operation
      // THEN: Valid because file exists and can be deleted
      const operation = new DeleteOperation({});
      const result = await operation.validate(doc, context);
      
      expect(result.valid).toBe(true);
    });
    
    it('should fail validation when file does not exist', async () => {
      // GIVEN: A document path that doesn't exist
      // WHEN: Validating a delete operation
      // THEN: Invalid because file must exist to be deleted
      const nonExistentDoc: Document = {
        ...doc,
        path: join(vaultPath, 'non-existent.md')
      };
      
      const operation = new DeleteOperation({});
      const result = await operation.validate(nonExistentDoc, context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File does not exist');
    });
    
    it('should validate delete with trash folder option', async () => {
      // GIVEN: A document and trash folder configuration
      // WHEN: Validating with specific trash path
      // THEN: Valid with trash folder created if needed
      const operation = new DeleteOperation({
        trashPath: join(vaultPath, '.trash')
      });
      const result = await operation.validate(doc, context);
      
      expect(result.valid).toBe(true);
    });
    
    it('should fail validation when trying to delete outside vault', async () => {
      // GIVEN: A document path outside the vault
      // WHEN: Validating a delete operation
      // THEN: Invalid for security (prevents accidental system file deletion)
      const outsideDoc: Document = {
        ...doc,
        path: '/tmp/outside-vault.md'
      };
      
      const operation = new DeleteOperation({});
      const result = await operation.validate(outsideDoc, context);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot delete files outside vault');
    });
  });
  
  describe('preview', () => {
    it('should preview file deletion', async () => {
      // GIVEN: A document to be deleted
      // WHEN: Previewing the delete operation
      // THEN: Shows file will be moved to trash
      const operation = new DeleteOperation({});
      const preview = await operation.preview(doc, context);
      
      expect(preview.type).toBe('delete');
      expect(preview.source).toBe(doc.path);
      expect(preview.target).toMatch(/\.trash/);
      expect(preview.changes).toEqual([{
        type: 'file-move',
        file: doc.path,
        description: expect.stringContaining('Move to trash')
      }]);
    });
    
    it('should preview with affected links', async () => {
      // GIVEN: Documents that link to the file being deleted
      // WHEN: Previewing delete operation
      // THEN: Shows which files have links that will become broken
      // Create documents that link to our test document
      await createTestDocument(
        vaultPath,
        'notes/referrer1.md',
        'This links to [[test-note]].',
        {}
      );
      await createTestDocument(
        vaultPath,
        'notes/referrer2.md',
        'Another link to [[test-note]] here.',
        {}
      );
      
      // Re-initialize context to pick up new files
      context = await createTestContext(vaultPath);
      
      const operation = new DeleteOperation({});
      const preview = await operation.preview(doc, context);
      
      expect(preview.changes).toContainEqual({
        type: 'link-update',
        file: join(vaultPath, 'notes/referrer1.md'),
        description: 'Update link to deleted file'
      });
      expect(preview.changes).toContainEqual({
        type: 'link-update',
        file: join(vaultPath, 'notes/referrer2.md'),
        description: 'Update link to deleted file'
      });
    });
    
    it('should preview permanent deletion when trash disabled', async () => {
      // GIVEN: Delete operation with permanent deletion option
      // WHEN: Previewing the operation
      // THEN: Shows file will be permanently deleted (no trash)
      const operation = new DeleteOperation({
        permanent: true
      });
      const preview = await operation.preview(doc, context);
      
      expect(preview.type).toBe('delete');
      expect(preview.source).toBe(doc.path);
      expect(preview.target).toBeUndefined();
      expect(preview.changes).toEqual([{
        type: 'file-delete',
        file: doc.path,
        description: 'Permanently delete file'
      }]);
    });
  });
  
  describe('execute', () => {
    it('should move file to trash folder', async () => {
      // GIVEN: A document to delete
      // WHEN: Executing delete operation
      // THEN: File is moved to trash folder with timestamp
      const operation = new DeleteOperation({});
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      // Original file should not exist
      expect(await context.fs.exists(doc.path)).toBe(false);
      
      // File should exist in trash with timestamp
      const trashPath = join(vaultPath, '.trash');
      const files = await context.fs.readdir(trashPath);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/\d{8}-\d{6}-test-note\.md/);
      
      // Content should be preserved
      const trashedContent = await context.fs.readFile(join(trashPath, files[0]));
      expect(trashedContent).toBe(doc.content);
    });
    
    it('should update links in referencing documents', async () => {
      // GIVEN: Documents that link to the file being deleted
      // WHEN: Executing delete operation
      // THEN: Links are updated to show deleted status
      await createTestDocument(
        vaultPath,
        'notes/referrer.md',
        'This links to [[test-note]] and embeds ![[test-note]].',
        {}
      );
      
      // Re-initialize context
      context = await createTestContext(vaultPath);
      
      const operation = new DeleteOperation({});
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      // Check that links were updated
      const updatedContent = await context.fs.readFile(join(vaultPath, 'notes/referrer.md'));
      expect(updatedContent).toContain('[[test-note|❌ DELETED]]');
      expect(updatedContent).toContain('![[test-note|❌ DELETED]]');
    });
    
    it('should handle permanent deletion', async () => {
      // GIVEN: Delete operation with permanent flag
      // WHEN: Executing the operation
      // THEN: File is permanently deleted (not moved to trash)
      const operation = new DeleteOperation({
        permanent: true
      });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      // File should not exist anywhere
      expect(await context.fs.exists(doc.path)).toBe(false);
      
      // Trash should not exist or be empty
      const trashPath = join(vaultPath, '.trash');
      if (await context.fs.exists(trashPath)) {
        const files = await context.fs.readdir(trashPath);
        expect(files.length).toBe(0);
      }
    });
    
    it('should create backup when enabled', async () => {
      // GIVEN: Delete operation with backup enabled
      // WHEN: Executing the operation
      // THEN: Creates backup before deletion
      const operation = new DeleteOperation({
        createBackup: true
      });
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      // Check backup exists
      const backupPath = join(vaultPath, '.backups');
      const files = await context.fs.readdir(backupPath);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/test-note.*\.backup$/);
    });
    
    it('should respect dry run mode', async () => {
      // GIVEN: Delete operation with dry run enabled
      // WHEN: Executing the operation
      // THEN: Simulates deletion without actually deleting
      context.options.dryRun = true;
      
      const operation = new DeleteOperation({});
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(true);
      
      // File should still exist
      expect(await context.fs.exists(doc.path)).toBe(true);
      
      // No trash folder should be created
      const trashPath = join(vaultPath, '.trash');
      expect(await context.fs.exists(trashPath)).toBe(false);
    });
    
    it('should handle deletion errors gracefully', async () => {
      // GIVEN: A file that will cause deletion error
      // WHEN: Executing delete operation
      // THEN: Returns error without partial changes
      // Make the file read-only to cause an error
      await context.fs.writeFile(doc.path + '.lock', 'locked');
      
      const operation = new DeleteOperation({});
      
      // Mock the fs.rename to throw an error
      const originalRename = context.fs.rename;
      context.fs.rename = async () => {
        throw new Error('Permission denied');
      };
      
      const result = await operation.execute(doc, context);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Permission denied');
      
      // Restore original rename
      context.fs.rename = originalRename;
      
      // Original file should still exist
      expect(await context.fs.exists(doc.path)).toBe(true);
    });
    
    it('should organize trash by date folders', async () => {
      // GIVEN: Delete operation with date organization
      // WHEN: Deleting multiple files
      // THEN: Files are organized in trash by date
      const operation = new DeleteOperation({
        organizeTrashdByDate: true
      });
      
      const result = await operation.execute(doc, context);
      expect(result.success).toBe(true);
      
      // Check trash organization
      const trashPath = join(vaultPath, '.trash');
      const dateFolders = await context.fs.readdir(trashPath);
      expect(dateFolders.length).toBe(1);
      expect(dateFolders[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      
      // Check file is in date folder
      const dateFolder = join(trashPath, dateFolders[0]);
      const files = await context.fs.readdir(dateFolder);
      expect(files.length).toBe(1);
      expect(files[0]).toMatch(/\d{6}-test-note\.md/);
    });
  });
});