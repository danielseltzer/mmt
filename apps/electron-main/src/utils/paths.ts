import { join } from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}

export function getPreloadPath(): string {
  if (isTest()) {
    // In test, preload is built to apps/electron-preload/dist
    return process.env.ELECTRON_PRELOAD_PATH || join(__dirname, '../../../../apps/electron-preload/dist/preload.js');
  }
  if (isDev()) {
    // In development, preload is in electron-preload package
    return join(__dirname, '../../../../apps/electron-preload/dist/preload.js');
  }
  // In production, it's bundled in the same directory
  return join(__dirname, '../preload.js');
}

export function getRendererPath(): string {
  if (isTest()) {
    // In test, renderer is built to apps/electron-renderer/dist
    return join(__dirname, '../../../../apps/electron-renderer/dist/index.html');
  }
  if (isDev()) {
    throw new Error('Use dev server URL in development');
  }
  // In production, renderer files are bundled
  return join(__dirname, '../renderer/index.html');
}

export function getResourcesPath(): string {
  if (isDev()) {
    return join(__dirname, '../../../../resources');
  }
  return join(process.resourcesPath, 'resources');
}