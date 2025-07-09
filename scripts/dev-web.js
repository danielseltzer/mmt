#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Starting MMT Web Development Environment...\n');

// Start API server
console.log('Starting API server on http://localhost:3001...');
const apiServer = spawn('pnpm', ['--filter', '@mmt/api-server', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true
});

// Give API server time to start
setTimeout(() => {
  console.log('\nStarting web app on http://localhost:5173...');
  const webServer = spawn('pnpm', ['--filter', '@mmt/web', 'dev'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true
  });
  
  // Handle cleanup
  const cleanup = () => {
    console.log('\nShutting down servers...');
    apiServer.kill();
    webServer.kill();
    process.exit();
  };
  
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}, 2000);

apiServer.on('error', (err) => {
  console.error('Failed to start API server:', err);
  process.exit(1);
});