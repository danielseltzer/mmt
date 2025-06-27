#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Start the Vite dev server for renderer
console.log('Starting Vite dev server...');
const viteProcess = spawn('pnpm', ['--filter', '@mmt/electron-renderer', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

// Wait a bit for Vite to start
setTimeout(() => {
  console.log('Starting Electron...');
  
  // Start Electron with the main process
  const electronProcess = spawn('npx', [
    'electron',
    join(__dirname, '../apps/electron-main/dist/main-dev.js')
  ], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  electronProcess.on('close', () => {
    viteProcess.kill();
    process.exit();
  });
}, 3000);

process.on('SIGINT', () => {
  viteProcess.kill();
  process.exit();
});