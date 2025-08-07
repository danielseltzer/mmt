/**
 * @fileoverview Configuration schemas for MMT application settings.
 * 
 * This file defines the configuration structure that drives the entire MMT application.
 * All operations require a valid configuration context that specifies the vault location
 * and any optional services.
 */

import { z } from 'zod';

/**
 * Custom Zod schema for absolute paths.
 * Enforces that paths must be absolute at the schema validation level.
 */
const absolutePath = z.string().refine(
  (path) => path.startsWith('/') || (process.platform === 'win32' && /^[A-Za-z]:[\\/]/u.test(path)),
  { message: 'Path must be absolute' }
);

/**
 * Individual vault configuration schema.
 * 
 * Each vault represents a separate collection of markdown files with its own
 * index and optional configuration.
 * 
 * @example
 * ```typescript
 * const vault: VaultConfig = {
 *   name: 'Personal',
 *   path: '/Users/me/Documents/personal-notes',
 *   indexPath: '/Users/me/.mmt/personal-index'
 * };
 * ```
 */
export const VaultConfigSchema = z.object({
  /**
   * Unique name identifier for the vault.
   * Used in the UI and API to reference this vault.
   */
  name: z.string().min(1).describe('Unique vault identifier'),
  
  /**
   * Absolute path to the markdown vault directory.
   * This is the root directory containing all markdown files to be managed.
   */
  path: absolutePath.describe('Absolute path to the markdown vault'),
  
  /**
   * Absolute path to store the vault index.
   * The index database will be created here if it doesn't exist.
   */
  indexPath: absolutePath.describe('Absolute path to store the vault index'),
  
  /**
   * File watching configuration for real-time index updates.
   * When enabled, the indexer will automatically update when files change.
   */
  fileWatching: z.object({
    /**
     * Whether to enable file watching.
     * When true, changes to markdown files trigger automatic index updates.
     */
    enabled: z.boolean().default(true),
    
    /**
     * Debounce delay in milliseconds.
     * Rapid file changes within this window are batched together.
     */
    debounceMs: z.number().min(0).default(100),
    
    /**
     * Glob patterns to ignore when watching.
     * These patterns are relative to the vault root.
     */
    ignorePatterns: z.array(z.string()).default([
      '.git/**',
      '.obsidian/**',
      '.trash/**',
      'node_modules/**'
    ]),
  }).default({}).optional(),
});

export type VaultConfig = z.infer<typeof VaultConfigSchema>;

/**
 * Main configuration schema for MMT.
 * 
 * The configuration is the entry point for all MMT operations, whether through
 * the GUI or scripting interface. It defines multiple vaults and application-wide
 * settings.
 * 
 * @example
 * ```typescript
 * const config: Config = {
 *   vaults: [
 *     {
 *       name: 'Personal',
 *       path: '/Users/me/Documents/personal-notes',
 *       indexPath: '/Users/me/.mmt/personal-index'
 *     },
 *     {
 *       name: 'Work',
 *       path: '/Users/me/Documents/work-notes',
 *       indexPath: '/Users/me/.mmt/work-index'
 *     }
 *   ],
 *   apiPort: 3001,
 *   webPort: 5173
 * };
 * ```
 */
export const ConfigSchema = z.object({
  /**
   * Array of vault configurations.
   * Each vault is independently indexed and managed.
   */
  vaults: z.array(VaultConfigSchema)
    .min(1, 'At least one vault must be configured')
    .refine(
      (vaults) => {
        const names = vaults.map(v => v.name);
        return new Set(names).size === names.length;
      },
      { message: 'Vault names must be unique' }
    ),
  
  /**
   * Port number for the API server.
   * Required when running the API server or web UI.
   */
  apiPort: z.number().int().min(1).max(65535).describe('Port for the API server'),
  
  /**
   * Port number for the web development server.
   * Required when running the web UI in development mode.
   */
  webPort: z.number().int().min(1).max(65535).describe('Port for the web server'),
  
  /**
   * Similarity search configuration using Ollama embeddings.
   * When enabled, provides semantic search capabilities through vector similarity.
   * Currently applies globally to all vaults.
   */
  similarity: z.object({
    /**
     * Whether to enable similarity search features.
     * Requires Ollama to be installed and running.
     */
    enabled: z.boolean().default(false),
    
    /**
     * URL of the Ollama API server.
     * Default is the standard Ollama local endpoint.
     */
    ollamaUrl: z.string().url().default('http://localhost:11434'),
    
    /**
     * Ollama model to use for generating embeddings.
     * Must be a model that supports embeddings (e.g., nomic-embed-text).
     */
    model: z.string().default('nomic-embed-text'),
    
    /**
     * Optional custom path for the similarity index file.
     * If not specified, will be stored alongside the regular index.
     */
    indexFilename: z.string().optional().describe('Filename for similarity index (stored in indexPath directory)'),
  }).default({ enabled: false }).optional(),
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