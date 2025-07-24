import { beforeAll, afterAll } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

let apiServer: ChildProcess;
let testVaultPath: string;
let testConfigPath: string;

beforeAll(async () => {
  // Create test vault and config
  testVaultPath = join(tmpdir(), `mmt-api-test-vault-${Date.now()}`);
  await fs.mkdir(testVaultPath, { recursive: true });
  
  // Create test config
  const testConfig = {
    vaultPath: testVaultPath,
    indexPath: join(tmpdir(), `mmt-api-test-index-${Date.now()}`),
    apiPort: 3001,
    webPort: 3002,  // Required by config schema
    fileWatching: {
      enabled: true,
      debounceMs: 50
    }
  };
  
  testConfigPath = join(tmpdir(), `mmt-api-test-config-${Date.now()}.json`);
  await fs.writeFile(testConfigPath, JSON.stringify(testConfig, null, 2));
  
  // Export vault path for tests to use
  process.env.TEST_VAULT_PATH = testVaultPath;
  
  // Start API server
  console.log('Starting API server for integration tests...');
  apiServer = spawn('node', [
    join(process.cwd(), 'dist/server.js'),
    '--config',
    testConfigPath
  ], {
    cwd: join(process.cwd(), 'apps/api-server'),
    stdio: 'pipe',
    env: { ...process.env, NODE_ENV: 'test' }
  });
  
  // Wait for server to be ready
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('API server failed to start within 10 seconds'));
    }, 10000);
    
    let serverReady = false;
    apiServer.stdout?.on('data', (data) => {
      const output = data.toString();
      if (!serverReady) {
        console.log('API Server:', output);
      }
      if (output.includes('MMT API Server running')) {
        serverReady = true;
        clearTimeout(timeout);
        resolve();
      }
    });
    
    apiServer.stderr?.on('data', (data) => {
      console.error('API Server Error:', data.toString());
    });
    
    apiServer.stdout?.on('data', (data) => {
      console.log('API Server Output:', data.toString());
    });
    
    apiServer.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
  
  console.log('API server started successfully');
});

afterAll(async () => {
  // Stop API server
  if (apiServer) {
    apiServer.kill();
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Cleanup test files
  if (testVaultPath) {
    await fs.rm(testVaultPath, { recursive: true, force: true });
  }
  if (testConfigPath) {
    await fs.unlink(testConfigPath).catch(() => {});
  }
});