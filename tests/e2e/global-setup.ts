import { MMTControlManager } from '../../tools/control-manager/src/control-manager';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let manager: MMTControlManager;

async function globalSetup() {
  console.log('Setting up MMT services for E2E tests...');
  
  // Create control manager with test config
  manager = new MMTControlManager({
    apiPort: 3001,
    webPort: 5173,
    configPath: path.join(__dirname, 'test-config.yaml'),
    silent: false  // Show output during tests for debugging
  });
  
  try {
    // Initialize with test config
    await manager.init();
    
    // Start all services
    await manager.startAll();
    
    console.log('MMT services are ready!');
    console.log(`API: ${manager.getAPIUrl()}`);
    console.log(`Web: ${manager.getWebUrl()}`);
    
  } catch (error) {
    console.error('Failed to start MMT services:', error);
    throw error;
  }
  
  // Return teardown function
  return async () => {
    console.log('Tearing down MMT services...');
    await manager.stopAll();
  };
}

export default globalSetup;