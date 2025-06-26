import { watch, type FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { minimatch } from 'minimatch';
import type { FileChangeEvent, FileWatcherOptions, FileChangeListener, FileChangeType } from './types.js';

/**
 * File watcher that emits events when markdown files change.
 * Uses chokidar for cross-platform file system monitoring.
 */
export class FileWatcher extends EventEmitter {
  private watcher: FSWatcher | undefined;
  private options: Required<FileWatcherOptions>;
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  constructor(options: FileWatcherOptions) {
    super();
    this.options = {
      paths: options.paths,
      ignorePatterns: options.ignorePatterns ?? [
        '.*',           // Hidden files
        '*.tmp',        // Temporary files
        '*.backup.*',   // Backup files
        '.trash/**',    // Trash directory
        '.backups/**',  // Backups directory
        'node_modules/**',
        '.git/**'
      ],
      debounceMs: options.debounceMs ?? 300,
      recursive: options.recursive ?? true,
    };
  }

  /**
   * Start watching files
   */
  async start(): Promise<void> {
    if (this.watcher) {
      throw new Error('File watcher already started');
    }

    this.watcher = watch(this.options.paths, {
      persistent: true,
      ignoreInitial: true,
      ignored: (path: string) => this.shouldIgnore(path),
      // Only watch markdown files
      depth: this.options.recursive ? undefined : 0,
    });

    // Set up event handlers
    this.watcher
      .on('add', (path) => {
        if (this.isMarkdownFile(path)) {
          this.handleFileChange('created', path);
        }
      })
      .on('change', (path) => {
        if (this.isMarkdownFile(path)) {
          this.handleFileChange('modified', path);
        }
      })
      .on('unlink', (path) => {
        if (this.isMarkdownFile(path)) {
          this.handleFileChange('deleted', path);
        }
      })
      .on('error', (error) => this.emit('error', error));

    // Wait for initial scan to complete
    await new Promise<void>((resolve) => {
      this.watcher!.once('ready', resolve);
    });
  }

  /**
   * Stop watching files
   */
  async stop(): Promise<void> {
    if (!this.watcher) {
      return;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close watcher
    await this.watcher.close();
    this.watcher = undefined;
  }

  /**
   * Add a listener for file changes
   */
  onFileChange(listener: FileChangeListener): void {
    this.on('change', listener);
  }

  /**
   * Remove a file change listener
   */
  offFileChange(listener: FileChangeListener): void {
    this.off('change', listener);
  }

  /**
   * Get whether the watcher is running
   */
  isRunning(): boolean {
    return this.watcher !== undefined;
  }

  /**
   * Get the paths being watched
   */
  getWatchedPaths(): string[] {
    return [...this.options.paths];
  }

  private handleFileChange(type: FileChangeType, path: string): void {
    // If not recursive, check if file is in a subdirectory
    if (!this.options.recursive) {
      // Check if path contains more than one level from any watched path
      const isNested = this.options.paths.some(watchPath => {
        const relativePath = path.startsWith(watchPath) 
          ? path.slice(watchPath.length + 1) 
          : path;
        return relativePath.includes('/');
      });
      
      if (isNested) {
        return; // Ignore nested files when not recursive
      }
    }

    // Clear existing debounce timer for this path
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(path);
      
      const event: FileChangeEvent = {
        type,
        path,
        timestamp: new Date(),
      };
      
      this.emit('change', event);
    }, this.options.debounceMs);

    this.debounceTimers.set(path, timer);
  }

  private shouldIgnore(path: string): boolean {
    // Check against full path and basename
    const basename = path.split('/').pop() || path;
    return this.options.ignorePatterns.some(pattern => {
      // Special handling for hidden files pattern
      if (pattern === '.*' && basename.startsWith('.')) {
        return true;
      }
      
      // Check if path contains directory patterns like .trash/ or .backups/
      if (pattern.includes('/**')) {
        const dirPattern = pattern.replace('/**', '');
        if (path.includes(`/${dirPattern}/`) || path.includes(`${dirPattern}/`)) {
          return true;
        }
      }
      
      // For patterns like '*.log', check against basename
      // For patterns like '**/node_modules/**', check against full path
      return minimatch(path, pattern, { matchBase: true }) || minimatch(basename, pattern);
    });
  }

  private isMarkdownFile(path: string): boolean {
    return path.endsWith('.md');
  }
}