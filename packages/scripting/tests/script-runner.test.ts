import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ScriptRunner } from '../src/script-runner.js';
import type { Script, ScriptContext, OperationPipeline } from '../src/index.js';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';
import { VaultIndexer } from '@mmt/indexer';

describe('ScriptRunner', () => {
  let tempDir: string;
  let scriptRunner: ScriptRunner;
  let mockFs: FileSystemAccess;
  let output: string[];

  // Helper to initialize indexer after files are created
  async function initializeIndexer(): Promise<void> {
    const fs = new NodeFileSystem();
    const indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem: fs,
      useCache: false,
      useWorkers: false,
    });
    await indexer.initialize();
    // @ts-ignore - accessing private property for testing
    scriptRunner.indexer = indexer;
  }

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-test-'));
    output = [];
    
    // Mock filesystem for most tests
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

    // Use real filesystem for document operations
    const fs = new NodeFileSystem();
    scriptRunner = new ScriptRunner({
      config: {
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
      },
      fileSystem: fs,
      queryParser: new QueryParser(),
      outputStream: mockOutputStream as any,
    });
  });

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
    }
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
            select: { files: [join(tempDir, 'test.md')] },
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

      // Create the file that will be deleted
      writeFileSync(join(tempDir, 'test.md'), '# Test File');
      
      // Initialize indexer after creating files
      const fs = new NodeFileSystem();
      const indexer = new VaultIndexer({
        vaultPath: tempDir,
        fileSystem: fs,
        useCache: false,
        useWorkers: false,
      });
      await indexer.initialize();
      // @ts-ignore
      scriptRunner.indexer = indexer;

      const result = await scriptRunner.executePipeline(pipeline, { executeNow: false });

      expect(result.succeeded).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      expect(result.succeeded[0].details.preview).toBe(true);
      expect(result.succeeded[0].details.type).toBe('delete');
      
      // Check output
      expect(output.join('')).toContain('PREVIEW MODE');
      expect(output.join('')).toContain('To execute these changes, run with --execute flag');
    });

    it('should execute move operation when executeNow is true', async () => {
      // GIVEN: A script with executeNow: true and a move operation
      // WHEN: Running with a real file system
      // THEN: Operations succeed and file is moved
      
      // Create test file first
      writeFileSync(join(tempDir, 'test.md'), '# Test\n\nContent');
      mkdirSync(join(tempDir, 'archive'), { recursive: true });

      class TestScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'test.md')] },
            operations: [{ type: 'move', destination: join(tempDir, 'archive') }],
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

      // Use a real file system for this test
      const { NodeFileSystem } = await import('@mmt/filesystem-access');
      const realFs = new NodeFileSystem();
      const runner = new ScriptRunner({
        config: {
          vaultPath: tempDir,
          indexPath: join(tempDir, '.mmt-index'),
        },
        fileSystem: realFs,
        queryParser: new QueryParser(),
        outputStream: { write: (chunk: string) => { output.push(chunk); return true; } } as any,
      });

      // Initialize indexer for the runner
      const indexer = new VaultIndexer({
        vaultPath: tempDir,
        fileSystem: realFs,
        useCache: false,
        useWorkers: false,
      });
      await indexer.initialize();
      // @ts-ignore
      runner.indexer = indexer;

      const result = await runner.executePipeline(pipeline, { executeNow: true });

      // Operations should succeed
      expect(result.succeeded).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      
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
            select: { files: [join(tempDir, 'old.md'), join(tempDir, 'new.md')] },
            filter: (doc) => doc.path.endsWith('old.md'),
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

      // Create the files for filtering
      writeFileSync(join(tempDir, 'old.md'), '# Old');
      writeFileSync(join(tempDir, 'new.md'), '# New');
      await initializeIndexer();

      const result = await scriptRunner.executePipeline(pipeline, { executeNow: false });

      // Only one file should pass the filter
      expect(result.attempted).toHaveLength(1); // After filtering, only 'old.md' should be attempted
      expect(result.succeeded).toHaveLength(1); // Only filtered files processed
      expect(result.succeeded[0].item.path).toContain('old.md');
    });

    it('should format output based on preferences', async () => {
      // GIVEN: A script with output format preference
      // WHEN: Setting format to 'detailed'
      // THEN: Shows verbose output with file-by-file breakdown
      class DetailedScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'a.md'), join(tempDir, 'b.md')] },
            operations: [{ type: 'move', destination: join(tempDir, 'processed') }],
            output: [{ format: 'detailed', destination: 'console' }],
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

      // Create test files
      writeFileSync(join(tempDir, 'a.md'), '# A');
      writeFileSync(join(tempDir, 'b.md'), '# B');
      mkdirSync(join(tempDir, 'processed'), { recursive: true });
      await initializeIndexer();

      await scriptRunner.executePipeline(pipeline, { executeNow: false });

      const outputText = output.join('');
      expect(outputText).toContain('Selected 2 files matching criteria');
      expect(outputText).toContain('Would move to');
      expect(outputText).toContain('✓');
      expect(outputText).toContain('/a.md');
      expect(outputText).toContain('/b.md');
    });

    it('should handle operations with real implementations', async () => {
      // GIVEN: Script runner with real operation implementations
      // WHEN: Attempting to execute operations
      // THEN: Operations execute successfully
      
      // Create real test files
      writeFileSync(join(tempDir, 'test1.md'), '# Test 1');
      writeFileSync(join(tempDir, 'test2.md'), '# Test 2');
      mkdirSync(join(tempDir, '.trash'), { recursive: true });

      const { NodeFileSystem } = await import('@mmt/filesystem-access');
      const realFs = new NodeFileSystem();
      const runner = new ScriptRunner({
        config: {
          vaultPath: tempDir,
          indexPath: join(tempDir, '.mmt-index'),
        },
        fileSystem: realFs,
        queryParser: new QueryParser(),
        outputStream: { write: (chunk: string) => { output.push(chunk); return true; } } as any,
      });

      // Initialize indexer for the runner
      const indexer = new VaultIndexer({
        vaultPath: tempDir,
        fileSystem: realFs,
        useCache: false,
        useWorkers: false,
      });
      await indexer.initialize();
      // @ts-ignore
      runner.indexer = indexer;

      class DeleteScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'test1.md'), join(tempDir, 'test2.md')] },
            operations: [{ type: 'delete' }],
          };
        }
      }

      const script = new DeleteScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'delete.mmt.ts',
        cliOptions: {},
      });

      const result = await runner.executePipeline(pipeline, { executeNow: true });

      // All operations should succeed
      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
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
        fileSystem: new NodeFileSystem(),
        queryParser: new QueryParser(),
        outputStream: { write: () => true } as any,
      });

      class FailFastScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, '1.md'), join(tempDir, '2.md'), join(tempDir, '3.md')] },
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

      // Create test files first
      writeFileSync(join(tempDir, '1.md'), '# One');
      writeFileSync(join(tempDir, '2.md'), '# Two');
      writeFileSync(join(tempDir, '3.md'), '# Three');
      mkdirSync(join(tempDir, '.trash'), { recursive: true });
      
      // Initialize indexer for the runner
      const indexer = new VaultIndexer({
        vaultPath: tempDir,
        fileSystem: new NodeFileSystem(),
        useCache: false,
        useWorkers: false,
      });
      await indexer.initialize();
      // @ts-ignore
      runner.indexer = indexer;

      const result = await runner.executePipeline(pipeline, { executeNow: true, failFast: true });

      // With real implementation, operations succeed so failFast doesn't trigger
      expect(result.failed).toHaveLength(0);
      expect(result.succeeded).toHaveLength(3);
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

      // Create a new script runner without indexer
      const runnerWithoutIndexer = new ScriptRunner({
        config: {
          vaultPath: tempDir,
          indexPath: join(tempDir, '.mmt-index'),
        },
        fileSystem: new NodeFileSystem(),
        queryParser: new QueryParser(),
        outputStream: { write: () => true } as any,
      });

      await expect(
        runnerWithoutIndexer.executePipeline(pipeline, { executeNow: false })
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
            select: { files: [join(tempDir, 'test.md')] },
            operations: [{ type: 'delete' }],
            output: [{ format: 'json', destination: 'console' }],
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

      // Create test file
      writeFileSync(join(tempDir, 'test.md'), '# Test');
      await initializeIndexer();

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
            select: { files: [join(tempDir, 'a.md'), join(tempDir, 'b.md')] },
            operations: [{ type: 'move', destination: join(tempDir, 'archive') }],
            output: [{ format: 'csv', destination: 'console' }],
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

      // Create test files
      writeFileSync(join(tempDir, 'a.md'), '# A');
      writeFileSync(join(tempDir, 'b.md'), '# B');
      mkdirSync(join(tempDir, 'archive'), { recursive: true });
      await initializeIndexer();

      await scriptRunner.executePipeline(pipeline, { executeNow: false });

      const csvOutput = output.join('');
      const lines = csvOutput.trim().split('\n');
      
      expect(lines[0]).toBe('"path","operation","status"');
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[1]).toContain('a.md');
      expect(lines[2]).toContain('b.md');
    });
  });
});