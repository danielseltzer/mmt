import type { AppContext, CommandResult } from '@mmt/entities';

/**
 * Interface for command handlers.
 * Each command (script, help, gui, etc.) implements this interface.
 * 
 * Commands return results instead of directly controlling process lifecycle,
 * enabling testability without mocks and separation of concerns.
 */
export interface CommandHandler {
  /**
   * Execute the command with the given context and arguments.
   * 
   * @param context - Application context containing config
   * @param args - Command-specific arguments
   * @returns Result indicating success/failure and exit code
   */
  execute(context: AppContext, args: string[]): Promise<CommandResult>;
}