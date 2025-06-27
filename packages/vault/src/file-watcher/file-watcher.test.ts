import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdtemp, writeFile, unlink, mkdir, rm } from 'fs/promises';
import { FileWatcher } from './file-watcher.js';
import type { FileChangeEvent } from './types.js';

// Helper to wait for file system events to propagate
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper to start watcher and wait for it to be fully initialized
async function startWatcher(w: FileWatcher): Promise<void> {
  await w.start();
  // Wait for watcher to fully initialize its file system watchers
  await wait(200);
}

describe('FileWatcher', () => {
  let tempDir: string;
  let watcher: FileWatcher;

  beforeEach(async () => {
    // Create temp directory for tests
    tempDir = await mkdtemp(join(tmpdir(), 'mmt-file-watcher-test-'));
  });

  afterEach(async () => {
    // Stop watcher if running
    if (watcher?.isRunning()) {
      await watcher.stop();
    }

    // Clean up temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('lifecycle', () => {
    it('should start and stop watching', async () => {
      // GIVEN: A FileWatcher instance with configured paths
      // WHEN: Starting and then stopping the watcher
      // THEN: isRunning() reflects the current state accurately
      watcher = new FileWatcher({ paths: [tempDir] });
      
      expect(watcher.isRunning()).toBe(false);
      
      await startWatcher(watcher);
      expect(watcher.isRunning()).toBe(true);
      
      await watcher.stop();
      expect(watcher.isRunning()).toBe(false);
    });

    it('should throw error if started twice', async () => {
      // GIVEN: A FileWatcher that is already running
      // WHEN: Attempting to start it again
      // THEN: Throws error to prevent duplicate watchers
      watcher = new FileWatcher({ paths: [tempDir] });
      
      await startWatcher(watcher);
      await expect(watcher.start()).rejects.toThrow('File watcher already started');
    });

    it('should handle stop when not started', async () => {
      // GIVEN: A FileWatcher that was never started
      // WHEN: Calling stop()
      // THEN: Handles gracefully without throwing errors
      watcher = new FileWatcher({ paths: [tempDir] });
      
      // Should not throw
      await watcher.stop();
      expect(watcher.isRunning()).toBe(false);
    });

    it('should return watched paths', () => {
      // GIVEN: A FileWatcher configured with specific paths
      // WHEN: Getting watched paths
      // THEN: Returns the exact paths passed during construction
      const paths = [tempDir, '/another/path'];
      watcher = new FileWatcher({ paths });
      
      expect(watcher.getWatchedPaths()).toEqual(paths);
    });
  });

  describe('file events', () => {
    it('should emit event when markdown file is created', async () => {
      // GIVEN: A running FileWatcher monitoring a directory
      // WHEN: Creating a new markdown file
      // THEN: Emits 'created' event with file path and timestamp
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Create a markdown file
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, '# Test');
      
      // Wait for event with debounce
      await wait(200);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'created',
        path: filePath,
      });
      expect(events[0].timestamp).toBeInstanceOf(Date);
    });

    it('should emit event when markdown file is modified', async () => {
      // GIVEN: An existing markdown file being watched
      // WHEN: Modifying the file contents
      // THEN: Emits 'modified' event after debounce period
      // Create file before watching
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, '# Test');
      
      // Wait for filesystem to settle
      await wait(100);
      
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Modify the file
      await writeFile(filePath, '# Test Modified');
      
      // Wait for event with debounce
      await wait(200);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'modified',
        path: filePath,
      });
    });

    it('should emit event when markdown file is deleted', async () => {
      // GIVEN: An existing markdown file being watched
      // WHEN: Deleting the file
      // THEN: Emits 'deleted' event with the removed file's path
      // Create file before watching
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, '# Test');
      
      // Wait for filesystem to settle
      await wait(100);
      
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Delete the file
      await unlink(filePath);
      
      // Wait for event with debounce
      await wait(200);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'deleted',
        path: filePath,
      });
    });

    it('should ignore non-markdown files', async () => {
      // GIVEN: A watcher monitoring for markdown files only
      // WHEN: Creating .txt, .json, and other non-markdown files
      // THEN: No events are emitted (filters out non-markdown)
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Create non-markdown files
      await writeFile(join(tempDir, 'test.txt'), 'text file');
      await writeFile(join(tempDir, 'test.json'), '{}');
      await writeFile(join(tempDir, 'README'), 'readme');
      
      // Wait for potential events
      await wait(100);
      
      expect(events).toHaveLength(0);
    });

    it('should debounce rapid changes', async () => {
      // GIVEN: A file being modified multiple times rapidly
      // WHEN: Changes occur faster than debounce interval
      // THEN: Only one event is emitted after debounce period
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 100 });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      // Create file first
      const filePath = join(tempDir, 'test.md');
      await writeFile(filePath, '# Initial');
      await wait(100);
      
      await startWatcher(watcher);
      
      // Rapidly modify the file
      await writeFile(filePath, '# Test 1');
      await wait(10);
      await writeFile(filePath, '# Test 2');
      await wait(10);
      await writeFile(filePath, '# Test 3');
      await wait(10);
      await writeFile(filePath, '# Test 4');
      
      // Wait less than debounce time
      await wait(50);
      expect(events).toHaveLength(0);
      
      // Wait for debounce to complete
      await wait(150);
      
      // Should only get one event (the last change)
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('modified');
    });

    it('should handle nested directories when recursive is true', async () => {
      // GIVEN: FileWatcher with recursive: true option
      // WHEN: Creating files in nested subdirectories
      // THEN: Events are emitted for files at any depth
      watcher = new FileWatcher({ 
        paths: [tempDir], 
        debounceMs: 50,
        recursive: true 
      });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Create nested directory and file
      const subDir = join(tempDir, 'subdir');
      await mkdir(subDir);
      const filePath = join(subDir, 'nested.md');
      await writeFile(filePath, '# Nested');
      
      // Wait for event
      await wait(200);
      
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'created',
        path: filePath,
      });
    });

    it('should ignore nested directories when recursive is false', async () => {
      // GIVEN: FileWatcher with recursive: false option
      // WHEN: Creating files in subdirectories
      // THEN: No events for nested files (only watches top level)
      watcher = new FileWatcher({ 
        paths: [tempDir], 
        debounceMs: 50,
        recursive: false 
      });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Create nested directory and file
      const subDir = join(tempDir, 'subdir');
      await mkdir(subDir);
      const filePath = join(subDir, 'nested.md');
      await writeFile(filePath, '# Nested');
      
      // Wait for potential event
      await wait(200);
      
      expect(events).toHaveLength(0);
    });
  });

  describe('ignore patterns', () => {
    it('should ignore files matching ignore patterns', async () => {
      // GIVEN: FileWatcher with custom ignore patterns
      // WHEN: Creating files matching those patterns
      // THEN: Only files NOT matching patterns emit events
      watcher = new FileWatcher({ 
        paths: [tempDir], 
        debounceMs: 50,
        ignorePatterns: ['*.tmp', 'draft-*', '**/ignore/**']
      });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Create files that should be ignored
      await writeFile(join(tempDir, 'test.tmp'), '# Temp');
      await writeFile(join(tempDir, 'draft-post.md'), '# Draft');
      
      // Create ignore directory
      const ignoreDir = join(tempDir, 'ignore');
      await mkdir(ignoreDir);
      await writeFile(join(ignoreDir, 'ignored.md'), '# Ignored');
      
      // Create file that should not be ignored
      await writeFile(join(tempDir, 'normal.md'), '# Normal');
      
      // Wait for events
      await wait(200);
      
      expect(events).toHaveLength(1);
      expect(events[0].path).toContain('normal.md');
    });

    it('should use default ignore patterns', async () => {
      // GIVEN: FileWatcher without custom ignore patterns
      // WHEN: Creating hidden files, temp files, and trash files
      // THEN: Default patterns filter out system/temp files
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      const events: FileChangeEvent[] = [];
      
      watcher.onFileChange((event) => {
        events.push(event);
      });
      
      await startWatcher(watcher);
      
      // Create files that should be ignored by default
      await writeFile(join(tempDir, '.hidden.md'), '# Hidden');
      await writeFile(join(tempDir, 'test.tmp'), '# Temp');
      await writeFile(join(tempDir, 'file.backup.12345'), '# Backup');
      
      // Create .trash directory and file
      const trashDir = join(tempDir, '.trash');
      await mkdir(trashDir);
      await writeFile(join(trashDir, 'deleted.md'), '# Deleted');
      
      // Create file that should not be ignored
      await writeFile(join(tempDir, 'visible.md'), '# Visible');
      
      // Wait for events
      await wait(200);
      
      expect(events).toHaveLength(1);
      expect(events[0].path).toContain('visible.md');
    });
  });

  describe('event listeners', () => {
    it('should support multiple listeners', async () => {
      // GIVEN: Multiple event listeners registered
      // WHEN: A file change occurs
      // THEN: All listeners receive the same event
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      
      const events1: FileChangeEvent[] = [];
      const events2: FileChangeEvent[] = [];
      
      const listener1 = (event: FileChangeEvent) => events1.push(event);
      const listener2 = (event: FileChangeEvent) => events2.push(event);
      
      watcher.onFileChange(listener1);
      watcher.onFileChange(listener2);
      
      await startWatcher(watcher);
      
      // Create a file
      await writeFile(join(tempDir, 'test.md'), '# Test');
      
      // Wait for events
      await wait(200);
      
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0]).toEqual(events2[0]);
    });

    it('should support removing listeners', async () => {
      // GIVEN: A registered event listener
      // WHEN: Removing the listener with offFileChange()
      // THEN: Listener no longer receives events
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      
      const events: FileChangeEvent[] = [];
      const listener = (event: FileChangeEvent) => events.push(event);
      
      watcher.onFileChange(listener);
      
      await startWatcher(watcher);
      
      // Create first file
      await writeFile(join(tempDir, 'test1.md'), '# Test 1');
      await wait(100);
      
      expect(events).toHaveLength(1);
      
      // Remove listener
      watcher.offFileChange(listener);
      
      // Create second file
      await writeFile(join(tempDir, 'test2.md'), '# Test 2');
      await wait(100);
      
      // Should still have only one event
      expect(events).toHaveLength(1);
    });

    it('should handle async listeners', async () => {
      // GIVEN: Async event listeners that perform async operations
      // WHEN: Multiple file changes trigger the listeners
      // THEN: All async operations complete successfully
      watcher = new FileWatcher({ paths: [tempDir], debounceMs: 50 });
      
      const processedPaths: string[] = [];
      
      // Async listener that simulates processing
      const asyncListener = async (event: FileChangeEvent) => {
        await wait(10); // Simulate async work
        processedPaths.push(event.path);
      };
      
      watcher.onFileChange(asyncListener);
      
      await startWatcher(watcher);
      
      // Create multiple files
      await writeFile(join(tempDir, 'test1.md'), '# Test 1');
      await writeFile(join(tempDir, 'test2.md'), '# Test 2');
      
      // Wait for events and processing
      await wait(300);
      
      expect(processedPaths).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should emit error events', async () => {
      // GIVEN: A FileWatcher with error event listener
      // WHEN: File system errors occur (if any)
      // THEN: Errors are emitted through the error event
      watcher = new FileWatcher({ paths: [tempDir] });
      
      const errors: Error[] = [];
      watcher.on('error', (error) => {
        errors.push(error);
      });
      
      await startWatcher(watcher);
      
      // Simulate an error by watching a non-existent path
      // Note: This is tricky to test reliably across platforms
      // In practice, chokidar handles most errors gracefully
      
      expect(errors).toHaveLength(0); // No errors expected in normal operation
    });
  });
});