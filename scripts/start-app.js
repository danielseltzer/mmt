#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting MMT Electron App...\n');

// Start the Vite dev server for renderer
console.log('📦 Starting Vite dev server...');
const viteProcess = spawn('pnpm', ['--filter', '@mmt/electron-renderer', 'dev'], {
  stdio: 'pipe',
  shell: true,
});

let viteReady = false;

viteProcess.stdout.on('data', (data) => {
  const output = data.toString();
  if (!viteReady && output.includes('ready in')) {
    viteReady = true;
    console.log('✅ Vite dev server is ready at http://localhost:5173\n');
    startElectron();
  }
});

viteProcess.stderr.on('data', (data) => {
  console.error('Vite error:', data.toString());
});

function startElectron() {
  console.log('🖥️  Starting Electron app...');
  
  // Start Electron with the main process
  const electronProcess = spawn('npx', [
    'electron',
    join(__dirname, '../apps/electron-main/dist/main-simple.js')
  ], {
    stdio: 'pipe',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  electronProcess.stdout.on('data', (data) => {
    const output = data.toString();
    // Filter out the noisy DevTools errors
    if (!output.includes('ERROR:CONSOLE') && !output.includes('Autofill')) {
      console.log(output);
    }
  });

  electronProcess.stderr.on('data', (data) => {
    const output = data.toString();
    // Filter out the noisy DevTools errors
    if (!output.includes('ERROR:CONSOLE') && !output.includes('Autofill')) {
      console.error(output);
    }
  });

  console.log(`
✅ App should now be running!

Look for a window titled "Markdown Management Toolkit"

If you don't see it:
- Check your dock/taskbar
- Try Alt+Tab (Windows/Linux) or Cmd+Tab (Mac)
- Check if it opened behind other windows

Press Ctrl+C to stop the app.
`);

  electronProcess.on('close', (code) => {
    console.log('Electron app closed');
    viteProcess.kill();
    process.exit(code);
  });
}

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  process.exit();
});