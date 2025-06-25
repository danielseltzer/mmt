import { describe, it, expect } from 'vitest';
import { ResultFormatter } from '../src/result-formatter.js';
import type { ScriptExecutionResult } from '@mmt/entities';

describe('ResultFormatter', () => {
  const formatter = new ResultFormatter();
  
  const mockResult: ScriptExecutionResult = {
    attempted: [
      { path: 'a.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 100 } },
      { path: 'b.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 200 } },
    ],
    succeeded: [
      {
        item: { path: 'a.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 100 } },
        operation: { type: 'move', destination: 'archive' },
        details: { moved: true },
      },
    ],
    failed: [
      {
        item: { path: 'b.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 200 } },
        operation: { type: 'delete' },
        error: new Error('Permission denied'),
      },
    ],
    skipped: [],
    stats: {
      duration: 150,
      startTime: new Date('2024-01-01T10:00:00'),
      endTime: new Date('2024-01-01T10:00:00.150'),
    },
  };

  describe('summary format', () => {
    it('should format preview mode summary', () => {
      // GIVEN: Execution results in preview mode
      // WHEN: Formatting as summary
      // THEN: Shows preview warning and would-be actions
      const output = formatter.format(mockResult, {
        format: 'summary',
        isPreview: true,
      });

      expect(output).toContain('PREVIEW MODE - No changes made');
      expect(output).toContain('Selected 2 files');
      expect(output).toContain('Would process: 1');
      expect(output).toContain('Failed: 1');
      expect(output).toContain('Duration: 150ms');
      expect(output).toContain('To execute these changes, run with --execute flag');
    });

    it('should format execution summary', () => {
      // GIVEN: Execution results from actual run
      // WHEN: Formatting as summary
      // THEN: Shows completion status without preview warnings
      const output = formatter.format(mockResult, {
        format: 'summary',
        isPreview: false,
      });

      expect(output).toContain('EXECUTION COMPLETE');
      expect(output).toContain('Processed: 1');
      expect(output).not.toContain('Would process');
      expect(output).not.toContain('--execute flag');
    });
  });

  describe('detailed format', () => {
    it('should format detailed preview', () => {
      // GIVEN: Mixed success/failure results
      // WHEN: Formatting as detailed preview
      // THEN: Groups by operation type with success/failure indicators
      const output = formatter.format(mockResult, {
        format: 'detailed',
        isPreview: true,
      });

      expect(output).toContain('PREVIEW MODE');
      expect(output).toContain('Selected 2 files matching criteria');
      expect(output).toContain('Would move to archive:');
      expect(output).toContain('✓ a.md');
      expect(output).toContain('Failed operations:');
      expect(output).toContain('✗ b.md: Permission denied');
    });

    it('should group operations by type', () => {
      // GIVEN: Multiple operations of different types
      // WHEN: Formatting detailed output
      // THEN: Groups files by operation type for clarity
      const multiOpResult: ScriptExecutionResult = {
        ...mockResult,
        succeeded: [
          {
            item: { path: 'a.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 100 } },
            operation: { type: 'move', destination: 'archive' },
            details: {},
          },
          {
            item: { path: 'c.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 100 } },
            operation: { type: 'move', destination: 'archive' },
            details: {},
          },
          {
            item: { path: 'd.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 100 } },
            operation: { type: 'delete' },
            details: {},
          },
        ],
      };

      const output = formatter.format(multiOpResult, {
        format: 'detailed',
        isPreview: true,
      });

      expect(output).toContain('Would move to archive:');
      expect(output).toContain('Would delete:');
    });

    it('should show skipped operations', () => {
      // GIVEN: Operations skipped for safety reasons
      // WHEN: Formatting detailed output
      // THEN: Shows skipped files with clear reasons
      const skipResult: ScriptExecutionResult = {
        ...mockResult,
        skipped: [
          {
            item: { path: 'skip.md', content: '', metadata: { created: new Date(), modified: new Date(), size: 100 } },
            operation: { type: 'move', destination: 'archive' },
            reason: 'File already exists at destination',
          },
        ],
      };

      const output = formatter.format(skipResult, {
        format: 'detailed',
        isPreview: false,
      });

      expect(output).toContain('Skipped:');
      expect(output).toContain('skip.md: File already exists at destination');
    });
  });

  describe('JSON format', () => {
    it('should output valid JSON', () => {
      // GIVEN: Script execution results
      // WHEN: Formatting as JSON
      // THEN: Outputs parseable JSON with all result details
      const output = formatter.format(mockResult, {
        format: 'json',
        isPreview: false,
      });

      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('attempted', 2);
      expect(parsed.succeeded).toHaveLength(1);
      expect(parsed.failed).toHaveLength(1);
      expect(parsed.succeeded[0]).toEqual({
        path: 'a.md',
        operation: 'move',
        moved: true,
      });
      expect(parsed.failed[0]).toEqual({
        path: 'b.md',
        operation: 'delete',
        error: 'Permission denied',
      });
    });
  });

  describe('CSV format', () => {
    it('should output valid CSV', () => {
      // GIVEN: Script execution results
      // WHEN: Formatting as CSV
      // THEN: Outputs CSV with path, operation, status columns
      const output = formatter.format(mockResult, {
        format: 'csv',
        isPreview: false,
      });

      const lines = output.trim().split('\n');
      expect(lines[0]).toBe('"path","operation","status"');
      expect(lines[1]).toBe('"a.md","move","succeeded"');
      expect(lines[2]).toBe('"b.md","delete","failed: Permission denied"');
    });

    it('should handle empty results', () => {
      // GIVEN: No files matched selection criteria
      // WHEN: Formatting empty results as CSV
      // THEN: Outputs header row only
      const emptyResult: ScriptExecutionResult = {
        attempted: [],
        succeeded: [],
        failed: [],
        skipped: [],
        stats: {
          duration: 0,
          startTime: new Date(),
          endTime: new Date(),
        },
      };

      const output = formatter.format(emptyResult, {
        format: 'csv',
        isPreview: false,
      });

      const lines = output.trim().split('\n');
      expect(lines).toHaveLength(1); // Just header
      expect(lines[0]).toBe('"path","operation","status"');
    });
  });
});