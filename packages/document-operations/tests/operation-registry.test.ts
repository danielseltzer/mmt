import { describe, it, expect, beforeEach } from 'vitest';
import { 
  OperationRegistry, 
  DocumentOperation,
  OperationType,
  ValidationResult 
} from '../src/index.js';
import type { Document } from '@mmt/entities';

describe('OperationRegistry', () => {
  let registry: OperationRegistry;
  
  beforeEach(() => {
    registry = new OperationRegistry();
  });

  describe('registration', () => {
    it('should register operation factories by type', () => {
      // Arrange
      const customFactory = () => new MockOperation('transform');
      
      // Act
      registry.register('transform', customFactory);
      
      // Assert
      expect(registry.has('transform')).toBe(true);
    });

    it('should throw when registering duplicate operation type', () => {
      // Arrange
      const factory1 = () => new MockOperation('transform');
      const factory2 = () => new MockOperation('transform');
      registry.register('transform', factory1);
      
      // Act & Assert
      expect(() => registry.register('transform', factory2))
        .toThrow('Operation type "transform" is already registered');
    });

    it('should list all registered operation types', () => {
      // Should already have default operations registered
      const types = registry.getTypes();
      
      // Assert
      expect(types).toContain('move');
      expect(types).toContain('rename');
      expect(types).toContain('updateFrontmatter');
      expect(types).toContain('delete');
    });
  });

  describe('operation creation', () => {
    it('should create operation instance from registered factory', () => {
      // Arrange
      const transformOp = new MockOperation('transform');
      registry.register('transform', () => transformOp);
      
      // Act
      const created = registry.create('transform', { targetPath: '/new/path' });
      
      // Assert
      expect(created).toBe(transformOp);
    });

    it('should pass options to operation factory', () => {
      // Arrange
      let receivedOptions: any;
      const factory = (options: any) => {
        receivedOptions = options;
        return new MockOperation('transform');
      };
      registry.register('transform', factory);
      
      // Act
      const options = { targetPath: '/new/path' };
      registry.create('transform', options);
      
      // Assert
      expect(receivedOptions).toEqual(options);
    });

    it('should throw when creating unregistered operation type', () => {
      // Act & Assert
      expect(() => registry.create('unknown' as OperationType, {}))
        .toThrow('Unknown operation type: unknown');
    });
  });

  describe('built-in operations', () => {
    it('should have move operation registered by default', () => {
      // Assert
      expect(registry.has('move')).toBe(true);
    });

    it('should have rename operation registered by default', () => {
      // Assert
      expect(registry.has('rename')).toBe(true);
    });

    it('should have updateFrontmatter operation registered by default', () => {
      // Assert
      expect(registry.has('updateFrontmatter')).toBe(true);
    });

    it('should have delete operation registered by default', () => {
      // Assert
      expect(registry.has('delete')).toBe(true);
    });
  });
});

// Mock operation for testing
class MockOperation implements DocumentOperation {
  constructor(public readonly type: OperationType) {}
  
  async validate(doc: Document, context: any): Promise<ValidationResult> {
    return { valid: true };
  }
  
  async preview(doc: Document, context: any) {
    return {
      type: this.type,
      source: doc.path,
      changes: []
    };
  }
  
  async execute(doc: Document, context: any) {
    return {
      success: true,
      document: doc
    };
  }
}