import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import { minimatch } from 'minimatch';

/**
 * Options for configuring the file watcher
 */
export interface FileWatcherOptions {
  /** Paths to watch (files or directories) */
  paths: string[];
  /** Whether to watch subdirectories recursively */
  recursive?: boolean;
  /** Debounce time in milliseconds for change events */
  debounceMs?: number;
  /** Glob patterns for files to ignore */
  ignorePatterns?: string[];
}

/**
 * Event emitted when a file changes
 */
export interface FileChangeEvent {
  /** Type of change that occurred */
  type: 'created' | 'modified' | 'deleted';
  /** Absolute path to the changed file */
  path: string;
  /** Timestamp when the change was detected */
  timestamp: number;
}

/**
 * Low-level file system watcher that monitors files and directories for changes.
 * This is a generic utility with no business logic - it simply reports filesystem events.
 */
export class FileWatcher extends EventEmitter {
  private watcher?: FSWatcher;
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  constructor(private options: FileWatcherOptions) {
    super();
  }

  /**
   * Register a callback to be called when a file changes
   */
  onFileChange(callback: (event: FileChangeEvent) => void | Promise<void>): void {
    this.on('change', (event: FileChangeEvent) => {
      // Properly handle promise return without blocking
      const result = callback(event);
      if (result && typeof result.catch === 'function') {
        result.catch((error: unknown) => this.emit('error', error));
      }
    });
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const watchOptions = {
      persistent: true,
      ignoreInitial: true,
      depth: this.options.recursive !== false ? undefined : 0,
      ignored: this.createIgnoreMatcher(),
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    };

    this.watcher = watch(this.options.paths, watchOptions);

    // Set up event handlers
    this.watcher
      .on('add', (path: string) => { this.handleFileEvent('created', path); })
      .on('change', (path: string) => { this.handleFileEvent('modified', path); })
      .on('unlink', (path: string) => { this.handleFileEvent('deleted', path); })
      .on('error', (error: Error) => this.emit('error', error));

    // Wait for the watcher to be ready
    await new Promise<void>((resolve) => {
      if (!this.watcher) {
        throw new Error('Watcher not initialized');
      }
      this.watcher.once('ready', () => {
        this.isRunning = true;
        resolve();
      });
    });
  }

  /**
   * Stop watching for file changes
   */
  async stop(): Promise<void> {
    if (!this.isRunning || !this.watcher) {
      return;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Close the watcher
    await this.watcher.close();
    this.watcher = undefined;
    this.isRunning = false;
  }

  /**
   * Check if the watcher is currently running
   */
  isWatching(): boolean {
    return this.isRunning;
  }

  /**
   * Handle a file event with optional debouncing
   */
  private handleFileEvent(type: FileChangeEvent['type'], path: string): void {
    const debounceMs = this.options.debounceMs ?? 100;

    // Clear any existing timer for this path
    const existingTimer = this.debounceTimers.get(path);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set up a new debounced event
    const timer = setTimeout(() => {
      this.debounceTimers.delete(path);
      
      const event: FileChangeEvent = {
        type,
        path,
        timestamp: Date.now()
      };

      this.emit('change', event);
    }, debounceMs);

    this.debounceTimers.set(path, timer);
  }

  /**
   * Create a function to check if a path should be ignored
   */
  private createIgnoreMatcher(): ((path: string) => boolean) | undefined {
    const patterns = this.options.ignorePatterns;
    if (!patterns || patterns.length === 0) {
      return undefined;
    }

    return (path: string) => {
      return patterns.some(pattern => minimatch(path, pattern));
    };
  }
}

// Re-export types for convenience
export type { FSWatcher } from 'chokidar';