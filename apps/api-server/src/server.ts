import { createApp } from './app.js';
import { ConfigService } from '@mmt/config';

async function start(): Promise<void> {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const configIndex = args.indexOf('--config');
    
    if (configIndex === -1 || !args[configIndex + 1]) {
      console.error('Error: --config flag is required');
      console.error('Usage: node server.js --config <path-to-config.yaml>');
      process.exit(1);
    }
    
    const configPath = args[configIndex + 1];
    
    // Load config
    const configService = new ConfigService();
    const config = await configService.load(configPath);
    
    // Create and start app
    const app = await createApp(config);
    
    app.listen(config.apiPort, () => {
      console.log(`MMT API Server running on http://localhost:${config.apiPort}`);
      console.log(`Vault: ${config.vaultPath}`);
      console.log(`Index: ${config.indexPath}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();