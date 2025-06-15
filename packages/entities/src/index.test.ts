import { describe, it, expect } from 'vitest';
import {
  ConfigSchema,
  DocumentMetadataSchema,
  DocumentSchema,
  QuerySchema,
  OperationSchema,
  VaultSchema,
  ExecutionResultSchema,
  type Config,
  type DocumentMetadata,
  type Document,
  type Query,
  type Operation,
  type Vault,
  type ExecutionResult,
} from './index.js';

describe('Entity Schemas', () => {
  describe('ConfigSchema', () => {
    it('should validate valid config', () => {
      const config: Config = {
        vaultPath: '/Users/test/vault',
        indexPath: '/Users/test/.mmt/index',
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should require both vaultPath and indexPath', () => {
      const config = {
        vaultPath: '/Users/test/vault',
        // missing indexPath
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
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

    it('should validate minimal document metadata with defaults', () => {
      const doc = {
        path: '/Users/test/vault/note.md',
        relativePath: 'note.md',
        name: 'note',
        modified: new Date(),
        size: 1024,
      };
      
      const result = DocumentMetadataSchema.safeParse(doc);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.frontmatter).toEqual({});
        expect(result.data.tags).toEqual([]);
        expect(result.data.links).toEqual([]);
      }
    });
  });

  describe('QuerySchema with namespaces', () => {
    it('should validate query with namespace format', () => {
      const query: Query = {
        'fs:path': 'folder/**',
        'fs:modified': '>2024-01-01',
        'fm:status': 'draft',
        'fm:tags': { contains: 'important' },
        'content:text': 'search term',
        sort: 'modified',
        order: 'desc',
      };
      
      const result = QuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should reject query without namespace prefix', () => {
      const query = {
        path: 'folder/', // Missing namespace
        status: 'draft', // Missing namespace
      };
      
      const result = QuerySchema.safeParse(query);
      expect(result.success).toBe(false);
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

  describe('DocumentSchema', () => {
    it('should validate full document', () => {
      const doc: Document = {
        path: '/Users/test/vault/note.md',
        content: '# Test Note\n\nContent here.',
        metadata: {
          name: 'note',
          modified: new Date(),
          size: 1024,
          frontmatter: { title: 'Test' },
          tags: ['test'],
          links: [],
        },
      };
      
      const result = DocumentSchema.safeParse(doc);
      expect(result.success).toBe(true);
    });
  });

  describe('VaultSchema', () => {
    it('should validate vault structure', () => {
      const vault: Vault = {
        basePath: '/Users/test/vault',
        documents: new Map([
          ['/Users/test/vault/note.md', {
            path: '/Users/test/vault/note.md',
            content: '# Note',
            metadata: {
              name: 'note',
              modified: new Date(),
              size: 100,
              frontmatter: {},
              tags: [],
              links: [],
            },
          }],
        ]),
        index: {
          byTag: new Map([['test', ['/Users/test/vault/note.md']]]),
          byPath: new Map([['/Users/test/vault', ['/Users/test/vault/note.md']]]),
          links: new Map(),
          backlinks: new Map(),
        },
      };
      
      const result = VaultSchema.safeParse(vault);
      expect(result.success).toBe(true);
    });
  });

  describe('New Operation Types', () => {
    it('should validate remove-frontmatter operation', () => {
      const op: Operation = {
        type: 'remove-frontmatter',
        path: '/path/to/file.md',
        keys: ['deprecated', 'old_field'],
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate delete operation', () => {
      const op: Operation = {
        type: 'delete',
        path: '/path/to/delete.md',
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate create operation', () => {
      const op: Operation = {
        type: 'create',
        path: '/path/to/new.md',
        content: '# New Document',
        metadata: {
          name: 'new',
          tags: ['created'],
        },
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });
  });

  describe('ExecutionResultSchema', () => {
    it('should validate successful execution result', () => {
      const result: ExecutionResult = {
        success: true,
        vault: {
          basePath: '/vault',
          documents: new Map(),
          index: {
            byTag: new Map(),
            byPath: new Map(),
            links: new Map(),
            backlinks: new Map(),
          },
        },
        executed: [{
          type: 'move',
          sourcePath: '/old.md',
          targetPath: '/new.md',
        }],
        movedFiles: { '/old.md': '/new.md' },
        updatedLinks: [{
          inFile: '/other.md',
          oldTarget: '/old.md',
          newTarget: '/new.md',
        }],
        modifiedFiles: [],
      };
      
      const parsed = ExecutionResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });

    it('should validate failed execution result', () => {
      const result: ExecutionResult = {
        success: false,
        error: new Error('Permission denied'),
        executed: [],
        movedFiles: {},
        updatedLinks: [],
        modifiedFiles: [],
      };
      
      const parsed = ExecutionResultSchema.safeParse(result);
      expect(parsed.success).toBe(true);
    });
  });
});