/**
 * @fileoverview Configuration schemas for MMT application settings.
 * 
 * This file defines the configuration structure that drives the entire MMT application.
 * All operations require a valid configuration context that specifies the vault location
 * and any optional services.
 */

import { z } from 'zod';

/**
 * Main configuration schema for MMT.
 * 
 * The configuration is the entry point for all MMT operations, whether through
 * the GUI or scripting interface. It defines the vault to work with and any
 * optional service integrations.
 * 
 * @example
 * ```typescript
 * const config: Config = {
 *   vaultPath: '/Users/me/Documents/notes',
 *   qmServiceUrl: 'https://qm.example.com'
 * };
 * ```
 */
export const ConfigSchema = z.object({
  /**
   * Absolute path to the markdown vault directory.
   * This is the root directory containing all markdown files to be managed.
   */
  vaultPath: z.string().describe('Absolute path to the markdown vault'),
  
  /**
   * Optional URL for QM (Query Manager) vector similarity service.
   * When provided, enables AI-powered similarity search features.
   */
  qmServiceUrl: z.string().url().optional().describe('Optional URL for QM vector service'),
});

export type Config = z.infer<typeof ConfigSchema>;