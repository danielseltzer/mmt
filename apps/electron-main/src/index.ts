import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'path';
import { createRequire } from 'module';
import { appRouter } from './api/router.js';
import { createContext } from './api/context.js';
import { createApplicationMenu } from './menu.js';
import { isDev, isTest, getPreloadPath, getRendererPath } from './utils/paths.js';

// electron-trpc doesn't support ESM properly in any version (tested 0.5.2, 0.7.1, 1.0.0-alpha)
// It tries to import named exports from 'electron' which is a CommonJS module
// Work around by using CommonJS require
const require = createRequire(import.meta.url);
const { createIPCHandler } = require('electron-trpc/main');

// Export types for renderer
export type { AppRouter } from './api/router.js';


let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  // Check if running in test mode with offscreen flag
  const isOffscreenTest = process.argv.includes('--test-offscreen');
  
  const preloadPath = getPreloadPath();
  console.log('Using preload script:', preloadPath);
  
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    x: isOffscreenTest ? -10000 : undefined, // Position off-screen in test mode
    y: isOffscreenTest ? -10000 : undefined,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  // Set up IPC handler
  try {
    // Get config (for now, use test values - in production, load from args or config file)
    const config = {
      vaultPath: process.env.MMT_VAULT_PATH || join(app.getPath('documents'), 'mmt-vault'),
      indexPath: process.env.MMT_INDEX_PATH || join(app.getPath('userData'), 'mmt-index'),
      apiPort: 3001,
      webPort: 5173,
    };
    
    // Create context with all services
    const context = await createContext(config);
    
    // Set up IPC handler
    createIPCHandler({
      router: appRouter,
      createContext: () => Promise.resolve(context),
      windows: [mainWindow],
    });
  } catch (error) {
    console.error('Failed to set up IPC handler:', error);
  }

  // Set up application menu
  const menu = createApplicationMenu(mainWindow);
  Menu.setApplicationMenu(menu);

  // Load the app
  if (isDev() && process.env.NODE_ENV !== 'test') {
    await mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    const rendererPath = getRendererPath();
    console.log('Loading renderer from:', rendererPath);
    await mainWindow.loadFile(rendererPath);
  }

  // Show window when ready (unless in offscreen test mode)
  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--test-offscreen')) {
      mainWindow?.show();
    }
  });

  // Log any console messages from renderer
  if (isTest()) {
    mainWindow.webContents.on('console-message', (event, level, message) => {
      console.log('Renderer console:', level, message);
    });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
void app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});