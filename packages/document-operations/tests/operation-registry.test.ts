import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  OperationRegistry, 
  DocumentOperation,
  OperationType,
  MoveOperation,
  RenameOperation,
  UpdateFrontmatterOperation,
  DeleteOperation
} from '../src/index.js';
import { createTestVault, createTestDocument, createTestContext } from './test-utils.js';
import type { Document } from '@mmt/entities';

describe('OperationRegistry', () => {
  let registry: OperationRegistry;
  let testVault: { vaultPath: string; cleanup: () => Promise<void> };
  let context: any;
  
  beforeEach(async () => {
    registry = new OperationRegistry();
    testVault = await createTestVault();
    context = await createTestContext(testVault.vaultPath);
  });

  afterEach(async () => {
    await testVault.cleanup();
  });

  describe('default operations', () => {
    it('should have move operation registered by default', () => {
      expect(registry.has('move')).toBe(true);
    });

    it('should have rename operation registered by default', () => {
      expect(registry.has('rename')).toBe(true);
    });

    it('should have updateFrontmatter operation registered by default', () => {
      expect(registry.has('updateFrontmatter')).toBe(true);
    });

    it('should have delete operation registered by default', () => {
      expect(registry.has('delete')).toBe(true);
    });

    it('should list all default operation types', () => {
      const types = registry.getTypes();
      expect(types).toContain('move');
      expect(types).toContain('rename');
      expect(types).toContain('updateFrontmatter');
      expect(types).toContain('delete');
    });
  });

  describe('operation creation', () => {
    it('should create real move operation instance', () => {
      const operation = registry.create('move', { targetPath: '/new/path.md' });
      expect(operation).toBeInstanceOf(MoveOperation);
      expect(operation.type).toBe('move');
    });

    it('should create real rename operation instance', () => {
      const operation = registry.create('rename', { newName: 'renamed.md' });
      expect(operation).toBeInstanceOf(RenameOperation);
      expect(operation.type).toBe('rename');
    });

    it('should create real updateFrontmatter operation instance', () => {
      const operation = registry.create('updateFrontmatter', { 
        updates: { title: 'New Title' } 
      });
      expect(operation).toBeInstanceOf(UpdateFrontmatterOperation);
      expect(operation.type).toBe('updateFrontmatter');
    });

    it('should create real delete operation instance', () => {
      const operation = registry.create('delete', {});
      expect(operation).toBeInstanceOf(DeleteOperation);
      expect(operation.type).toBe('delete');
    });

    it('should pass options to operation constructor', async () => {
      const targetPath = '/test/moved.md';
      const operation = registry.create('move', { targetPath });
      
      // Create a test document
      const doc = await createTestDocument(
        testVault.vaultPath,
        'test.md',
        '# Test'
      );
      
      // Preview should show the target path we provided
      const preview = await operation.preview(doc, context);
      expect(preview.target).toBe(targetPath);
    });

    it('should throw when creating unregistered operation type', () => {
      expect(() => registry.create('unknown' as OperationType, {}))
        .toThrow('Unknown operation type: unknown');
    });
  });

  describe('custom operation registration', () => {
    it('should allow registering custom operations', () => {
      // Create a real transform operation implementation
      class TransformOperation implements DocumentOperation {
        readonly type = 'transform' as const;
        
        constructor(private options: { transform: (content: string) => string }) {}
        
        async validate(doc: Document, context: any) {
          return { valid: true };
        }
        
        async preview(doc: Document, context: any) {
          return {
            type: 'transform' as const,
            source: doc.path,
            changes: [{
              type: 'file-move' as const,
              file: doc.path,
              description: 'Transform content'
            }]
          };
        }
        
        async execute(doc: Document, context: any) {
          // Real implementation would transform and save the file
          const newContent = this.options.transform(doc.content);
          await context.fs.writeFile(doc.path, newContent);
          
          return {
            success: true,
            document: {
              ...doc,
              content: newContent
            }
          };
        }
      }
      
      // Register the custom operation
      registry.register('transform', (options) => new TransformOperation(options));
      
      // Verify it's registered
      expect(registry.has('transform')).toBe(true);
      expect(registry.getTypes()).toContain('transform');
      
      // Verify we can create it
      const operation = registry.create('transform', { 
        transform: (content: string) => content.toUpperCase() 
      });
      expect(operation.type).toBe('transform');
    });

    it('should throw when registering duplicate operation type', () => {
      // Try to register over an existing operation
      expect(() => {
        registry.register('move', () => new MoveOperation({ targetPath: '/test' }));
      }).toThrow('Operation type "move" is already registered');
    });
  });
});