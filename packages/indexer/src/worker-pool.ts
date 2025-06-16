/**
 * Worker pool for parallel file processing
 * Stub implementation for now
 */

import type { ParseResult } from './types.js';

export class WorkerPool {
  constructor(private workerCount: number) {}
  
  async processBatch(paths: string[]): Promise<ParseResult[]> {
    // Stub - would use actual workers
    // For now, return empty results so the main thread handles it
    return [];
  }
  
  async shutdown(): Promise<void> {
    // Would terminate workers
  }
}