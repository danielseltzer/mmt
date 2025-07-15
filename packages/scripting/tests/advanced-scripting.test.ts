import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdvancedScriptRunner } from '../src/advanced-script-runner.js';
import { mmt, operations } from '../src/advanced-builder.js';
import { VaultIndexer } from '@mmt/indexer';
import { NodeFileSystem } from '@mmt/filesystem-access';
import type { FileSystemAccess } from '@mmt/filesystem-access';
import type { Document, AdvancedOperationPipeline } from '@mmt/entities';
import type { PageMetadata } from '@mmt/indexer';
import { mkdtemp, rm, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Advanced Scripting Features', () => {
  let tempDir: string;
  let vaultPath: string;
  let indexPath: string;
  let indexer: VaultIndexer;
  let runner: AdvancedScriptRunner;
  let fs: FileSystemAccess;

  beforeEach(async () => {
    // Create temp directories
    tempDir = await mkdtemp(join(tmpdir(), 'mmt-advanced-test-'));
    vaultPath = join(tempDir, 'vault');
    indexPath = join(tempDir, '.index');
    
    await mkdir(vaultPath, { recursive: true });
    await mkdir(indexPath, { recursive: true });
    
    // Initialize filesystem and indexer
    fs = new NodeFileSystem();
    indexer = new VaultIndexer({
      vaultPath,
      fileSystem: fs,
      useCache: true,
      useWorkers: false,
    });
    
    // Create test documents
    await writeFile(join(vaultPath, 'doc1.md'), '---\nstatus: draft\nsize: 100\n---\n# Doc 1');
    await writeFile(join(vaultPath, 'doc2.md'), '---\nstatus: published\nsize: 500\n---\n# Doc 2');
    await writeFile(join(vaultPath, 'doc3.md'), '---\nstatus: draft\nsize: 1500\n---\n# Doc 3');
    await writeFile(join(vaultPath, 'doc4.md'), '---\nstatus: published\nsize: 2000\n---\n# Doc 4');
    
    // Index documents
    await indexer.initialize();
    
    // Create runner
    runner = new AdvancedScriptRunner({
      vaultPath,
      indexPath,
      scriptPath: __filename,
      cliOptions: {},
      indexer,
    });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Conditional Operations', () => {
    it('should execute then branch when condition is true', async () => {
      const pipeline: AdvancedOperationPipeline = {
        select: { 'metadata.frontmatter.status': 'draft' },
        operations: [{
          type: 'conditional',
          condition: (doc: PageMetadata) => (doc.frontmatter?.size as number) > 1000,
          then: {
            type: 'updateFrontmatter',
            updates: { category: 'large-draft' },
            mode: 'merge',
          },
          else: {
            type: 'updateFrontmatter',
            updates: { category: 'small-draft' },
            mode: 'merge',
          },
        }],
      };
      
      const documents = indexer.query({ conditions: [{ field: 'fm:status', operator: 'equals', value: 'draft' }] });
      const result = await runner.executeAdvancedPipeline(pipeline, documents);
      
      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      
      // Check categories were set correctly
      const doc1Result = result.succeeded.find(r => r.item.path.includes('doc1'));
      const doc3Result = result.succeeded.find(r => r.item.path.includes('doc3'));
      
      expect(doc1Result?.details).toMatchObject({ updates: { category: 'small-draft' } });
      expect(doc3Result?.details).toMatchObject({ updates: { category: 'large-draft' } });
    });
  });

  describe('Try-Catch Operations', () => {
    it('should execute catch when try fails', async () => {
      const pipeline: AdvancedOperationPipeline = {
        select: { 'metadata.frontmatter.status': 'draft' },
        operations: [{
          type: 'try-catch',
          try: {
            type: 'move',
            targetPath: '/invalid/path/that/does/not/exist',
          } as any,
          catch: {
            type: 'updateFrontmatter',
            updates: { error: 'move-failed' },
            mode: 'merge',
          },
        }],
      };
      
      const documents = indexer.query({ conditions: [{ field: 'fm:status', operator: 'equals', value: 'draft' }] });
      const result = await runner.executeAdvancedPipeline(pipeline, documents);
      
      // All operations should succeed (catch handled the error)
      expect(result.succeeded).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      
      // Check error was recorded
      result.succeeded.forEach(r => {
        expect(r.details).toMatchObject({ updates: { error: 'move-failed' } });
      });
    });
  });

  describe('Parallel Execution', () => {
    it('should process documents in parallel with concurrency limit', async () => {
      const processedDocs: string[] = [];
      let maxConcurrent = 0;
      let currentConcurrent = 0;
      
      const pipeline: AdvancedOperationPipeline = {
        select: {},
        operations: [{
          type: 'map',
          transform: async (doc: PageMetadata) => {
            currentConcurrent++;
            maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
            
            // Simulate async work
            await new Promise(resolve => setTimeout(resolve, 50));
            
            processedDocs.push(doc.basename);
            currentConcurrent--;
            
            return { processed: true };
          },
        }],
        options: {
          parallel: {
            maxConcurrency: 2,
          },
        },
      };
      
      const documents = indexer.getAllDocuments();
      await runner.executeParallelOperations(
        pipeline.operations,
        documents,
        pipeline.options?.parallel
      );
      
      expect(processedDocs).toHaveLength(4);
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });
  });

  describe('Map Operations', () => {
    it('should transform documents and store results', async () => {
      const pipeline: AdvancedOperationPipeline = {
        select: {},
        operations: [{
          type: 'map',
          transform: (doc: PageMetadata) => {
            const size = (doc.frontmatter?.size as number) || 0;
            return size > 1000 ? 'large' : 'small';
          },
          outputField: 'sizeCategory',
        }],
      };
      
      const documents = indexer.getAllDocuments();
      const result = await runner.executeAdvancedPipeline(pipeline, documents);
      
      expect(result.succeeded).toHaveLength(4);
      
      // Check size categories
      const categories = result.succeeded.map(r => ({
        name: r.item.metadata.name,
        category: r.details?.transformResult,
      }));
      
      expect(categories).toContainEqual({ name: 'doc1', category: 'small' });
      expect(categories).toContainEqual({ name: 'doc2', category: 'small' });
      expect(categories).toContainEqual({ name: 'doc3', category: 'large' });
      expect(categories).toContainEqual({ name: 'doc4', category: 'large' });
    });
  });

  describe('Reduce Operations', () => {
    it('should aggregate documents into a single value', async () => {
      const reducer = {
        type: 'reduce',
        reducer: (acc: number, doc: PageMetadata) => {
          return acc + ((doc.frontmatter?.size as number) || 0);
        },
        initialValue: 0,
        outputKey: 'totalSize',
      };
      
      const documents = indexer.getAllDocuments();
      const result = await runner.executeReduce(reducer, documents);
      
      expect(result).toBe(4100); // 100 + 500 + 1500 + 2000
    });
  });

  describe('Fluent API Builder', () => {
    it('should build pipeline using fluent API', async () => {
      const pipeline = mmt(indexer)
        .query('metadata.frontmatter.status:draft')
        .parallel(2)
        .forEach(async (doc) => {
          return operations()
            .updateMetadata({ processed: true })
            .build();
        })
        .conditional(
          doc => doc.metadata.frontmatter?.size > 1000,
          operations().moveToFolder('large-files').build()[0]
        )
        .build();
      
      expect(pipeline.select).toBeDefined();
      expect(pipeline.operations).toHaveLength(2);
      expect(pipeline.operations[0].type).toBe('forEach');
      expect(pipeline.operations[1].type).toBe('conditional');
      expect(pipeline.options?.parallel?.maxConcurrency).toBe(2);
    });

    it('should support complex pipeline example from issue', () => {
      const pipeline = mmt(indexer)
        .query('tag:process')
        .parallel(5)
        .forEach(async (doc) => {
          return mmt()
            .try(
              operations().updateMetadata({ processed: true }).build()[0],
              operations().addTag('process-failed').build()[0]
            )
            .conditional(
              doc.metadata.size > 1000000,
              operations().moveToFolder('large-files').build()[0]
            )
            .build()
            .operations;
        })
        .build();
      
      expect(pipeline.operations).toHaveLength(1);
      expect(pipeline.operations[0].type).toBe('forEach');
      expect(pipeline.options?.parallel?.maxConcurrency).toBe(5);
    });
  });
});
