import { join } from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function isDev(): boolean {
  return process.env.NODE_ENV === 'development' || !app.isPackaged;
}

export function getPreloadPath(): string {
  if (isDev()) {
    // In development, preload is in electron-preload package
    return join(__dirname, '../../../../electron-preload/dist/preload.js');
  }
  // In production, it's bundled in the same directory
  return join(__dirname, '../preload.js');
}

export function getRendererPath(): string {
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