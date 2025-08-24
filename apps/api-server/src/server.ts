import { createApp } from './app.js';
import { ConfigService } from '@mmt/config';
import { Loggers } from '@mmt/logger';

async function start(): Promise<void> {
  const logger = Loggers.apiServer();
  
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const configIndex = args.indexOf('--config');
    
    if (configIndex === -1 || !args[configIndex + 1]) {
      logger.error('Error: --config flag is required');
      logger.error('Usage: node server.js --config <path-to-config.yaml>');
      process.exit(1);
    }
    
    const configPath = args[configIndex + 1];
    
    // Load config
    const configService = new ConfigService();
    const config = await configService.load(configPath);
    
    // Create and start app
    const app = await createApp(config);
    
    app.listen(config.apiPort, () => {
      logger.info(`MMT API Server running on http://localhost:${config.apiPort}`);
      logger.info(`Vaults configured: ${config.vaults.length}`);
      config.vaults.forEach((vault, index) => {
        logger.info(`  ${index === 0 ? '[Active]' : '       '} ${vault.name}: ${vault.path}`);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

start();