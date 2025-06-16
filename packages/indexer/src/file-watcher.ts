/**
 * File watcher using chokidar
 * Stub implementation for now
 */

import { EventEmitter } from 'events';

export class FileWatcher extends EventEmitter {
  constructor(private vaultPath: string) {
    super();
  }
  
  start(): void {
    // Would start chokidar watcher
  }
  
  stop(): void {
    // Would stop watcher
  }
}