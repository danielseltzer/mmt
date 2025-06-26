import { CliArgsSchema, type CliArgs } from './schemas/cli.schema.js';

/**
 * Parses command-line arguments into structured format.
 * 
 * Supports:
 * - --version (show version and exit)
 * - --debug (enable debug output)
 * - --config=<path> (required for most commands)
 * - --help, -h (show help)
 * - Commands: script, help, gui (future)
 */
export class CliParser {
  /**
   * Parse command-line arguments.
   * 
   * @param args - Raw arguments from process.argv.slice(2)
   * @returns Structured CLI arguments
   */
  parse(args: string[]): CliArgs {
    const parsed: Partial<CliArgs> = {
      commandArgs: [],
    };
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg === '--version') {
        parsed.version = true;
      } else if (arg === '--debug') {
        parsed.debug = true;
      } else if (arg.startsWith('--config=') && !parsed.command) {
        // Handle --config=value format (only before command)
        parsed.configPath = arg.slice('--config='.length);
      } else if (arg === '--config' && !parsed.command) {
        // Handle --config value format (only before command)
        if (i + 1 >= args.length) {
          throw new Error('--config flag requires a value');
        }
        // Check if next arg looks like a command instead of a value
        const nextArg = args[i + 1];
        if (!nextArg.startsWith('-') && ['script', 'help'].includes(nextArg)) {
          throw new Error('--config flag requires a value');
        }
        parsed.configPath = args[++i];
      } else if (arg === '--help' || arg === '-h') {
        parsed.command = 'help';
      } else if (!parsed.command && !arg.startsWith('-')) {
        // First non-flag arg is the command
        // Store as-is, let schema validation handle unknown commands
        parsed.command = arg as 'script' | 'help';
      } else if (parsed.command) {
        // Everything after command goes to commandArgs
        parsed.commandArgs?.push(arg);
      } else if (!arg.startsWith('-')) {
        // Non-flag arg before command - invalid
        throw new Error(`Unexpected argument: ${arg}`);
      } else {
        // Unknown flag - error instead of ignoring
        throw new Error(`Unknown flag: ${arg}`);
      }
      
      i++;
    }
    
    return CliArgsSchema.parse(parsed);
  }
}