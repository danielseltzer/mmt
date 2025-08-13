import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let apiServer: ChildProcess | null = null;
let sharedTempDir: string;
const TEST_API_PORT = 3001;

// Wait for server to be ready
async function waitForServer(port: number, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`);
      if (response.ok) {
        console.log('Shared API server is ready');
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

export async function setup() {
  console.log('Setting up shared integration test environment...');
  
  // Create shared temp directory for the API server
  sharedTempDir = mkdtempSync(join(tmpdir(), 'mmt-integration-shared-'));
  const vaultPath = join(sharedTempDir, 'vault');
  const indexPath = join(sharedTempDir, 'index');
  
  mkdirSync(vaultPath, { recursive: true });
  mkdirSync(indexPath, { recursive: true });
  
  // Create shared test config
  const configPath = join(sharedTempDir, 'test.config.yaml');
  writeFileSync(configPath, `
vaults:
  - name: 'TestVault'
    path: ${vaultPath}
    indexPath: ${indexPath}
    fileWatching:
      enabled: true
      debounceMs: 50
apiPort: ${TEST_API_PORT}
webPort: 8002
`);
  
  // Start API server once for all tests
  console.log(`Starting shared API server on port ${TEST_API_PORT}...`);
  apiServer = spawn('pnpm', [
    '--filter', '@mmt/api-server',
    'dev',
    '--',
    '--config', configPath
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, PORT: TEST_API_PORT.toString() },
  });
  
  apiServer.stdout?.on('data', (data) => {
    console.log(`[Shared API] ${data.toString().trim()}`);
  });
  
  apiServer.stderr?.on('data', (data) => {
    console.error(`[Shared API ERROR] ${data.toString().trim()}`);
  });
  
  // Wait for server to be ready
  const isReady = await waitForServer(TEST_API_PORT);
  if (!isReady) {
    throw new Error('Shared API server failed to start');
  }
  
  // Set environment variable for all tests
  process.env.VITE_API_URL = `http://localhost:${TEST_API_PORT}`;
  process.env.MMT_SHARED_VAULT = vaultPath;
  process.env.MMT_SHARED_INDEX = indexPath;
}

export async function teardown() {
  console.log('Cleaning up shared integration test environment...');
  
  // Kill API server
  if (apiServer) {
    apiServer.kill();
    // Wait a bit for server to shut down
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Clean up shared temp directory
  if (sharedTempDir) {
    try {
      rmSync(sharedTempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up shared temp directory:', error);
    }
  }
}