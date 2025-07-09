import { ChildProcess, spawn } from 'child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

export interface TestDocument {
  name: string;
  content: string;
}

export interface TestEnvironment {
  configPath: string;
  vaultPath: string;
  indexPath: string;
  apiServer: ChildProcess;
  webServer: ChildProcess;
}

export async function setupTestEnvironment(documents: TestDocument[]): Promise<TestEnvironment> {
  // Create test directories
  const tempDir = mkdtempSync(join(tmpdir(), 'mmt-e2e-'));
  const vaultPath = join(tempDir, 'vault');
  const indexPath = join(tempDir, 'index');
  
  mkdirSync(vaultPath, { recursive: true });
  mkdirSync(indexPath, { recursive: true });
  
  // Create test config
  const configPath = join(tempDir, 'test.config.yaml');
  writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}`);
  
  // Write test documents
  for (const doc of documents) {
    writeFileSync(join(vaultPath, doc.name), doc.content);
  }
  
  // Start API server
  const apiServer = spawn('node', ['apps/api-server/src/server.js'], {
    env: { ...process.env, MMT_CONFIG: configPath, PORT: '3001' },
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  // Start web server
  const webServer = spawn('pnpm', ['--filter', '@mmt/web', 'dev'], {
    env: { ...process.env, PORT: '5173' },
    cwd: process.cwd(),
    stdio: 'pipe'
  });
  
  // Wait for servers to be ready
  await waitForServer('http://localhost:3001/health', 10000);
  await waitForServer('http://localhost:5173', 10000);
  
  return {
    configPath,
    vaultPath,
    indexPath,
    apiServer,
    webServer
  };
}

export function teardownTestEnvironment(env: TestEnvironment): void {
  if (env.apiServer) env.apiServer.kill();
  if (env.webServer) env.webServer.kill();
}

async function waitForServer(url: string, timeout: number): Promise<void> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      // Use dynamic import for node-fetch
      const { default: fetch } = await import('node-fetch');
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  throw new Error(`Server at ${url} did not start within ${timeout}ms`);
}