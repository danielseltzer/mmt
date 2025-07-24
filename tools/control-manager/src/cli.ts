#!/usr/bin/env node

import { Command } from 'commander';
import { MMTControlManager } from './control-manager.js';

interface StartOptions {
  config: string;
  apiOnly?: boolean;
  webOnly?: boolean;
}

interface StopOptions {
  apiOnly?: boolean;
  webOnly?: boolean;
}

const program = new Command();

program
  .name('mmt-control')
  .description('MMT Control Manager - Start and stop MMT services')
  .version('0.1.0');

program
  .command('start')
  .description('Start MMT services')
  .requiredOption('-c, --config <path>', 'Path to config YAML file (required - no defaults)')
  .option('--api-only', 'Start only the API server')
  .option('--web-only', 'Start only the web server')
  .addHelpText('after', '\nExample:\n  pnpm dev --config dev-config.yaml\n  pnpm dev --config personal-vault-config.yaml')
  .action(async (options: StartOptions) => {
    const manager = new MMTControlManager({
      configPath: options.config
    });

    let cleanupRegistered = false;
    let isExiting = false;

    // Register cleanup handlers BEFORE any async operations
    const cleanup = async (signal?: string) => {
      if (isExiting) return;
      isExiting = true;
      
      console.log(`\nShutting down${signal ? ` (${signal})` : ''}...`);
      try {
        await manager.stopAll();
      } catch (cleanupError) {
        console.error('Error during cleanup:', cleanupError);
      }
      process.exit(signal ? 0 : 1);
    };

    // Register signal handlers immediately
    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      cleanup();
    });
    process.on('unhandledRejection', (reason) => {
      console.error('Unhandled rejection:', reason);
      cleanup();
    });
    cleanupRegistered = true;

    try {
      await manager.init(options.config);
      
      if (options.apiOnly) {
        await manager.startAPI();
      } else if (options.webOnly) {
        await manager.startWeb();
      } else {
        await manager.startAll();
      }
      
      // Keep the process alive - handlers already registered above
      
    } catch (error) {
      console.error('Failed to start services:', error);
      await cleanup();
    }
  });

program
  .command('stop')
  .description('Stop MMT services')
  .option('--api-only', 'Stop only the API server')
  .option('--web-only', 'Stop only the web server')
  .action(async (options: StopOptions) => {
    console.log('Stop command not implemented yet - use Ctrl+C for now');
  });

// Custom error handling
program.configureOutput({
  outputError: (str, write) => {
    if (str.includes('required option') && str.includes('--config')) {
      console.error('\n❌ Error: Config file is required (no defaults)\n');
      console.error('Usage: pnpm dev --config <path-to-config.yaml>\n');
      console.error('Examples:');
      console.error('  pnpm dev --config dev-config.yaml');
      console.error('  pnpm dev --config personal-vault-config.yaml\n');
      console.error('Create a config file with:');
      console.error('  vaultPath: /absolute/path/to/vault');
      console.error('  indexPath: /absolute/path/to/index\n');
    } else {
      write(str);
    }
  }
});

program.parse();