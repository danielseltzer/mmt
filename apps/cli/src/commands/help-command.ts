import type { AppContext, CommandResult } from '@mmt/entities';
import { CommandResults } from '@mmt/entities';
import type { CommandHandler } from './index.js';

/**
 * Help command handler.
 * Displays usage information for the CLI.
 */
export class HelpCommand implements CommandHandler {
  static readonly COMMAND_NAME = 'help';
  
  execute(_context: AppContext, _args: string[]): Promise<CommandResult> {
    const output = [
      'MMT - Markdown Management Toolkit',
      '',
      'Usage: mmt [options] <command> [command-args]',
      '',
      'Options:',
      '  --config=<path>  Path to configuration file (required for most commands)',
      '  --debug          Enable debug output',
      '  --watch          Enable file watching for automatic index updates',
      '  --version        Show version and exit',
      '  --help, -h       Show this help message',
      '',
      'Commands:',
      '  script <path>    Execute a script',
      '  help             Show this help message',
      '',
      'Examples:',
      '  mmt --config=./vault.yaml script ./hello.js',
      '  mmt --version',
      '  mmt help',
    ];
    
    // eslint-disable-next-line no-console
    console.log(output.join('\n'));
    
    return Promise.resolve(CommandResults.success());
  }
}