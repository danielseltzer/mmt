#!/usr/bin/env node

import { Command } from 'commander';
import { MMTControlManager } from './control-manager.js';
import { Loggers } from '@mmt/logger';

const logger = Loggers.control();

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
  .addHelpText('after', '\nExample:\n  ./bin/mmt start --config config/test/dev-config.yaml\n  ./bin/mmt start --config config/examples/personal-vault-config.yaml')
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
      
      logger.info(`\nShutting down${signal ? ` (${signal})` : ''}...`);
      try {
        await manager.stopAll();
      } catch (cleanupError) {
        logger.error('Error during cleanup:', cleanupError);
      }
      process.exit(signal ? 0 : 1);
    };

    // Register signal handlers immediately
    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      cleanup();
    });
    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection:', reason);
      cleanup();
    });
    cleanupRegistered = true;

    try {
      await manager.init(options.config);
      await manager.startAll();
      
      // Keep the process alive - handlers already registered above
      
    } catch (error) {
      logger.error('Failed to start services:', error);
      await cleanup();
    }
  });

program
  .command('stop')
  .description('Stop all MMT services')
  .action(async () => {
    try {
      await MMTControlManager.stopByPid();
      logger.info('✓ MMT services stopped successfully');
    } catch (error: any) {
      logger.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Show status of MMT services')
  .option('-v, --verbose', 'Show detailed status')
  .action(async (options) => {
    const isRunning = MMTControlManager.isRunning();
    
    if (isRunning) {
      logger.info('✓ MMT is running');
    } else {
      logger.info('✗ MMT is not running');
    }
    
    if (options.verbose || isRunning) {
      // Import DockerManager to check Qdrant status
      const { DockerManager } = await import('./docker-manager.js');
      
      // Check Docker availability
      if (DockerManager.isDockerAvailable()) {
        const qdrantStatus = DockerManager.getContainerStatus('mmt-qdrant');
        const qdrantHealth = qdrantStatus === 'running' 
          ? await DockerManager.getQdrantHealth() 
          : null;
        
        logger.info('\nDocker Services:');
        logger.info(`  Qdrant: ${qdrantStatus}${qdrantHealth?.healthy ? ' (healthy)' : qdrantHealth ? ' (unhealthy)' : ''}`);
      } else {
        logger.info('\nDocker: not available');
      }
    }
  });

// Custom error handling
program.configureOutput({
  outputError: (str, write) => {
    if (str.includes('required option') && str.includes('--config')) {
      logger.error('\n❌ Error: Config file is required (no defaults)\n');
      logger.error('Usage: ./bin/mmt start --config <path-to-config.yaml>\n');
      logger.error('Examples:');
      logger.error('  ./bin/mmt start --config config/test/dev-config.yaml');
      logger.error('  ./bin/mmt start --config config/examples/personal-vault-config.yaml\n');
      logger.error('Create a config file with:');
      logger.error('  vaultPath: /absolute/path/to/vault');
      logger.error('  indexPath: /absolute/path/to/index');
      logger.error('  apiPort: 3001');
      logger.error('  webPort: 5173\n');
    } else {
      write(str);
    }
  }
});

program.parse();