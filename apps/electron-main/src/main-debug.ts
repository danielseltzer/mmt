import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;

// Add comprehensive error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

async function createWindow() {
  try {
    console.log('📍 Creating window...');
    console.log('📍 __dirname:', __dirname);
    
    const preloadPath = join(__dirname, '../../electron-preload/dist/preload.js');
    console.log('📍 Checking preload path:', preloadPath);
    console.log('📍 Preload exists:', existsSync(preloadPath));
    
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
      },
      show: false,
    });

    console.log('📍 Window created, loading URL...');

    // Handle load errors
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('❌ Failed to load:', errorCode, errorDescription);
    });

    mainWindow.webContents.on('crashed' as any, () => {
      console.error('❌ Renderer crashed');
    });

    mainWindow.webContents.on('render-process-gone' as any, (event: any, details: any) => {
      console.error('❌ Render process gone:', details);
    });

    // Log console messages from renderer
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer ${level}] ${message}${sourceId ? ` (${sourceId}:${line})` : ''}`);
    });

    // Load the dev server
    await mainWindow.loadURL('http://localhost:5173');
    console.log('✅ URL loaded successfully');
    
    // Open DevTools
    mainWindow.webContents.openDevTools();
    
    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      console.log('📍 Window ready to show');
      mainWindow?.show();
      console.log('📍 Window visible:', mainWindow?.isVisible());
      console.log('📍 Window bounds:', mainWindow?.getBounds());
    });
    
    // Force show window after a delay as fallback
    setTimeout(() => {
      if (mainWindow && !mainWindow.isVisible()) {
        console.log('⚠️  Force showing window after timeout');
        mainWindow.show();
        console.log('📍 Window forced visible:', mainWindow.isVisible());
      }
    }, 3000);

    // Handle window closed
    mainWindow.on('closed', () => {
      console.log('📍 Window closed');
      mainWindow = null;
    });

  } catch (error) {
    console.error('❌ Error creating window:', error);
    app.quit();
  }
}

// App event handlers
app.whenReady().then(() => {
  console.log('📍 App ready, creating window...');
  createWindow();
}).catch((error) => {
  console.error('❌ App ready error:', error);
  app.quit();
});

app.on('window-all-closed', () => {
  console.log('📍 All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('📍 App quitting...');
});

app.on('will-quit', (event) => {
  console.log('📍 App will quit');
});

console.log('📍 Main process started');