#!/usr/bin/env node

import { Command } from 'commander';
import { MMTControlManager } from './control-manager.js';

interface StartOptions {
  config: string;
}

interface StopOptions {
  // No options needed for stop
}

const program = new Command();

program
  .name('mmt')
  .description('MMT - Markdown Management Toolkit')
  .version('0.1.0');

program
  .command('start')
  .description('Start MMT services (API and Web)')
  .requiredOption('-c, --config <path>', 'Path to config YAML file (required - no defaults)')
  .addHelpText('after', '\nExample:\n  ./bin/mmt start --config dev-config.yaml\n  ./bin/mmt start --config personal-vault-config.yaml')
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
      await manager.startAll();
      
      // Keep the process alive - handlers already registered above
      
    } catch (error) {
      console.error('Failed to start services:', error);
      await cleanup();
    }
  });

program
  .command('stop')
  .description('Stop all MMT services')
  .action(async () => {
    try {
      await MMTControlManager.stopByPid();
      console.log('✓ MMT services stopped successfully');
    } catch (error: any) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show status of MMT services')
  .action(async () => {
    if (MMTControlManager.isRunning()) {
      console.log('✓ MMT is running');
      // Could add more details like checking individual ports
    } else {
      console.log('✗ MMT is not running');
    }
  });

// Custom error handling
program.configureOutput({
  outputError: (str, write) => {
    if (str.includes('required option') && str.includes('--config')) {
      console.error('\n❌ Error: Config file is required (no defaults)\n');
      console.error('Usage: ./bin/mmt start --config <path-to-config.yaml>\n');
      console.error('Examples:');
      console.error('  ./bin/mmt start --config dev-config.yaml');
      console.error('  ./bin/mmt start --config personal-vault-config.yaml\n');
      console.error('Create a config file with:');
      console.error('  vaultPath: /absolute/path/to/vault');
      console.error('  indexPath: /absolute/path/to/index');
      console.error('  apiPort: 3001');
      console.error('  webPort: 5173\n');
    } else {
      write(str);
    }
  }
});

program.parse();