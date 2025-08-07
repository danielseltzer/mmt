import { describe, it, expect } from 'vitest';
import {
  ConfigSchema,
  DocumentMetadataSchema,
  DocumentSchema,
  QueryInputSchema,
  OperationSchema,
  VaultSchema,
  ExecutionResultSchema,
  type Config,
  type DocumentMetadata,
  type Document,
  type QueryInput,
  type Operation,
  type Vault,
  type ExecutionResult,
} from './index.js';

describe('Entity Schemas', () => {
  describe('ConfigSchema', () => {
    it('should validate valid config', () => {
      // GIVEN: A config object with required vaults array
      // WHEN: Validating against ConfigSchema
      // THEN: Valid because vaults contain name, path, and indexPath
      const config: Config = {
        vaults: [
          {
            name: 'TestVault',
            path: '/Users/test/vault',
            indexPath: '/Users/test/.mmt/index',
          }
        ],
        apiPort: 3001,
        webPort: 5173,
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it('should require vaults array', () => {
      // GIVEN: A config missing required vaults array
      // WHEN: Validating against ConfigSchema
      // THEN: Invalid because vaults is required (no defaults policy)
      const config = {
        apiPort: 3001,
        webPort: 5173,
        // missing vaults
      };
      
      const result = ConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it('should reject invalid config', () => {
      // GIVEN: A config with wrong data types
      // WHEN: Validating against ConfigSchema
      // THEN: Invalid because vaults must be an array, not a string
      const invalidConfig = {
        vaults: 'not-an-array', // Should be array
        apiPort: 3001,
        webPort: 5173,
      };
      
      const result = ConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });

  describe('DocumentMetadataSchema', () => {
    it('should validate document metadata', () => {
      // GIVEN: Complete document metadata with all fields
      // WHEN: Validating against DocumentMetadataSchema
      // THEN: Valid with all required fields (path, name, modified, size) and optional fields
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
      // GIVEN: Document metadata with only required fields
      // WHEN: Validating against DocumentMetadataSchema
      // THEN: Valid with optional fields defaulting to empty objects/arrays
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

  describe('QueryInputSchema with namespaces', () => {
    it('should validate query with namespace format', () => {
      // GIVEN: Query with namespace:property format
      // WHEN: Validating against QueryInputSchema
      // THEN: Valid because all properties use correct namespace prefixes (fs:, fm:, content:)
      const query: QueryInput = {
        'fs:path': 'folder/**',
        'fs:modified': '>2024-01-01',
        'fm:status': 'draft',
        'fm:tags': { contains: 'important' },
        'content:text': 'search term',
        sort: 'modified',
        order: 'desc',
      };
      
      const result = QueryInputSchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should reject query without namespace prefix', () => {
      // GIVEN: Query properties without namespace prefixes
      // WHEN: Validating against QueryInputSchema
      // THEN: Invalid because all query properties must have namespace (prevents ambiguity)
      const query = {
        path: 'folder/', // Missing namespace
        status: 'draft', // Missing namespace
      };
      
      const result = QueryInputSchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate empty query', () => {
      // GIVEN: An empty query object
      // WHEN: Validating against QueryInputSchema
      // THEN: Valid because empty queries select all documents
      const query: QueryInput = {};
      
      const result = QueryInputSchema.safeParse(query);
      expect(result.success).toBe(true);
    });

  });

  describe('OperationSchema', () => {
    it('should validate move operation', () => {
      // GIVEN: A move operation with source and target paths
      // WHEN: Validating against OperationSchema
      // THEN: Valid because move requires both sourcePath and targetPath
      const op: Operation = {
        type: 'move',
        sourcePath: '/old/path.md',
        targetPath: '/new/path.md',
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate update-frontmatter operation', () => {
      // GIVEN: An update-frontmatter operation with updates object
      // WHEN: Validating against OperationSchema
      // THEN: Valid with path, updates object, and optional mode (merge/replace)
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
      // GIVEN: An operation with unsupported type
      // WHEN: Validating against OperationSchema
      // THEN: Invalid because type must be one of the defined operation types
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
      // GIVEN: A complete document with content and metadata
      // WHEN: Validating against DocumentSchema
      // THEN: Valid with path, content string, and metadata object
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
      // GIVEN: A vault with documents and indices
      // WHEN: Validating against VaultSchema
      // THEN: Valid with basePath, documents Map, and index structure for fast lookups
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
      // GIVEN: A remove-frontmatter operation with keys array
      // WHEN: Validating against OperationSchema
      // THEN: Valid with path and array of property keys to remove
      const op: Operation = {
        type: 'remove-frontmatter',
        path: '/path/to/file.md',
        keys: ['deprecated', 'old_field'],
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate delete operation', () => {
      // GIVEN: A delete operation with file path
      // WHEN: Validating against OperationSchema
      // THEN: Valid with just path (moves to trash, not permanent deletion)
      const op: Operation = {
        type: 'delete',
        path: '/path/to/delete.md',
      };
      
      const result = OperationSchema.safeParse(op);
      expect(result.success).toBe(true);
    });

    it('should validate create operation', () => {
      // GIVEN: A create operation with content and metadata
      // WHEN: Validating against OperationSchema
      // THEN: Valid with path, content, and optional metadata for new file
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
      // GIVEN: A successful execution with vault state and changes
      // WHEN: Validating against ExecutionResultSchema
      // THEN: Valid with success=true, vault state, and detailed change tracking
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
      // GIVEN: A failed execution with error
      // WHEN: Validating against ExecutionResultSchema
      // THEN: Valid with success=false and error object (no vault state on failure)
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