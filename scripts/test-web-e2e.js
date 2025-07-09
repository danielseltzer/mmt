#!/usr/bin/env node

import { spawn } from 'child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

async function runE2ETests() {
  console.log('🧪 Setting up E2E test environment...\n');
  
  // Create test directories
  const tempDir = mkdtempSync(join(tmpdir(), 'mmt-e2e-'));
  const vaultPath = join(tempDir, 'vault');
  const indexPath = join(tempDir, 'index');
  
  mkdirSync(vaultPath, { recursive: true });
  mkdirSync(indexPath, { recursive: true });
  
  // Create test config
  const configPath = join(tempDir, 'test.config.yaml');
  writeFileSync(configPath, `vaultPath: ${vaultPath}\nindexPath: ${indexPath}`);
  
  // Create test documents
  console.log('📝 Creating test documents...');
  writeFileSync(join(vaultPath, 'welcome.md'), `# Welcome to MMT\n\nTest document for E2E tests.\n\nTags: #welcome #test`);
  writeFileSync(join(vaultPath, 'todo.md'), `# Todo List\n\n- [x] Create tests\n- [ ] Run tests\n\nTags: #todo #tasks`);
  writeFileSync(join(vaultPath, 'project.md'), `# Project Overview\n\nThis is a test project.\n\nTags: #project #docs`);
  
  // Start API server
  console.log('\n🚀 Starting API server...');
  const apiServer = spawn('node', ['apps/api-server/src/server.js'], {
    env: { ...process.env, MMT_CONFIG: configPath, PORT: '3001' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  apiServer.stdout.on('data', (data) => {
    console.log(`[API] ${data.toString().trim()}`);
  });
  
  apiServer.stderr.on('data', (data) => {
    console.error(`[API ERROR] ${data.toString().trim()}`);
  });
  
  // Wait for API server to start
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Start web server
  console.log('\n🌐 Starting web server...');
  const webServer = spawn('pnpm', ['--filter', '@mmt/web', 'dev'], {
    env: { ...process.env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let webServerReady = false;
  webServer.stdout.on('data', (data) => {
    const output = data.toString();
    if (output.includes('Local:') && output.includes('5173')) {
      webServerReady = true;
    }
    console.log(`[WEB] ${output.trim()}`);
  });
  
  webServer.stderr.on('data', (data) => {
    console.error(`[WEB ERROR] ${data.toString().trim()}`);
  });
  
  // Wait for web server to be ready
  console.log('\n⏳ Waiting for servers to be ready...');
  let waited = 0;
  while (!webServerReady && waited < 30000) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    waited += 1000;
  }
  
  if (!webServerReady) {
    console.error('❌ Web server did not start in time');
    apiServer.kill();
    webServer.kill();
    process.exit(1);
  }
  
  console.log('\n✅ Servers are ready! Running Playwright tests...\n');
  
  // Run Playwright tests
  const tests = spawn('npx', ['playwright', 'test', '--config=playwright-web.config.ts'], {
    stdio: 'inherit'
  });
  
  const cleanup = () => {
    console.log('\n🧹 Cleaning up...');
    apiServer.kill();
    webServer.kill();
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {}
  };
  
  tests.on('close', (code) => {
    cleanup();
    process.exit(code);
  });
  
  process.on('SIGINT', () => {
    cleanup();
    process.exit(1);
  });
}

runE2ETests().catch(error => {
  console.error('❌ Test setup failed:', error);
  process.exit(1);
});