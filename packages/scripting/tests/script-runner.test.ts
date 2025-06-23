import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ScriptRunner } from '../src/script-runner.js';
import type { Script, ScriptContext, OperationPipeline } from '../src/index.js';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';

describe('ScriptRunner', () => {
  let tempDir: string;
  let scriptRunner: ScriptRunner;
  let mockFs: FileSystemAccess;
  let output: string[];

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-test-'));
    output = [];
    
    // Mock filesystem
    mockFs = {
      exists: vi.fn().mockResolvedValue(true),
      stat: vi.fn().mockResolvedValue({
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
        ctime: new Date(),
      }),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      readdir: vi.fn(),
      rename: vi.fn(),
      unlink: vi.fn(),
      glob: vi.fn().mockResolvedValue([]),
    };

    const mockOutputStream = {
      write: (chunk: string) => {
        output.push(chunk);
        return true;
      },
    };

    scriptRunner = new ScriptRunner({
      config: {
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
      },
      fileSystem: mockFs,
      queryParser: new QueryParser(),
      outputStream: mockOutputStream as any,
    });
  });

  describe('execute with test script', () => {
    it('should run in preview mode by default', async () => {
      // GIVEN: A script with destructive operations
      // WHEN: Executing without explicit --execute flag
      // THEN: Runs in preview mode showing what would happen (safety first)
      // Create a test script class
      class TestScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['test.md'] },
            operations: [{ type: 'delete' }],
          };
        }
      }

      const testScript = new TestScript();
      const pipeline = testScript.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'test.mmt.ts',
        cliOptions: {},
      });

      const result = await scriptRunner.executePipeline(pipeline, { executeNow: false });

      expect(result.succeeded).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(result.succeeded[0].details).toEqual({ preview: true });
      
      // Check output
      expect(output.join('')).toContain('PREVIEW MODE');
      expect(output.join('')).toContain('To execute these changes, run with --execute flag');
    });

    it('should throw error for operations when executeNow is true', async () => {
      // GIVEN: A script with executeNow: true
      // WHEN: Running with operations that aren't implemented yet
      // THEN: Operations fail with clear "not implemented" error
      class TestScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['test.md'] },
            operations: [{ type: 'move', destination: 'archive' }],
            options: { executeNow: true },
          };
        }
      }

      const testScript = new TestScript();
      const pipeline = testScript.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'test.mmt.ts',
        cliOptions: {},
      });

      const result = await scriptRunner.executePipeline(pipeline, { executeNow: true });

      // Operations should fail with not implemented error
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].error.message).toContain("Operation 'move' is not yet implemented");
      
      // Check output shows execution attempted
      expect(output.join('')).toContain('EXECUTION COMPLETE');
      expect(output.join('')).not.toContain('PREVIEW MODE');
    });

    it('should handle script with filter function', async () => {
      // GIVEN: A script that selects files then applies a filter function
      // WHEN: Filter function narrows down the selection
      // THEN: Operations only apply to files passing the filter
      class FilterScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['old.md', 'new.md'] },
            filter: (doc) => doc.path.includes('old'),
            operations: [{ type: 'delete' }],
          };
        }
      }

      const script = new FilterScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'filter.mmt.ts',
        cliOptions: {},
      });

      const result = await scriptRunner.executePipeline(pipeline, { executeNow: false });

      // Only one file should pass the filter
      expect(result.attempted).toHaveLength(1);
      expect(result.succeeded).toHaveLength(1);
      expect(result.succeeded[0].item.path).toBe('old.md');
    });

    it('should format output based on preferences', async () => {
      // GIVEN: A script with output format preference
      // WHEN: Setting format to 'detailed'
      // THEN: Shows verbose output with file-by-file breakdown
      class DetailedScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['a.md', 'b.md'] },
            operations: [{ type: 'move', destination: 'processed' }],
            output: { format: 'detailed' },
          };
        }
      }

      const script = new DetailedScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'detailed.mmt.ts',
        cliOptions: {},
      });

      await scriptRunner.executePipeline(pipeline, { executeNow: false });

      const outputText = output.join('');
      expect(outputText).toContain('Selected 2 files matching criteria');
      expect(outputText).toContain('Would move to processed:');
      expect(outputText).toContain('✓ a.md');
      expect(outputText).toContain('✓ b.md');
    });

    it('should handle all operations as not implemented', async () => {
      // GIVEN: Script runner without operation implementations
      // WHEN: Attempting to execute any operation
      // THEN: Gracefully reports operations as not implemented
      const runner = new ScriptRunner({
        config: {
          vaultPath: tempDir,
          indexPath: join(tempDir, '.mmt-index'),
        },
        fileSystem: mockFs,
        queryParser: new QueryParser(),
        outputStream: { write: (chunk: string) => { output.push(chunk); return true; } } as any,
      });

      class FailScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['test1.md', 'test2.md'] },
            operations: [{ type: 'delete' }],
          };
        }
      }

      const script = new FailScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'fail.mmt.ts',
        cliOptions: {},
      });

      const result = await runner.executePipeline(pipeline, { executeNow: true });

      // All operations should fail as not implemented
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(2);
      expect(result.failed[0].error.message).toContain("Operation 'delete' is not yet implemented");
      expect(result.failed[1].error.message).toContain("Operation 'delete' is not yet implemented");
    });

    it('should respect failFast option', async () => {
      // GIVEN: A script with failFast: true and multiple files
      // WHEN: First operation fails
      // THEN: Stops processing remaining files immediately
      const runner = new ScriptRunner({
        config: {
          vaultPath: tempDir,
          indexPath: join(tempDir, '.mmt-index'),
        },
        fileSystem: mockFs,
        queryParser: new QueryParser(),
        outputStream: { write: () => true } as any,
      });

      class FailFastScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['1.md', '2.md', '3.md'] },
            operations: [{ type: 'delete' }],
            options: { failFast: true },
          };
        }
      }

      const script = new FailFastScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'failfast.mmt.ts',
        cliOptions: {},
      });

      const result = await runner.executePipeline(pipeline, { executeNow: true, failFast: true });

      // Should stop after first failure (all operations are not implemented)
      expect(result.failed).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed[0].error.message).toContain("Operation 'delete' is not yet implemented");
    });
  });

  describe('selection validation', () => {
    it('should throw error when indexer not initialized for query-based selection', async () => {
      // GIVEN: A script using query-based selection (not simple file list)
      // WHEN: Indexer is not initialized
      // THEN: Throws clear error that indexer is required for queries
      class QueryScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { 'fs:path': 'posts/**/*.md' },
            operations: [{ type: 'delete' }],
          };
        }
      }

      const script = new QueryScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'query.mmt.ts',
        cliOptions: {},
      });

      await expect(
        scriptRunner.executePipeline(pipeline, { executeNow: false })
      ).rejects.toThrow('Indexer not initialized');
    });
  });

  describe('output formats', () => {
    it('should output JSON format', async () => {
      // GIVEN: A script with output format: 'json'
      // WHEN: Executing the pipeline
      // THEN: Outputs valid JSON with attempted, succeeded, and stats
      class JsonScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['test.md'] },
            operations: [{ type: 'delete' }],
            output: { format: 'json' },
          };
        }
      }

      const script = new JsonScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'json.mmt.ts',
        cliOptions: {},
      });

      await scriptRunner.executePipeline(pipeline, { executeNow: false });

      const jsonOutput = output.join('');
      const parsed = JSON.parse(jsonOutput);
      
      expect(parsed).toHaveProperty('attempted');
      expect(parsed).toHaveProperty('succeeded');
      expect(parsed).toHaveProperty('stats');
      expect(parsed.succeeded).toHaveLength(1);
    });

    it('should output CSV format', async () => {
      // GIVEN: A script with output format: 'csv'
      // WHEN: Executing the pipeline
      // THEN: Outputs CSV with header row and one row per file
      class CsvScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: ['a.md', 'b.md'] },
            operations: [{ type: 'move', destination: 'archive' }],
            output: { format: 'csv' },
          };
        }
      }

      const script = new CsvScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'csv.mmt.ts',
        cliOptions: {},
      });

      await scriptRunner.executePipeline(pipeline, { executeNow: false });

      const csvOutput = output.join('');
      const lines = csvOutput.trim().split('\n');
      
      expect(lines[0]).toBe('"path","operation","status"');
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[1]).toContain('"a.md"');
      expect(lines[2]).toContain('"b.md"');
    });
  });
});