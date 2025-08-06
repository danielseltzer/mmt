import { describe, it, expect } from 'vitest';
import { PreviewGenerator } from '../../src/services/preview-generator.js';
import type { Document, ScriptOperation } from '@mmt/entities';

describe('PreviewGenerator', () => {
  const generator = new PreviewGenerator();
  
  const mockDocuments: Document[] = [
    {
      path: '/vault/docs/example.md',
      content: '# Example',
      metadata: {
        name: 'example',
        modified: new Date('2024-01-01'),
        size: 100,
        frontmatter: { title: 'Example Doc', status: 'draft' },
        tags: [],
        links: [],
      },
    },
    {
      path: '/vault/notes/note.md',
      content: '# Note',
      metadata: {
        name: 'note',
        modified: new Date('2024-01-02'),
        size: 50,
        frontmatter: { title: 'Note', status: 'published' },
        tags: [],
        links: [],
      },
    },
  ];

  describe('generatePreview', () => {
    it('should generate preview for rename operation', () => {
      const operations: ScriptOperation[] = [
        {
          type: 'rename',
          newName: '{date}-{name}.md',
        },
      ];

      const preview = generator.generatePreview(mockDocuments, operations);

      expect(preview.preview).toBe(true);
      expect(preview.summary.documentsAffected).toBe(2);
      expect(preview.summary.operations).toHaveLength(1);
      
      const op = preview.summary.operations[0];
      expect(op.type).toBe('rename');
      expect(op.description).toContain('Rename files using template');
      expect(op.examples).toHaveLength(2);
      expect(op.examples[0].from).toBe('example.md');
      expect(op.examples[0].to).toMatch(/^\d{4}-\d{2}-\d{2}-example\.md$/);
    });

    it('should generate preview for move operation', () => {
      const operations: ScriptOperation[] = [
        {
          type: 'move',
          destination: '/vault/archive',
        },
      ];

      const preview = generator.generatePreview(mockDocuments, operations);

      const op = preview.summary.operations[0];
      expect(op.description).toBe('Move files to: /vault/archive');
      expect(op.examples[0].from).toBe('/vault/docs/example.md');
      expect(op.examples[0].to).toBe('/vault/archive/example.md');
    });

    it('should generate preview for delete operation with warning', () => {
      const operations: ScriptOperation[] = [
        {
          type: 'delete',
          permanent: true,
        },
      ];

      const preview = generator.generatePreview(mockDocuments, operations);

      expect(preview.summary.hasDestructiveOperations).toBe(true);
      
      const op = preview.summary.operations[0];
      expect(op.description).toContain('Delete files permanently');
      expect(op.warnings).toContain('This operation will permanently delete files and cannot be undone');
      expect(op.warnings).toContain('2 files will be deleted');
    });

    it('should generate preview for updateFrontmatter operation', () => {
      const operations: ScriptOperation[] = [
        {
          type: 'updateFrontmatter',
          updates: {
            status: 'reviewed',
            reviewer: 'admin',
          },
        },
      ];

      const preview = generator.generatePreview(mockDocuments, operations);

      const op = preview.summary.operations[0];
      expect(op.description).toBe('Update 2 frontmatter fields');
      expect(op.examples[0].from).toMatch(/status: (draft|published)/);
      expect(op.examples[0].to).toBe('status: reviewed');
    });

    it('should validate operations', () => {
      const invalidOperations: ScriptOperation[] = [
        {
          type: 'rename',
          // Missing newName
        },
        {
          type: 'move',
          // Missing destination
        },
      ];

      const preview = generator.generatePreview(mockDocuments, invalidOperations);

      expect(preview.validation.valid).toBe(false);
      expect(preview.validation.errors).toContain('Rename operation requires a template');
      expect(preview.validation.errors).toContain('Move operation requires a destination');
    });

    it('should describe filters', () => {
      const operations: ScriptOperation[] = [];
      const filters = {
        conditions: [
          {
            field: 'folders' as const,
            operator: 'in' as const,
            value: ['/vault/docs', '/vault/notes'],
          },
          {
            field: 'metadata' as const,
            operator: 'equals' as const,
            value: 'status',
          },
        ],
        logic: 'AND' as const,
      };

      const preview = generator.generatePreview(mockDocuments, operations, filters);

      expect(preview.filterDescription).toBe('in folders: /vault/docs, /vault/notes AND has frontmatter: status');
    });

    it('should detect potential naming conflicts', () => {
      const operations: ScriptOperation[] = [
        {
          type: 'rename',
          newName: 'document.md', // Same name for all files
        },
      ];

      const preview = generator.generatePreview(mockDocuments, operations);

      const op = preview.summary.operations[0];
      expect(op.warnings).toContain('Warning: Template may produce duplicate filenames');
    });
  });
});