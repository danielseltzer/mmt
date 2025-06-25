/**
 * Worker pool for parallel file processing
 * Stub implementation for now
 */

import type { ParseResult } from './types.js';

export class WorkerPool {
  constructor(private workerCount: number) {}
  
  processBatch(_paths: string[]): ParseResult[] {
    // Stub - would use actual workers
    // For now, return empty results so the main thread handles it
    return [];
  }
  
  async shutdown(): Promise<void> {
    // Would terminate workers
  }
}