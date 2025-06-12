import { describe, it, expect } from 'vitest';
import {
  ConfigSchema,
  DocumentMetadataSchema,
  QuerySchema,
  OperationSchema,
  type Config,
  type DocumentMetadata,
  type Query,
  type Operation,
} from './index.js';

describe('Entity Schemas', () => {
  describe('ConfigSchema', () => {
    it('should validate valid config', () => {
      const config: Config = {
        vaultPath: '/Users/test/vault',
        qmServiceUrl: 'http://localhost:8080',
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should validate config without optional qmServiceUrl', () => {
      const config: Config = {
        vaultPath: '/Users/test/vault',
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should reject invalid config', () => {
      const invalidConfig = {
        vaultPath: 123, // Should be string
      };
      
      const result = ConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentMetadataSchema', () => {
    it('should validate document metadata', () => {
      const doc: DocumentMetadata = {
        path: '/Users/test/vault/note.md',
        relativePath: 'note.md',
        name: 'note',
        modified: new Date(),
        size: 1024,
        frontmatter: { title: 'Test Note', tags: ['test'] },
        tags: ['test'],
        links: ['other-note.md'],
      };
      
      const result = DocumentMetadataSchema.safeParse(doc);
      expect(result.success).toBe(true);
    });

    it('should validate minimal document metadata', () => {
      const doc: DocumentMetadata = {
        path: '/Users/test/vault/note.md',
        relativePath: 'note.md',
        name: 'note',
        modified: new Date(),
        size: 1024,
      };
      
      const result = DocumentMetadataSchema.safeParse(doc);
      expect(result.success).toBe(true);
    });
  });

  describe('QuerySchema', () => {
    it('should validate complex query', () => {
      const query: Query = {
        text: 'search term',
        path: 'folder/',
        tag: ['tag1', 'tag2'],
        has: ['property1'],
        is: ['draft'],
        sort: 'modified',
        order: 'desc',
      };
      
      const result = QuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should validate empty query', () => {
      const query: Query = {};
      
      const result = QuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  describe('OperationSchema', () => {
    it('should validate move operation', () => {
      const op: Operation = {
        type: 'move',
        sourcePath: '/old/path.md',
        targetPath: '/new/path.md',
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate update-frontmatter operation', () => {
      const op: Operation = {
        type: 'update-frontmatter',
        path: '/path/to/file.md',
        updates: { title: 'New Title', tags: ['updated'] },
        mode: 'merge',
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should reject invalid operation type', () => {
      const invalidOp = {
        type: 'invalid-type',
        path: '/path/to/file.md',
      };
      
      const result = OperationSchema.safeParse(invalidOp);
      expect(result.success).toBe(false);
    });
  });
});