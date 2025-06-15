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
 *   indexPath: '/Users/me/.mmt/notes-index'
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
   * Absolute path to store the vault index.
   * The index database will be created here if it doesn't exist.
   */
  indexPath: z.string().describe('Absolute path to store the vault index'),
}).strict();

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Application context schema.
 * 
 * The runtime context containing validated configuration and other
 * application-level data that flows through the system. Currently 
 * minimal but designed to grow as needed.
 * 
 * @example
 * ```typescript
 * const context: AppContext = {
 *   config: {
 *     vaultPath: '/Users/me/Documents/notes',
 *     indexPath: '/Users/me/.mmt/notes-index'
 *   }
 * };
 * ```
 */
export const AppContextSchema = z.object({
  /**
   * The validated user configuration loaded from the config file.
   */
  config: ConfigSchema,
});

export type AppContext = z.infer<typeof AppContextSchema>;