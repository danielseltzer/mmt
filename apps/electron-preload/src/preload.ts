import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC methods for tRPC
contextBridge.exposeInMainWorld('electronTRPC', {
  sendMessage: (channel: string, data: any) => ipcRenderer.send(channel, data),
  invoke: (channel: string, data: any) => ipcRenderer.invoke(channel, data),
  on: (channel: string, callback: (event: any, ...args: any[]) => void) => {
    ipcRenderer.on(channel, callback);
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  },
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