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
  
  async get(path: string): Promise<CacheEntry | null> {
    return this.cache.get(path) || null;
  }
  
  async set(path: string, entry: CacheEntry): Promise<void> {
    this.cache.set(path, entry);
  }
  
  async getAll(): Promise<Map<string, CacheEntry>> {
    return new Map(this.cache);
  }
  
  async delete(path: string): Promise<void> {
    this.cache.delete(path);
  }
  
  async clear(): Promise<void> {
    this.cache.clear();
  }
  
  isValid(entry: CacheEntry, stats: Stats): boolean {
    return entry.metadata.mtime === stats.mtime.getTime() &&
           entry.metadata.size === stats.size;
  }
}