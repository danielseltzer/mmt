/**
 * File watching types and interfaces
 */

export type FileChangeType = 'created' | 'modified' | 'deleted';

export interface FileChangeEvent {
  type: FileChangeType;
  path: string;
  timestamp: Date;
}

export interface FileWatcherOptions {
  paths: string[];
  ignorePatterns?: string[];
  debounceMs?: number;
  recursive?: boolean;
}

export type FileChangeListener = (event: FileChangeEvent) => void | Promise<void>;