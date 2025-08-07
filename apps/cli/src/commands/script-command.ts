import type { AppContext, CommandResult } from '@mmt/entities';
import { CommandResults } from '@mmt/entities';
import type { CommandHandler } from './index.js';
import { ScriptRunner } from '@mmt/scripting';
import { NodeFileSystem } from '@mmt/filesystem-access';
import { QueryParser } from '@mmt/query-parser';
import { ScriptCommandArgsSchema } from '../schemas/cli.schema.js';
import { debugLog } from '../schemas/cli.schema.js';
import { resolve, isAbsolute } from 'path';

/**
 * Script command handler.
 * Executes MMT scripts with operation pipelines.
 * 
 * Usage: mmt script <script-file> [options]
 * Options:
 *   --execute    Actually execute operations (default is preview)
 *   --output     Output format (summary, detailed, json, csv)
 *   --report     Generate markdown report (optional: specify path)
 */
export class ScriptCommand implements CommandHandler {
  static readonly COMMAND_NAME = 'script';
  
  async execute(context: AppContext, args: string[]): Promise<CommandResult> {
    // Check for script path before parsing
    if (!args[0]) {
      return CommandResults.failure(
        'Script path required. Usage: mmt --config=<path> script <script-path> [--execute]'
      );
    }
    
    // Parse and validate script arguments
    const scriptArgs = ScriptCommandArgsSchema.parse({
      scriptPath: args[0],
      scriptArgs: args.slice(1),
    });
    
    const defaultVault = context.config.vaults[0];
    debugLog('Script command received:', {
      scriptPath: scriptArgs.scriptPath,
      scriptArgs: scriptArgs.scriptArgs,
      vaultPath: defaultVault.path,
      indexPath: defaultVault.indexPath,
    });
    
    // Resolve script path
    const absoluteScriptPath = isAbsolute(scriptArgs.scriptPath) 
      ? scriptArgs.scriptPath 
      : resolve(process.cwd(), scriptArgs.scriptPath);

    // Extract CLI options
    const cliOptions: Record<string, unknown> = {};
    
    // Check for --execute flag
    if (scriptArgs.scriptArgs.includes('--execute')) {
      cliOptions.execute = true;
    }

    // Check for --output format
    const outputIndex = scriptArgs.scriptArgs.indexOf('--output');
    if (outputIndex !== -1 && scriptArgs.scriptArgs[outputIndex + 1]) {
      cliOptions.outputFormat = scriptArgs.scriptArgs[outputIndex + 1];
    }

    // Check for --report flag
    const reportIndex = scriptArgs.scriptArgs.indexOf('--report');
    if (reportIndex !== -1) {
      // Check if next arg is a path (doesn't start with --)
      const nextArg = scriptArgs.scriptArgs[reportIndex + 1];
      if (nextArg && !nextArg.startsWith('--')) {
        cliOptions.reportPath = nextArg;
      } else {
        // Default report path
        const timestamp = new Date().toISOString().replace(/[:.]/gu, '-').slice(0, -5);
        cliOptions.reportPath = `mmt-report-${timestamp}.md`;
      }
    }

    // Create script runner with dependencies
    const runner = new ScriptRunner({
      config: context.config,
      fileSystem: new NodeFileSystem(),
      queryParser: new QueryParser(),
    });

    try {
      // Execute the script
      await runner.runScript(absoluteScriptPath, cliOptions);
      return CommandResults.success();
    } catch (error) {
      if (error instanceof Error) {
        return CommandResults.error(error);
      }
      return CommandResults.failure(String(error));
    }
  }
}