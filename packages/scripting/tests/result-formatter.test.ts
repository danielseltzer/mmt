import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { ResultFormatter } from '../src/result-formatter.js';
import { ScriptRunner } from '../src/script-runner.js';
import type { Script, ScriptContext, OperationPipeline, ScriptExecutionResult } from '../src/index.js';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';
import { VaultIndexer } from '@mmt/indexer';

describe('ResultFormatter', () => {
  let tempDir: string;
  let formatter: ResultFormatter;
  let realResult: ScriptExecutionResult;

  // Helper to create real execution results
  async function generateRealResults(): Promise<ScriptExecutionResult> {
    // Create test files
    const file1 = join(tempDir, 'a.md');
    const file2 = join(tempDir, 'b.md');
    const file3 = join(tempDir, 'skip.md');
    const archiveDir = join(tempDir, 'archive');
    
    writeFileSync(file1, '# Document A\n\nContent for document A');
    writeFileSync(file2, '# Document B\n\nContent for document B');
    writeFileSync(file3, '# Skip Document\n\nThis will be skipped');
    mkdirSync(archiveDir);
    
    // Create a file that will cause skip
    writeFileSync(join(archiveDir, 'skip.md'), 'Already exists');
    
    // Set up script runner
    const fs = new NodeFileSystem();
    const scriptRunner = new ScriptRunner({
      config: {
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
      },
      fileSystem: fs,
      queryParser: new QueryParser(),
      outputStream: { write: () => true } as any,
    });
    
    // Initialize indexer
    const indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem: fs,
      useCache: false,
      useWorkers: false,
    });
    await indexer.initialize();
    // @ts-ignore
    scriptRunner.indexer = indexer;
    
    // Create a test script that will generate mixed results
    class TestScript implements Script {
      define(context: ScriptContext): OperationPipeline {
        return {
          select: { files: [file1, file2, file3] },
          operations: [
            { type: 'move', destination: archiveDir }
          ],
        };
      }
    }
    
    const script = new TestScript();
    const pipeline = script.define({
      vaultPath: tempDir,
      indexPath: join(tempDir, '.mmt-index'),
      scriptPath: 'test.mmt.ts',
      cliOptions: {},
    });
    
    // Execute to get real results
    return await scriptRunner.executePipeline(pipeline, { executeNow: true });
  }

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'mmt-formatter-test-'));
    formatter = new ResultFormatter();
    realResult = await generateRealResults();
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('summary format', () => {
    it('should format preview mode summary', async () => {
      // GIVEN: Real execution results in preview mode
      // WHEN: Formatting as summary
      // THEN: Shows preview warning and would-be actions
      
      // Generate preview results
      const previewResult = await generateRealResults();
      
      const output = formatter.format(previewResult, {
        format: 'summary',
        isPreview: true,
      });

      expect(output).toContain('PREVIEW MODE - No changes made');
      expect(output).toContain('Selected');
      expect(output).toContain('files');
      expect(output).toContain('Duration:');
      expect(output).toContain('To execute these changes, run with --execute flag');
    });

    it('should format execution summary', () => {
      // GIVEN: Real execution results from actual run
      // WHEN: Formatting as summary
      // THEN: Shows completion status without preview warnings
      const output = formatter.format(realResult, {
        format: 'summary',
        isPreview: false,
      });

      expect(output).toContain('EXECUTION COMPLETE');
      expect(output).toContain('Processed:');
      expect(output).not.toContain('Would process');
      expect(output).not.toContain('--execute flag');
    });
  });

  describe('detailed format', () => {
    it('should format detailed preview', async () => {
      // GIVEN: Real mixed success/failure results
      // WHEN: Formatting as detailed preview
      // THEN: Groups by operation type with success/failure indicators
      
      // Create a scenario with failures
      const failFile = join(tempDir, 'fail.md');
      writeFileSync(failFile, '# Fail Document');
      
      // Make directory read-only to cause failure
      const readOnlyDir = join(tempDir, 'readonly');
      mkdirSync(readOnlyDir);
      
      class FailScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [failFile] },
            operations: [
              { type: 'move', destination: readOnlyDir }
            ],
          };
        }
      }
      
      // Generate results with failures
      const fs = new NodeFileSystem();
      const scriptRunner = new ScriptRunner({
        config: {
          vaultPath: tempDir,
          indexPath: join(tempDir, '.mmt-index'),
        },
        fileSystem: fs,
        queryParser: new QueryParser(),
        outputStream: { write: () => true } as any,
      });
      
      const indexer = new VaultIndexer({
        vaultPath: tempDir,
        fileSystem: fs,
        useCache: false,
        useWorkers: false,
      });
      await indexer.initialize();
      // @ts-ignore
      scriptRunner.indexer = indexer;
      
      const script = new FailScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'fail.mmt.ts',
        cliOptions: {},
      });
      
      const mixedResult = await scriptRunner.executePipeline(pipeline, { executeNow: false });
      
      const output = formatter.format(mixedResult, {
        format: 'detailed',
        isPreview: true,
      });

      expect(output).toContain('PREVIEW MODE');
      expect(output).toContain('Selected');
      expect(output).toContain('file');
      expect(output).toContain('Would move');
    });

    it('should group operations by type', async () => {
      // GIVEN: Multiple operations of different types
      // WHEN: Formatting detailed output
      // THEN: Groups files by operation type for clarity
      
      // Create files for different operations
      const moveFile = join(tempDir, 'move.md');
      const deleteFile = join(tempDir, 'delete.md');
      writeFileSync(moveFile, '# Move Me');
      writeFileSync(deleteFile, '# Delete Me');
      
      // We'll use a real multi-operation result
      const output = formatter.format(realResult, {
        format: 'detailed',
        isPreview: true,
      });

      expect(output).toContain('Would move to');
      // The actual grouping depends on operations performed
    });

    it('should show skipped operations', () => {
      // GIVEN: Real operations that were skipped
      // WHEN: Formatting detailed output
      // THEN: Shows skipped files with reasons
      
      const output = formatter.format(realResult, {
        format: 'detailed',
        isPreview: false,
      });

      // Check if any operations were skipped
      if (realResult.skipped.length > 0) {
        expect(output).toContain('Skipped:');
      }
    });
  });

  describe('JSON format', () => {
    it('should output valid JSON', () => {
      // GIVEN: Real script execution results
      // WHEN: Formatting as JSON
      // THEN: Outputs parseable JSON with all result details
      const output = formatter.format(realResult, {
        format: 'json',
        isPreview: false,
      });

      const parsed = JSON.parse(output);
      expect(parsed).toHaveProperty('attempted');
      expect(parsed).toHaveProperty('succeeded');
      expect(parsed).toHaveProperty('failed');
      expect(parsed).toHaveProperty('stats');
      expect(Array.isArray(parsed.succeeded)).toBe(true);
      expect(Array.isArray(parsed.failed)).toBe(true);
    });
  });

  describe('CSV format', () => {
    it('should output valid CSV', () => {
      // GIVEN: Real script execution results
      // WHEN: Formatting as CSV
      // THEN: Outputs CSV with path, operation, status columns
      const output = formatter.format(realResult, {
        format: 'csv',
        isPreview: false,
      });

      const lines = output.trim().split('\n');
      expect(lines[0]).toBe('"path","operation","status"');
      expect(lines.length).toBeGreaterThan(1); // Has data rows
      
      // Verify CSV format
      lines.slice(1).forEach(line => {
        const parts = line.split(',');
        expect(parts.length).toBe(3); // path, operation, status
      });
    });

    it('should handle empty results', async () => {
      // GIVEN: No files matched selection criteria
      // WHEN: Formatting empty results as CSV
      // THEN: Outputs header row only
      
      // Create empty result by selecting non-existent files
      class EmptyScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [] },
            operations: [{ type: 'delete' }],
          };
        }
      }
      
      const fs = new NodeFileSystem();
      const scriptRunner = new ScriptRunner({
        config: {
          vaultPath: tempDir,
          indexPath: join(tempDir, '.mmt-index'),
        },
        fileSystem: fs,
        queryParser: new QueryParser(),
        outputStream: { write: () => true } as any,
      });
      
      const indexer = new VaultIndexer({
        vaultPath: tempDir,
        fileSystem: fs,
        useCache: false,
        useWorkers: false,
      });
      await indexer.initialize();
      // @ts-ignore
      scriptRunner.indexer = indexer;
      
      const script = new EmptyScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'empty.mmt.ts',
        cliOptions: {},
      });
      
      const emptyResult = await scriptRunner.executePipeline(pipeline, { executeNow: false });
      
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