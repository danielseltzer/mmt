import { z } from 'zod';

/**
 * Command-line arguments schema.
 * Supports special flags (version, debug) and command routing.
 */
export const CliArgsSchema = z.object({
  // Special flags
  version: z.boolean().default(false).describe('Show version and exit'),
  debug: z.boolean().default(false).describe('Enable debug output'),
  watch: z.boolean().default(false).describe('Enable file watching for continuous mode'),
  
  // Config and command
  configPath: z.string().optional().describe('Path to config file from --config flag'),
  command: z.string().optional().describe('Command to execute'),
  commandArgs: z.array(z.string()).default([]),
});

export type CliArgs = z.infer<typeof CliArgsSchema>;

/**
 * Script command arguments schema.
 */
export const ScriptCommandArgsSchema = z.object({
  scriptPath: z.string().describe('Path to script file to execute'),
  scriptArgs: z.array(z.string()).default([]).describe('Arguments to pass to script'),
});

export type ScriptCommandArgs = z.infer<typeof ScriptCommandArgsSchema>;

/**
 * Global debug flag accessible to all components.
 * Set via --debug flag.
 */
export let DEBUG = false;

export function setDebug(value: boolean): void {
  DEBUG = value;
}

export function debugLog(...args: unknown[]): void {
  if (DEBUG) {
    // eslint-disable-next-line no-console
    console.debug('[DEBUG]', ...args);
  }
}