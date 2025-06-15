import type { AppContext } from '@mmt/entities';

/**
 * Interface for command handlers.
 * Each command (script, help, gui, etc.) implements this interface.
 */
export interface CommandHandler {
  /**
   * Execute the command with the given context and arguments.
   * 
   * @param context - Application context containing config
   * @param args - Command-specific arguments
   */
  execute(context: AppContext, args: string[]): Promise<void>;
}