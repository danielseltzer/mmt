import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { ScriptRunner } from '../src/script-runner.js';
import type { Script, OperationPipeline, ScriptContext } from '../src/index.js';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';
import { VaultIndexer } from '@mmt/indexer';
import { createTestApiServer } from './test-api-server.js';
import type { ChildProcess } from 'child_process';

describe('Document Operations Integration', () => {
  let tempDir: string;
  let scriptRunner: ScriptRunner;
  let output: string[];
  let outputStream: any;
  let apiServer: { process: ChildProcess; close: () => Promise<void> };
  const TEST_API_PORT = 3004;

  beforeEach(async () => {
    // Create temp directory structure
    tempDir = join(tmpdir(), `mmt-test-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    mkdirSync(join(tempDir, 'notes'), { recursive: true });
    mkdirSync(join(tempDir, 'archived'), { recursive: true });
    
    // Create test files
    writeFileSync(join(tempDir, 'notes', 'test1.md'), '# Test 1\n\nContent of test 1.');
    writeFileSync(join(tempDir, 'notes', 'test2.md'), '# Test 2\n\nContent with [[test1]] link.');
    writeFileSync(join(tempDir, 'notes', 'archive-me.md'), '---\ntags: [archive]\n---\n# Archive Me\n\nOld content.');

    // Setup script runner
    output = [];
    outputStream = {
      write: (chunk: string) => output.push(chunk),
    };

    const fs = new NodeFileSystem();
    scriptRunner = new ScriptRunner({
      config: {
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        apiPort: TEST_API_PORT,
      },
      fileSystem: fs,
      queryParser: new QueryParser(),
      outputStream,
    });

    // Initialize the indexer manually since we're calling executePipeline directly
    const indexer = new VaultIndexer({
      vaultPath: tempDir,
      fileSystem: fs,
      useCache: false,
      useWorkers: false,
    });
    
    // Initialize indexer to scan the vault
    await indexer.initialize();
    
    // Use the internal method to set indexer
    // @ts-ignore - using internal method for testing
    scriptRunner._setIndexer(indexer);
  });

  // Helper to start API server after files are created
  async function startApiServer(): Promise<void> {
    apiServer = await createTestApiServer({
      port: TEST_API_PORT,
      vaultPath: tempDir,
      indexPath: join(tempDir, '.mmt-index'),
    });
  }

  afterEach(async () => {
    // Close the API server
    if (apiServer) {
      await apiServer.close();
    }
    
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('move operation', () => {
    it('should preview moving files to a new directory', { timeout: 10000 }, async () => {
      // GIVEN: A script that moves files to archived folder
      // WHEN: Executing in preview mode (executeNow: false)
      // THEN: Shows preview of move operation without actually moving files
      class MoveScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'archive-me.md')] },
            operations: [{ type: 'move', destination: join(tempDir, 'archived') }],
          };
        }
      }

      // WHEN: Executing in preview mode
      const script = new MoveScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'move.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should show preview of move operation
      expect(result.skipped).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[0].operation.type).toBe('move');
      expect(result.skipped[0].item.path).toContain('archive-me.md');
    });

    it('should execute move operation when executeNow is true', { timeout: 10000 }, async () => {
      // GIVEN: A script that moves files
      // WHEN: Executing with executeNow: true
      // THEN: Actually moves the file and updates any links to it
      class MoveScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'archive-me.md')] },
            operations: [{ type: 'move', destination: join(tempDir, 'archived') }],
            options: { destructive: true },
          };
        }
      }

      // WHEN: Executing with executeNow
      const script = new MoveScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'move.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should actually move the file
      expect(result.succeeded).toHaveLength(1);
      expect(result.failed).toHaveLength(0);
      const fs = new NodeFileSystem();
      expect(await fs.exists(join(tempDir, 'notes', 'archive-me.md'))).toBe(false);
      expect(await fs.exists(join(tempDir, 'archived', 'archive-me.md'))).toBe(true);
    });
  });

  describe('rename operation', () => {
    it('should preview renaming a file', { timeout: 10000 }, async () => {
      // GIVEN: A script that renames a file
      // WHEN: Executing in preview mode
      // THEN: Shows preview of rename with new filename
      class RenameScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'test1.md')] },
            operations: [{ type: 'rename', newName: 'renamed-test' }],
          };
        }
      }

      // WHEN: Executing in preview mode
      const script = new RenameScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'rename.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should show preview of rename
      expect(result.skipped).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[0].operation.type).toBe('rename');
    });
  });

  describe('updateFrontmatter operation', () => {
    it('should preview updating frontmatter', { timeout: 10000 }, async () => {
      // GIVEN: A script that updates frontmatter
      // WHEN: Executing in preview mode
      // THEN: Shows preview of frontmatter changes without modifying file
      class UpdateScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'test1.md')] },
            operations: [{
              type: 'updateFrontmatter',
              updates: { status: 'reviewed', lastModified: '2024-06-24' }
            }],
          };
        }
      }

      // WHEN: Executing in preview mode
      const script = new UpdateScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'update.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should show preview of frontmatter changes
      expect(result.skipped).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[0].operation.type).toBe('updateFrontmatter');
    });
  });

  describe('delete operation', () => {
    it('should preview deleting a file', { timeout: 10000 }, async () => {
      // GIVEN: A script that deletes files
      // WHEN: Executing in preview mode
      // THEN: Shows preview of deletion (move to trash) without actually deleting
      class DeleteScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'archive-me.md')] },
            operations: [{ type: 'delete' }],
          };
        }
      }

      // WHEN: Executing in preview mode
      const script = new DeleteScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'delete.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should show preview of deletion (move to trash)
      expect(result.skipped).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[0].operation.type).toBe('delete');
    });

    it('should preview permanent deletion when specified', { timeout: 10000 }, async () => {
      // GIVEN: A script that permanently deletes files
      // WHEN: Executing with permanent: true flag
      // THEN: Shows preview of permanent deletion (no trash folder)
      class DeleteScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'archive-me.md')] },
            operations: [{ type: 'delete', permanent: true }],
          };
        }
      }

      // WHEN: Executing in preview mode
      const script = new DeleteScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'delete.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should show preview of permanent deletion
      expect(result.skipped).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[0].operation.type).toBe('delete');
    });
  });

  describe('multiple operations', () => {
    it('should handle multiple operations in sequence', { timeout: 10000 }, async () => {
      // GIVEN: A script with multiple operations (updateFrontmatter + move)
      // WHEN: Executing the pipeline
      // THEN: Previews both operations in sequence
      class MultiOpScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'archive-me.md')] },
            operations: [
              { type: 'updateFrontmatter', updates: { archived: true } },
              { type: 'move', destination: join(tempDir, 'archived') }
            ],
          };
        }
      }

      // WHEN: Executing in preview mode
      const script = new MultiOpScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'multi.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should preview both operations
      expect(result.skipped).toHaveLength(2);
      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
      expect(result.skipped[0].reason).toBe('Preview mode');
      expect(result.skipped[1].reason).toBe('Preview mode');
      expect(result.skipped[0].operation.type).toBe('updateFrontmatter');
      expect(result.skipped[1].operation.type).toBe('move');
    });
  });

  describe('error handling', () => {
    it('should skip operations with validation errors', { timeout: 10000 }, async () => {
      // GIVEN: A script with invalid operation parameters (empty destination)
      // WHEN: Executing the script
      // THEN: Skips the invalid operation with reason
      class InvalidScript implements Script {
        define(context: ScriptContext): OperationPipeline {
          return {
            select: { files: [join(tempDir, 'notes', 'test1.md')] },
            operations: [
              { type: 'move', destination: '' }, // Invalid: empty destination
            ],
            options: { destructive: true }, // Try to execute to trigger validation
          };
        }
      }

      // WHEN: Executing the script
      const script = new InvalidScript();
      const pipeline = script.define({
        vaultPath: tempDir,
        indexPath: join(tempDir, '.mmt-index'),
        scriptPath: 'invalid.mmt.ts',
        cliOptions: {},
      });

      // Start API server after files are created
      await startApiServer();
      
      const result = await scriptRunner.executePipeline(pipeline);

      // THEN: Should fail the invalid operation
      expect(result.failed).toHaveLength(1);
      expect(result.succeeded).toHaveLength(0);
      expect(result.skipped).toHaveLength(0);
    });
  });
});