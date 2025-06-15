/**
 * @fileoverview Configuration package for MMT.
 * 
 * This package provides configuration loading and validation with no external
 * dependencies. It enforces MMT's principles of explicit configuration with
 * no defaults and clear error messages.
 */

export { ConfigService } from './config-service.js';

// Re-export types from entities for convenience
export type { Config, AppContext } from '@mmt/entities';