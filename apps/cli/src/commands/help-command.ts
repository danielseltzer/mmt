import type { AppContext } from '@mmt/entities';
import type { CommandHandler } from './index.js';

/**
 * Help command handler.
 * Displays usage information for the CLI.
 */
export class HelpCommand implements CommandHandler {
  static readonly COMMAND_NAME = 'help';
  
  async execute(context: AppContext, args: string[]): Promise<void> {
    console.log('MMT - Markdown Management Toolkit');
    console.log('');
    console.log('Usage: mmt [options] <command> [command-args]');
    console.log('');
    console.log('Options:');
    console.log('  --config=<path>  Path to configuration file (required for most commands)');
    console.log('  --debug          Enable debug output');
    console.log('  --version        Show version and exit');
    console.log('  --help, -h       Show this help message');
    console.log('');
    console.log('Commands:');
    console.log('  script <path>    Execute a script');
    console.log('  help             Show this help message');
    console.log('');
    console.log('Examples:');
    console.log('  mmt --config=./vault.yaml script ./hello.js');
    console.log('  mmt --version');
    console.log('  mmt help');
  }
}