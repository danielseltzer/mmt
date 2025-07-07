import { test } from '@playwright/test';
import { _electron as electron } from '@playwright/test';
import { join } from 'path';

test('minimal electron test', async () => {
  // Simple test that just launches electron with our main file
  const electronApp = await electron.launch({
    args: ['apps/electron-main/dist/index.js'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      ELECTRON_PRELOAD_PATH: join(process.cwd(), 'apps/electron-preload/dist/preload.js'),
      MMT_VAULT_PATH: '/tmp/test-vault',
      MMT_INDEX_PATH: '/tmp/test-index',
    },
  });

  const window = await electronApp.firstWindow();
  console.log('Window title:', await window.title());
  
  await electronApp.close();
});