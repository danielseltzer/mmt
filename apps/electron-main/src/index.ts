import { app, BrowserWindow, Menu, shell } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createIPCHandler } from 'electron-trpc/main';
import { appRouter } from './api/router.js';
import { createContext } from './api/context.js';
import { createApplicationMenu } from './menu.js';
import { isDev, isTest, getPreloadPath, getRendererPath } from './utils/paths.js';
import { ConfigService } from '@mmt/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: getPreloadPath(),
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
    };
    
    // Create context with all services
    const context = await createContext(config);
    
    // Set up IPC handler
    createIPCHandler({
      router: appRouter,
      createContext: async () => context,
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

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
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
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// App event handlers
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
});