import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Config } from '@mmt/config';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { createContext } from '../src/api/context.js';
import { appRouter } from '../src/api/router.js';

describe('API Integration Tests', () => {
  let tempDir: string;
  let vaultPath: string;
  let config: Config;
  let context: any;

  beforeEach(async () => {
    // Create temp directory for test vault
    tempDir = await mkdtemp(join(tmpdir(), 'mmt-api-test-'));
    vaultPath = join(tempDir, 'vault');
    await mkdir(vaultPath, { recursive: true });

    // Create test markdown files
    await writeFile(join(vaultPath, 'test1.md'), `---
title: Test Document 1
tags: [test, document]
---

# Test Document 1

This is a test document with some content.`);

    await writeFile(join(vaultPath, 'test2.md'), `---
title: Test Document 2
category: testing
---

# Test Document 2

Another test document with different content.`);

    // Create config
    config = {
      vaultPath,
      indexPath: join(tempDir, 'index'),
    };

    // Create context
    context = await createContext(config);
  });

  afterEach(async () => {
    // Stop indexer
    if (context?.indexer?.stop) {
      await context.indexer.stop();
    }
    
    // Cleanup temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('Query Router', () => {
    it('executes query and returns documents', async () => {
      // GIVEN: A vault with test documents
      // WHEN: Executing a query through the router
      const caller = appRouter.createCaller(context);
      const result = await caller.query.search({
        'content:text': 'content'
      });

      // THEN: Returns matching documents
      expect(result).toBeDefined();
      expect(result.documents).toBeInstanceOf(Array);
      expect(result.documents.length).toBeGreaterThan(0);
      expect(result.metadata.totalCount).toBe(result.documents.length);
      expect(result.metadata.executionTime).toBeGreaterThan(0);
    });

    it('validates Zod schemas', async () => {
      // GIVEN: An invalid query input
      // WHEN: Calling with invalid input
      const caller = appRouter.createCaller(context);
      
      // THEN: Should throw validation error
      await expect(caller.query.search({
        invalidField: 'test'
      } as any)).rejects.toThrow();
    });

    it('handles empty results', async () => {
      // GIVEN: A query that matches no documents
      // WHEN: Executing the query
      const caller = appRouter.createCaller(context);
      const result = await caller.query.search({
        'content:text': 'nonexistentcontent12345'
      });

      // THEN: Returns empty result set
      expect(result.documents).toHaveLength(0);
      expect(result.metadata.totalCount).toBe(0);
    });
  });

  describe('Operations Router', () => {
    it('moves files through API', async () => {
      // GIVEN: A source file
      const sourcePath = join(vaultPath, 'test1.md');
      const targetPath = join(vaultPath, 'subfolder', 'moved.md');
      await mkdir(join(vaultPath, 'subfolder'), { recursive: true });

      // WHEN: Moving the file
      const caller = appRouter.createCaller(context);
      const result = await caller.operations.move({
        sourcePath,
        targetPath,
        updateLinks: true,
        dryRun: false,
      });

      // THEN: File is moved successfully
      expect(result.success).toBe(true);
      expect(result.document).toBeDefined();
      expect(result.document?.path).toBe(targetPath);

      // Verify file exists at new location
      const fs = new NodeFileSystem();
      expect(await fs.exists(targetPath)).toBe(true);
      expect(await fs.exists(sourcePath)).toBe(false);
    });

    it('validates operations before execution', async () => {
      // GIVEN: An invalid operation
      const caller = appRouter.createCaller(context);

      // WHEN: Validating the operation
      const result = await caller.operations.validate({
        type: 'move',
        sourcePath: join(vaultPath, 'nonexistent.md'),
        targetPath: join(vaultPath, 'target.md'),
      });

      // THEN: Returns validation failure
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });

    it('handles operation errors gracefully', async () => {
      // GIVEN: An operation that will fail
      const caller = appRouter.createCaller(context);

      // WHEN: Attempting to move non-existent file
      // THEN: Should throw appropriate error
      await expect(caller.operations.move({
        sourcePath: join(vaultPath, 'nonexistent.md'),
        targetPath: join(vaultPath, 'target.md'),
      })).rejects.toThrow('File not found');
    });
  });

  describe('Indexer Router', () => {
    it('returns indexer status', async () => {
      // GIVEN: An initialized indexer
      // WHEN: Getting status
      const caller = appRouter.createCaller(context);
      const status = await caller.indexer.status();

      // THEN: Returns valid status
      expect(status).toBeDefined();
      expect(status.isInitialized).toBe(true);
      expect(status.documentCount).toBeGreaterThanOrEqual(2);
      expect(status.lastIndexTime).toBeDefined();
    });

    it('can reindex vault', async () => {
      // GIVEN: A vault with documents
      // WHEN: Triggering reindex
      const caller = appRouter.createCaller(context);
      await caller.indexer.reindex();

      // THEN: Indexer status shows updated index
      const status = await caller.indexer.status();
      expect(status.documentCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Performance', () => {
    it('meets performance requirements', async () => {
      // GIVEN: A simple query
      const caller = appRouter.createCaller(context);
      
      // WHEN: Executing multiple queries
      const startTime = Date.now();
      const promises = Array(10).fill(null).map(() => 
        caller.query.search({ 'content:text': 'test' })
      );
      await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      // THEN: Average time per query is < 50ms
      const avgTime = totalTime / 10;
      expect(avgTime).toBeLessThan(50);
    });
  });
});