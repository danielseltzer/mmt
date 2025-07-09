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
  .requiredOption('-c, --config <path>', 'Config file path (required)')
  .option('--api-only', 'Start only the API server')
  .option('--web-only', 'Start only the web server')
  .action(async (options: StartOptions) => {
    const manager = new MMTControlManager({
      configPath: options.config
    });

    try {
      await manager.init(options.config);
      
      if (options.apiOnly) {
        await manager.startAPI();
      } else if (options.webOnly) {
        await manager.startWeb();
      } else {
        await manager.startAll();
      }
      
      // Keep the process alive
      process.on('SIGINT', async () => {
        console.log('\nShutting down...');
        await manager.stopAll();
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Failed to start services:', error);
      process.exit(1);
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

program.parse();