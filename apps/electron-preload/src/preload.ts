import { contextBridge, ipcRenderer } from 'electron';

// Manually expose electronTRPC for version 0.5.2
contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (message: any) => ipcRenderer.send('electron-trpc.main', message),
  onMessage: (callback: (message: any) => void) => 
    ipcRenderer.on('electron-trpc.renderer', (_event, message) => callback(message)),
});

// Expose additional APIs if needed
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});