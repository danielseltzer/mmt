import { spawn, type ChildProcess } from 'child_process';
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let apiServer: ChildProcess | null = null;
let webServer: ChildProcess | null = null;
let sharedTempDir: string;
const TEST_API_PORT = 3001;
const TEST_WEB_PORT = 3002;

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
webPort: ${TEST_WEB_PORT}
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
  
  // Wait for API server to be ready
  const apiReady = await waitForServer(TEST_API_PORT);
  if (!apiReady) {
    throw new Error('Shared API server failed to start');
  }
  
  // Start web server with proxy to API
  console.log(`Starting shared web server on port ${TEST_WEB_PORT}...`);
  webServer = spawn('pnpm', [
    '--filter', '@mmt/web',
    'dev',
    '--port', TEST_WEB_PORT.toString(),
    '--strictPort'
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { 
      ...process.env, 
      MMT_API_PORT: TEST_API_PORT.toString()  // Tell vite proxy where API server is
    },
  });
  
  webServer.stdout?.on('data', (data) => {
    const output = data.toString().trim();
    if (output.includes('ready in') || output.includes('Local:')) {
      console.log('Shared web server is ready');
    }
    console.log(`[Shared Web] ${output}`);
  });
  
  webServer.stderr?.on('data', (data) => {
    console.error(`[Shared Web ERROR] ${data.toString().trim()}`);
  });
  
  // Wait for web server to be ready (it won't have a /health endpoint, so check for process)
  await new Promise(resolve => setTimeout(resolve, 5000)); // Give vite time to start
  
  // Tests will now use the real web server
  process.env.TEST_WEB_URL = `http://localhost:${TEST_WEB_PORT}`;
  process.env.MMT_SHARED_VAULT = vaultPath;
  process.env.MMT_SHARED_INDEX = indexPath;
}

export async function teardown() {
  console.log('Cleaning up shared integration test environment...');
  
  // Kill both servers
  if (webServer) {
    webServer.kill();
  }
  if (apiServer) {
    apiServer.kill();
  }
  
  // Wait a bit for servers to shut down
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Clean up shared temp directory
  if (sharedTempDir) {
    try {
      rmSync(sharedTempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up shared temp directory:', error);
    }
  }
}