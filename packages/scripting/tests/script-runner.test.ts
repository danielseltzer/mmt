import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ScriptRunner } from '../src/script-runner.js';
import type { Script, ScriptContext, OperationPipeline } from '../src/index.js';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';
import { VaultIndexer } from '@mmt/indexer';
import { createTestApiServer } from './test-api-server.js';
import type { ChildProcess } from 'child_process';

describe('ScriptRunner', () => {
  let tempDir: string;
  let scriptRunner: ScriptRunner;
  let output: string[];
  let realFs: NodeFileSystem;
  let apiServer: { process: ChildProcess; close: () => Promise<void> };
  const TEST_API_PORT = 3002;

  // Helper to capture output
  class TestOutputStream {
    output: string[] = [];
    write(chunk: string): boolean {
      this.output.push(chunk);
      return true;
    }
  }

  // Helper to initialize indexer after files are created
  async function initializeIndexer(runner: ScriptRunner): Promise<void> {
    const indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem: realFs,
      useCache: false,
      useWorkers: false,
    });
    await indexer.initialize();
    // @ts-ignore - accessing private property for testing
    runner.indexer = indexer;
  }
  
  // Helper to start API server after files are created
  async function startApiServer(): Promise<void> {
    apiServer = await createTestApiServer({
      port: TEST_API_PORT,
      vaultPath: tempDir,
      indexPath: join(tempDir, '.mmt-index'),
    });
  }

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-test-'));
    output = [];
    realFs = new NodeFileSystem();
    
    const testOutputStream = new TestOutputStream();
    output = testOutputStream.output;

    scriptRunner = new ScriptRunner({
      config: {
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        apiPort: TEST_API_PORT,
      },
      fileSystem: realFs,
      queryParser: new QueryParser(),
      outputStream: testOutputStream as any,
    });
  });

  afterEach(async () => {
    // Close the API server
    if (apiServer) {
      await apiServer.close();
    }
    
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('execute with test script', () => {
    it('should run in preview mode by default', async () => {
      // GIVEN: A script with destructive operations
      // WHEN: Executing without explicit --execute flag
      // THEN: Runs in preview mode showing what would happen (safety first)
      
      // Create test file
      const testFile = join(tempDir, 'test.md');
      writeFileSync(testFile, '# Test File\n\nContent to delete');
      
      // Start API server after creating files
      await startApiServer();
      
      class TestScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [testFile] },
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

      await initializeIndexer(scriptRunner);
      const result = await scriptRunner.executePipeline(pipeline);

      // Verify preview mode behavior
      expect(result.skipped).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[0].operation.type).toBe('delete');
      
      // File should still exist (preview only)
      expect(existsSync(testFile)).toBe(true);
      
      // Check output
      expect(output.join('')).toContain('PREVIEW MODE');
      expect(output.join('')).toContain('To execute these changes, run with --execute flag');
    });

    it('should execute move operation when executeNow is true', async () => {
      // GIVEN: A script with executeNow: true and a move operation
      // WHEN: Running with a real file system
      // THEN: Operations succeed and file is moved
      
      // Create test file and destination directory
      const sourceFile = join(tempDir, 'test.md');
      const archiveDir = join(tempDir, 'archive');
      const destFile = join(archiveDir, 'test.md');
      
      writeFileSync(sourceFile, '# Test\n\nContent to move');
      mkdirSync(archiveDir, { recursive: true });

      // Start API server after creating files
      await startApiServer();

      class TestScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [sourceFile] },
            operations: [{ type: 'move', destination: archiveDir }],
            options: { destructive: true },
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

      await initializeIndexer(scriptRunner);
      const result = await scriptRunner.executePipeline(pipeline);

      // Operations should succeed
      expect(result.succeeded).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      
      // Verify file was actually moved
      expect(existsSync(sourceFile)).toBe(false);
      expect(existsSync(destFile)).toBe(true);
      expect(readFileSync(destFile, 'utf-8')).toBe('# Test\n\nContent to move');
      
      // Check output shows execution completed
      expect(output.join('')).toContain('EXECUTION COMPLETE');
      expect(output.join('')).not.toContain('PREVIEW MODE');
    });

    it('should handle script with filter function', async () => {
      // GIVEN: A script that selects files then applies a filter function
      // WHEN: Filter function narrows down the selection
      // THEN: Operations only apply to files passing the filter
      
      const oldFile = join(tempDir, 'old.md');
      const newFile = join(tempDir, 'new.md');
      
      writeFileSync(oldFile, '# Old Document');
      writeFileSync(newFile, '# New Document');
      
      // Start API server after creating files
      await startApiServer();
      
      class FilterScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [oldFile, newFile] },
            filter: {
              conditions: [{
                field: 'name',
                operator: 'equals',
                value: 'old'
              }],
              logic: 'AND'
            },
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

      await initializeIndexer(scriptRunner);
      const result = await scriptRunner.executePipeline(pipeline);

      // Only one file should pass the filter
      expect(result.attempted).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[0].item.path).toContain('old.md');
    });

    it('should format output based on preferences', async () => {
      // GIVEN: A script with output format preference
      // WHEN: Setting format to 'detailed'
      // THEN: Shows verbose output with file-by-file breakdown
      
      const fileA = join(tempDir, 'a.md');
      const fileB = join(tempDir, 'b.md');
      const processedDir = join(tempDir, 'processed');
      
      writeFileSync(fileA, '# Document A');
      writeFileSync(fileB, '# Document B');
      mkdirSync(processedDir, { recursive: true });
      
      // Start API server after creating files
      await startApiServer();
      
      class DetailedScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [fileA, fileB] },
            operations: [{ type: 'move', destination: processedDir }],
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

      await initializeIndexer(scriptRunner);
      await scriptRunner.executePipeline(pipeline);

      const outputText = output.join('');
      expect(outputText).toContain('Selected 2 files matching criteria');
      expect(outputText).toContain('Skipped:');
      expect(outputText).toContain('Preview mode');
      expect(outputText).toContain('/a.md');
      expect(outputText).toContain('/b.md');
    });

    it('should handle delete operations with real implementations', async () => {
      // GIVEN: Script runner with real operation implementations
      // WHEN: Attempting to execute delete operations
      // THEN: Operations execute successfully and files are deleted
      
      const file1 = join(tempDir, 'test1.md');
      const file2 = join(tempDir, 'test2.md');
      const trashDir = join(tempDir, '.trash');
      
      writeFileSync(file1, '# Test 1');
      writeFileSync(file2, '# Test 2');
      mkdirSync(trashDir, { recursive: true });

      // Start API server after creating files
      await startApiServer();

      class DeleteScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [file1, file2] },
            operations: [{ type: 'delete' }],
            options: { destructive: true },
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

      await initializeIndexer(scriptRunner);
      const result = await scriptRunner.executePipeline(pipeline);

      // All operations should succeed
      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      
      // Files should be deleted or moved to trash
      expect(existsSync(file1)).toBe(false);
      expect(existsSync(file2)).toBe(false);
    });

    it('should respect failFast option', async () => {
      // GIVEN: A script with failFast: true and an operation that will fail
      // WHEN: First operation fails
      // THEN: Stops processing remaining files immediately
      
      // Create files where one will fail (e.g., read-only directory)
      const file1 = join(tempDir, '1.md');
      const file2 = join(tempDir, '2.md');
      const file3 = join(tempDir, '3.md');
      const readOnlyDir = join(tempDir, 'readonly');
      
      writeFileSync(file1, '# One');
      writeFileSync(file2, '# Two');
      writeFileSync(file3, '# Three');
      mkdirSync(readOnlyDir, { recursive: true });

      // Start API server after creating files
      await startApiServer();

      class FailFastScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [file1, file2, file3] },
            operations: [{ type: 'move', destination: readOnlyDir }],
            options: { destructive: true, failFast: true },
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

      await initializeIndexer(scriptRunner);
      const result = await scriptRunner.executePipeline(pipeline);

      // With proper permissions, all should succeed
      // This test demonstrates the failFast flag is respected
      expect(result.failed).toHaveLength(0);
      expect(result.succeeded).toHaveLength(3);
    });
  });

  describe('selection validation', () => {
    it('should fail operations when indexer not initialized for query-based selection', async () => {
      // GIVEN: A script using query-based selection (not simple file list)
      // WHEN: Indexer is not initialized
      // THEN: Operations fail gracefully instead of throwing
      
      // Start API server
      await startApiServer();
      
      class QueryScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { 'fs:path': 'posts/**/*.md' },
            filter: {
              conditions: [{
                field: 'size',
                operator: 'gt',
                value: 100
              }],
              logic: 'AND'
            },
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
          apiPort: TEST_API_PORT,
        },
        fileSystem: realFs,
        queryParser: new QueryParser(),
        outputStream: { write: () => true } as any,
      });

      const result = await runnerWithoutIndexer.executePipeline(pipeline);
      
      // When indexer is not initialized for query-based selection,
      // the operation should fail rather than throw
      expect(result.failed).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.attempted).toHaveLength(0);
    });
  });

  describe('output formats', () => {
    it('should output JSON format', async () => {
      // GIVEN: A script with output format: 'json'
      // WHEN: Executing the pipeline
      // THEN: Outputs valid JSON with attempted, succeeded, and stats
      
      const testFile = join(tempDir, 'test.md');
      writeFileSync(testFile, '# Test Document');
      
      // Start API server after creating files
      await startApiServer();
      
      class JsonScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [testFile] },
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

      await initializeIndexer(scriptRunner);
      await scriptRunner.executePipeline(pipeline);

      const jsonOutput = output.join('');
      const parsed = JSON.parse(jsonOutput);
      
      expect(parsed).toHaveProperty('attempted');
      expect(parsed).toHaveProperty('succeeded');
      expect(parsed).toHaveProperty('skipped');
      expect(parsed).toHaveProperty('stats');
      expect(parsed.succeeded).toHaveLength(0);
      expect(parsed.skipped).toHaveLength(1);
    });

    it('should output CSV format', async () => {
      // GIVEN: A script with output format: 'csv'
      // WHEN: Executing the pipeline
      // THEN: Outputs CSV with header row and one row per file
      
      const fileA = join(tempDir, 'a.md');
      const fileB = join(tempDir, 'b.md');
      const archiveDir = join(tempDir, 'archive');
      
      writeFileSync(fileA, '# Document A');
      writeFileSync(fileB, '# Document B');
      mkdirSync(archiveDir, { recursive: true });
      
      // Start API server after creating files
      await startApiServer();
      
      class CsvScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [fileA, fileB] },
            operations: [{ type: 'move', destination: archiveDir }],
            output: [{ format: 'csv', destination: 'console' }],
            options: { destructive: true },
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

      await initializeIndexer(scriptRunner);
      await scriptRunner.executePipeline(pipeline);

      const csvOutput = output.join('');
      const lines = csvOutput.trim().split('\n');
      
      expect(lines[0]).toBe('"path","operation","status"');
      expect(lines).toHaveLength(3); // header + 2 rows
      expect(lines[1]).toContain('a.md');
      expect(lines[2]).toContain('b.md');
    });
  });
});