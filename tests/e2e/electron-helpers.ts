import { _electron as electron, ElectronApplication, Page } from '@playwright/test';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { tmpdir } from 'os';
import { TestVaultGenerator, createTestConfig } from './test-vault-generator';
import { rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface TestContext {
  app: ElectronApplication;
  page: Page;
  vaultGenerator: TestVaultGenerator;
  configPath: string;
}

export async function launchElectronWithTestVault(): Promise<TestContext> {
  // Create test vault
  const vaultGenerator = new TestVaultGenerator();
  vaultGenerator.generateVault();
  
  // Create test config
  const configPath = createTestConfig(vaultGenerator.getVaultPath());
  
  // Path to the main entry point
  const mainPath = join(__dirname, '../../apps/electron-main/dist/index.js');
  
  console.log('[E2E] Launching Electron app...');
  console.log('[E2E] Main path:', mainPath);
  console.log('[E2E] Config path:', configPath);
  console.log('[E2E] Vault path:', vaultGenerator.getVaultPath());
  
  // Launch Electron with config
  const app = await electron.launch({
    args: [mainPath, '--config', configPath, '--test-offscreen'],
    timeout: 60000, // Increase timeout to 60 seconds
    env: {
      ...process.env,
      NODE_ENV: 'test',
      MMT_E2E_TEST: 'true',
      // Set the vault and index paths via environment variables
      MMT_VAULT_PATH: vaultGenerator.getVaultPath(),
      MMT_INDEX_PATH: join(tmpdir(), `mmt-e2e-index-${Date.now()}`),
    },
  });

  console.log('[E2E] Electron app launched successfully');

  // Direct Electron console to Node terminal for debugging
  app.on('console', (msg) => console.log(`[Electron]: ${msg.text()}`));
  
  // Handle console errors
  app.on('window', async (page) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('[Renderer Error]:', msg.text());
      }
    });
    page.on('pageerror', (error) => {
      console.error('[Page Error]:', error);
    });
  });
  
  // Wait for and get the first window
  console.log('[E2E] Waiting for first window...');
  const page = await app.firstWindow();
  console.log('[E2E] First window obtained');
  
  // Wait for the app to fully load
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000); // Give extra time for app initialization

  return { app, page, vaultGenerator, configPath };
}

export async function closeElectronAndCleanup(context: TestContext) {
  await context.app.close();
  context.vaultGenerator.cleanup();
  rmSync(context.configPath, { force: true });
}