/**
 * Persistent metadata cache using SQLite
 * Stub implementation for now
 */

import type { CacheEntry } from './types.js';
import type { Stats } from 'fs';

export class MetadataCache {
  private cache = new Map<string, CacheEntry>();
  
  constructor(private cacheDir: string) {}
  
  async initialize(): Promise<void> {
    // Would create SQLite database here
  }
  
  get(path: string): CacheEntry | null {
    return this.cache.get(path) ?? null;
  }
  
  set(path: string, entry: CacheEntry): void {
    this.cache.set(path, entry);
  }
  
  getAll(): Map<string, CacheEntry> {
    return new Map(this.cache);
  }
  
  delete(path: string): void {
    this.cache.delete(path);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  isValid(entry: CacheEntry, stats: Stats): boolean {
    return entry.metadata.mtime === stats.mtime.getTime() &&
           entry.metadata.size === stats.size;
  }
}