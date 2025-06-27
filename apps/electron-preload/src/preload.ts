import { contextBridge } from 'electron';
import { exposeElectronTRPC } from 'electron-trpc/preload';

// Expose tRPC IPC bridge
exposeElectronTRPC();

// Expose additional APIs if needed
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});