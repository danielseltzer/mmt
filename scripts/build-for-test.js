#!/usr/bin/env node
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

async function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: true,
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function build() {
  console.log('Creating dist directories...');
  await mkdir(join(rootDir, 'dist/main'), { recursive: true });
  await mkdir(join(rootDir, 'dist/preload'), { recursive: true });
  await mkdir(join(rootDir, 'dist/renderer'), { recursive: true });

  console.log('Building main process...');
  await runCommand('pnpm', ['--filter', '@mmt/electron-main', 'build'], rootDir);

  console.log('Building preload script...');
  await runCommand('pnpm', ['--filter', '@mmt/electron-preload', 'build'], rootDir);

  console.log('Building renderer...');
  await runCommand('pnpm', ['--filter', '@mmt/electron-renderer', 'build'], rootDir);

  console.log('Copying built files to dist...');
  await runCommand('cp', ['-r', 'apps/electron-main/dist/*', 'dist/main/'], rootDir);
  await runCommand('cp', ['-r', 'apps/electron-preload/dist/*', 'dist/preload/'], rootDir);
  await runCommand('cp', ['-r', 'apps/electron-renderer/dist/*', 'dist/renderer/'], rootDir);

  console.log('Build complete!');
}

build().catch(console.error);