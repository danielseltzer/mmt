import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function launchElectron(): Promise<{
  app: ElectronApplication;
  page: Page;
}> {
  // First, we need to build the app
  const electronExecutable = electron;
  
  // Path to the main entry point
  const mainPath = join(__dirname, '../../dist/main/index.js');
  
  // Ensure the preload path is correctly set
  process.env.ELECTRON_PRELOAD_PATH = join(__dirname, '../../dist/preload/preload.js');
  
  // Launch Electron
  const app = await electronExecutable.launch({
    args: [mainPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  // Get the first window
  const page = await app.firstWindow();
  
  // Wait for the window to be visible
  await page.waitForLoadState('domcontentloaded');

  return { app, page };
}

export async function closeElectron(app: ElectronApplication) {
  await app.close();
}