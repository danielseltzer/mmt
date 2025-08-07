import { ConfigService, type AppContext } from '@mmt/config';
import { CliParser } from './cli-parser.js';
import { setDebug, debugLog } from './schemas/cli.schema.js';
import type { CommandHandler } from './commands/index.js';
import { HelpCommand } from './commands/help-command.js';
import { ScriptCommand } from './commands/script-command.js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Main orchestrator for the MMT CLI application.
 * 
 * Responsibilities:
 * - Parse command-line arguments
 * - Handle special flags (version, debug)
 * - Load configuration
 * - Route to command handlers
 * - Handle errors with clear messages
 */
export class ApplicationDirector {
  private commands: Map<string, CommandHandler>;
  private version: string;

  constructor() {
    // Register available commands
    this.commands = new Map([
      [HelpCommand.COMMAND_NAME, new HelpCommand()],
      [ScriptCommand.COMMAND_NAME, new ScriptCommand()],
      // GUI command will be added later
    ]);

    // Read version from package.json
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      const packageJson: { version: string } = JSON.parse(
        readFileSync(join(currentDir, '..', 'package.json'), 'utf-8')
      ) as { version: string };
      this.version = packageJson.version;
    } catch {
      this.version = '0.1.0'; // Fallback
    }
  }

  /**
   * Run the application with the given arguments.
   * 
   * @param args - Command-line arguments (without node and script name)
   */
  async run(args: string[]): Promise<void> {
    try {
      // 1. Parse CLI arguments
      const cliArgs = new CliParser().parse(args);
      
      // 2. Handle special flags first
      if (cliArgs.version) {
        // eslint-disable-next-line no-console
        console.log(`mmt version ${this.version}`);
        process.exit(0);
      }
      
      if (cliArgs.debug) {
        setDebug(true);
        debugLog('Debug mode enabled');
        debugLog('CLI args:', cliArgs);
      }
      
      // 3. Default to help if no command
      cliArgs.command ??= 'help';
      
      // 4. Help doesn't require config
      if (cliArgs.command === 'help') {
        const handler = this.commands.get('help');
        if (handler) {
          await handler.execute({} as AppContext, cliArgs.commandArgs);
        }
        // Help command always succeeds, just return
        return;
      }
      
      // 5. All other commands require config
      if (!cliArgs.configPath) {
        this.exitWithError('--config flag is required');
      }
      
      debugLog('Loading config from:', cliArgs.configPath);
      
      // 6. Load configuration
      const configService = new ConfigService();
      const config = configService.load(cliArgs.configPath);
      
      // Override file watching setting with CLI flag if provided
      if (cliArgs.watch && config.vaults[0]) {
        config.vaults[0].fileWatching = {
          enabled: true,
          debounceMs: config.vaults[0].fileWatching?.debounceMs ?? 100,
          ignorePatterns: config.vaults[0].fileWatching?.ignorePatterns ?? [
            '.git/**',
            '.obsidian/**',
            '.trash/**',
            'node_modules/**'
          ],
        };
      }
      
      debugLog('Config loaded:', config);
      
      // 7. Create app context
      const context: AppContext = { config };
      
      // 8. Get command handler
      const handler = this.commands.get(cliArgs.command);
      if (!handler) {
        this.exitWithError(`Unknown command: ${cliArgs.command}`);
      }
      
      debugLog(`Executing command: ${cliArgs.command}`);
      
      // 9. Execute command
      const result = await handler.execute(context, cliArgs.commandArgs);
      
      // 10. Handle command result
      if (!result.success) {
        if (result.message) {
          console.error(result.message);
        }
        process.exit(result.exitCode);
      }
      
      // Success - exit normally
      if (result.exitCode !== 0) {
        process.exit(result.exitCode);
      }
      
    } catch (error) {
      // ConfigService already handles its own errors and exits
      // This catches unexpected errors
      if (error instanceof Error && error.message.includes('Process exited')) {
        // Already handled by ConfigService
        throw error;
      }
      
      console.error('Unexpected error:', error);
      process.exit(1);
    }
  }

  /**
   * Exit with an error message and usage hint.
   * 
   * @param message - Error message to display
   */
  private exitWithError(message: string): never {
    console.error(`Error: ${message}\n`);
    console.error('Usage: mmt [options] <command> [command-args]');
    console.error('Try "mmt help" for more information.');
    process.exit(1);
  }
}