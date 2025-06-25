/**
 * @fileoverview CLI-related entity schemas.
 * 
 * Defines schemas for command execution, results, and CLI-specific types
 * that enable testable command handlers without process lifecycle coupling.
 */

import { z } from 'zod';
import { AppContextSchema } from './config.schema.js';

/**
 * Result returned by command handlers.
 * Separates command execution from process lifecycle management.
 */
export const CommandResultSchema = z.object({
  /** Whether the command executed successfully */
  success: z.boolean().describe('Command execution success status'),
  
  /** Process exit code (0 for success, non-zero for failure) */
  exitCode: z.number().int().min(0).max(255).describe('Process exit code'),
  
  /** Optional message to display (error message if failed) */
  message: z.string().optional().describe('Result message'),
  
  /** Detailed error if command failed */
  error: z.instanceof(Error).optional().describe('Error details if failed'),
});

export type CommandResult = z.infer<typeof CommandResultSchema>;

/**
 * Interface for command handlers.
 * Commands return results instead of directly controlling process lifecycle.
 */
export interface CommandHandler {
  /**
   * Execute the command with given context and arguments.
   * 
   * @param context - Application context with config and dependencies
   * @param args - Command-specific arguments
   * @returns Result indicating success/failure and exit code
   */
  execute(context: z.infer<typeof AppContextSchema>, args: string[]): Promise<CommandResult>;
}

/**
 * Common successful command results.
 */
export const CommandResults = {
  /** Standard success result */
  success(): CommandResult {
    return {
      success: true,
      exitCode: 0,
    };
  },

  /** Success with a message */
  successWithMessage(message: string): CommandResult {
    return {
      success: true,
      exitCode: 0,
      message,
    };
  },

  /** Standard failure result */
  failure(message: string, exitCode: number = 1): CommandResult {
    return {
      success: false,
      exitCode,
      message,
    };
  },

  /** Failure with error details */
  error(error: Error, exitCode: number = 1): CommandResult {
    return {
      success: false,
      exitCode,
      message: error.message,
      error,
    };
  },
} as const;