import { describe, it, expect } from 'vitest';
import type {
  DocumentOperation,
  OperationType,
  ValidationResult,
  ValidationError,
  OperationPreview,
  OperationResult,
  OperationContext,
  OperationOptions
} from '../src/types.js';
import type { Document } from '@mmt/entities';

describe('Type Definitions', () => {
  describe('OperationType', () => {
    it('should include all core operation types', () => {
      const validTypes: OperationType[] = [
        'move',
        'rename', 
        'updateFrontmatter',
        'delete',
        'transform'
      ];
      
      // This test ensures our types are properly defined
      expect(validTypes).toHaveLength(5);
    });
  });

  describe('ValidationResult', () => {
    it('should support valid result', () => {
      const result: ValidationResult = {
        valid: true
      };
      
      expect(result.valid).toBe(true);
      expect(result.errors).toBeUndefined();
    });

    it('should support invalid result with errors', () => {
      const errors: ValidationError[] = [
        {
          code: 'INVALID_PATH',
          message: 'Target path is invalid',
          field: 'targetPath'
        }
      ];
      
      const result: ValidationResult = {
        valid: false,
        errors
      };
      
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual(errors);
    });
  });

  describe('OperationPreview', () => {
    it('should include all required fields', () => {
      const preview: OperationPreview = {
        type: 'move',
        source: '/old/path.md',
        target: '/new/path.md',
        changes: [
          {
            type: 'link-update',
            file: '/other/doc.md',
            description: 'Update link from /old/path.md to /new/path.md'
          }
        ]
      };
      
      expect(preview.type).toBe('move');
      expect(preview.source).toBe('/old/path.md');
      expect(preview.target).toBe('/new/path.md');
      expect(preview.changes).toHaveLength(1);
    });

    it('should support operations without target', () => {
      const preview: OperationPreview = {
        type: 'delete',
        source: '/path/to/file.md',
        changes: []
      };
      
      expect(preview.target).toBeUndefined();
    });
  });

  describe('OperationResult', () => {
    it('should support successful result', () => {
      const doc: Document = {
        path: '/test.md',
        content: '# Test',
        metadata: {
          name: 'test',
          modified: new Date(),
          size: 100,
          frontmatter: {},
          tags: [],
          links: [],
          backlinks: []
        }
      };
      
      const result: OperationResult = {
        success: true,
        document: doc
      };
      
      expect(result.success).toBe(true);
      expect(result.document).toBe(doc);
      expect(result.error).toBeUndefined();
    });

    it('should support failed result', () => {
      const result: OperationResult = {
        success: false,
        error: new Error('Operation failed')
      };
      
      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Operation failed');
      expect(result.document).toBeUndefined();
    });
  });

  describe('OperationOptions', () => {
    it('should have sensible defaults', () => {
      const options: OperationOptions = {
        dryRun: true, // Safe by default
        updateLinks: true,
        createBackup: false,
        continueOnError: false
      };
      
      expect(options.dryRun).toBe(true);
      expect(options.updateLinks).toBe(true);
    });
  });

  describe('OperationContext', () => {
    it('should include all required dependencies', () => {
      // This is more of a compile-time test
      // Ensures our context has all needed services
      type ContextKeys = keyof OperationContext;
      const requiredKeys: ContextKeys[] = [
        'vault',
        'fs',
        'indexer',
        'options'
      ];
      
      expect(requiredKeys).toHaveLength(4);
    });
  });
});