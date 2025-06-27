import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserWindow, app } from 'electron';
import { createIPCHandler } from 'electron-trpc/main';
import type { AppRouter } from '../src/api/router.js';
import { appRouter } from '../src/api/router.js';
import { createContext } from '../src/api/context.js';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { VaultIndexer } from '@mmt/indexer';

describe('IPC Integration E2E', () => {
  let window: BrowserWindow;
  let tempDir: string;
  let cleanup: () => void;

  beforeEach(async () => {
    // Create temp directory for test vault
    tempDir = await mkdtemp(join(tmpdir(), 'mmt-ipc-test-'));
    
    // Create test files
    await writeFile(join(tempDir, 'test1.md'), '# Test 1\n\nContent');
    await writeFile(join(tempDir, 'test2.md'), '# Test 2\n\nMore content');

    // Initialize Electron (if not already initialized)
    if (!app.isReady()) {
      await app.whenReady();
    }

    // Create browser window for testing
    window = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, '../../electron-preload/dist/index.js'),
      },
    });

    // Set up IPC handler
    const context = await createContext({
      vaultPath: tempDir,
      indexPath: join(tempDir, '.mmt-index'),
    });

    cleanup = createIPCHandler({
      router: appRouter,
      context,
      windows: [window],
    });
  });

  afterEach(async () => {
    // Clean up
    if (cleanup) cleanup();
    if (window && !window.isDestroyed()) {
      window.close();
    }
    await rm(tempDir, { recursive: true, force: true });
  });

  it('executes query from renderer and returns DocSet', async () => {
    // GIVEN: A vault with test documents and an IPC handler
    // WHEN: Executing a query through IPC
    // THEN: Returns a DocumentSet with matching documents

    // Simulate renderer calling IPC
    const result = await window.webContents.executeJavaScript(`
      window.api.query.search({ 'content:text': 'content' })
    `);

    expect(result).toBeDefined();
    expect(result.documents).toHaveLength(2);
    expect(result.metadata.totalCount).toBe(2);
  });

  it('validates input with Zod schema - rejects invalid query', async () => {
    // GIVEN: An IPC handler with Zod validation
    // WHEN: Sending an invalid query (missing namespace)
    // THEN: Rejects with validation error

    const error = await window.webContents.executeJavaScript(`
      window.api.query.search({ 'invalid-key': 'value' })
        .catch(err => ({ error: err.message }))
    `);

    expect(error.error).toContain('validation');
  });

  it('propagates file not found error from main to renderer', async () => {
    // GIVEN: An IPC handler for file operations
    // WHEN: Attempting to move a non-existent file
    // THEN: Error is properly propagated with details

    const error = await window.webContents.executeJavaScript(`
      window.api.operations.move({
        sourcePath: '/non/existent/file.md',
        targetPath: '/somewhere/else.md'
      }).catch(err => ({ 
        error: err.message,
        code: err.code 
      }))
    `);

    expect(error.error).toContain('not found');
    expect(error.code).toBe('FILE_NOT_FOUND');
  });

  it('executes file move operation via IPC', async () => {
    // GIVEN: A file in the vault
    // WHEN: Moving it through IPC
    // THEN: File is successfully moved

    const result = await window.webContents.executeJavaScript(`
      window.api.operations.move({
        sourcePath: '${join(tempDir, 'test1.md')}',
        targetPath: '${join(tempDir, 'moved.md')}'
      })
    `);

    expect(result.success).toBe(true);
    expect(result.document.path).toContain('moved.md');

    // Verify file was actually moved
    const fs = new NodeFileSystem();
    expect(await fs.exists(join(tempDir, 'moved.md'))).toBe(true);
    expect(await fs.exists(join(tempDir, 'test1.md'))).toBe(false);
  });

  it('streams progress updates for long operations', async () => {
    // GIVEN: A long-running operation (indexing many files)
    // WHEN: Executing it through IPC
    // THEN: Progress updates are streamed to renderer

    // Create many files
    for (let i = 0; i < 50; i++) {
      await writeFile(join(tempDir, `file${i}.md`), `# File ${i}`);
    }

    const updates: any[] = [];
    
    // Set up progress listener
    await window.webContents.executeJavaScript(`
      window.api.indexer.onProgress((progress) => {
        window.__progressUpdates = window.__progressUpdates || [];
        window.__progressUpdates.push(progress);
      });
    `);

    // Execute reindex operation
    await window.webContents.executeJavaScript(`
      window.api.indexer.reindex()
    `);

    // Get collected progress updates
    const progressUpdates = await window.webContents.executeJavaScript(`
      window.__progressUpdates || []
    `);

    expect(progressUpdates.length).toBeGreaterThan(0);
    expect(progressUpdates.some(u => u.phase === 'scanning')).toBe(true);
    expect(progressUpdates.some(u => u.phase === 'complete')).toBe(true);
  });

  it('handles concurrent IPC calls without blocking', async () => {
    // GIVEN: Multiple IPC operations
    // WHEN: Executing them concurrently
    // THEN: All complete successfully without blocking each other

    const startTime = Date.now();

    // Execute multiple operations concurrently
    const results = await window.webContents.executeJavaScript(`
      Promise.all([
        window.api.query.search({}),
        window.api.query.search({ 'content:text': 'Test' }),
        window.api.query.search({ 'fs:name': 'test1' }),
        window.api.operations.validate({
          type: 'move',
          sourcePath: '${join(tempDir, 'test1.md')}',
          targetPath: '${join(tempDir, 'new.md')}'
        })
      ])
    `);

    const duration = Date.now() - startTime;

    expect(results).toHaveLength(4);
    expect(results[0].documents).toBeDefined();
    expect(results[1].documents).toBeDefined();
    expect(results[2].documents).toBeDefined();
    expect(results[3].valid).toBeDefined();

    // Should complete relatively quickly (not serialized)
    expect(duration).toBeLessThan(1000);
  });

  it('measures round-trip time < 50ms for simple query', async () => {
    // GIVEN: A simple query operation
    // WHEN: Executing it through IPC
    // THEN: Round-trip time is less than 50ms

    // Warm up the system first
    await window.webContents.executeJavaScript(`
      window.api.query.search({})
    `);

    // Measure actual query time
    const result = await window.webContents.executeJavaScript(`
      (async () => {
        const start = performance.now();
        const result = await window.api.query.search({ 'fs:name': 'test1' });
        const duration = performance.now() - start;
        return { duration, result };
      })()
    `);

    expect(result.duration).toBeLessThan(50);
    expect(result.result.documents).toHaveLength(1);
  });
});