import { contextBridge, ipcRenderer } from 'electron';

// Expose IPC for electron-trpc
// This matches what electron-trpc expects for the ipcLink
contextBridge.exposeInMainWorld('electronTRPC', {
  invoke: (procedurePath: string, args?: unknown) => 
    ipcRenderer.invoke('electron-trpc', { procedurePath, args }),
  subscribe: (
    procedurePath: string,
    args: unknown,
    onData: (data: unknown) => void,
    onError: (error: unknown) => void
  ) => {
    const subscriptionId = Math.random().toString(36).substring(7);
    
    // Send subscription request
    ipcRenderer.send('electron-trpc-subscription', {
      type: 'start',
      subscriptionId,
      procedurePath,
      args,
    });
    
    // Listen for subscription updates
    const dataHandler = (_: any, message: any) => {
      if (message.subscriptionId === subscriptionId) {
        if (message.type === 'data') {
          onData(message.data);
        } else if (message.type === 'error') {
          onError(message.error);
        }
      }
    };
    
    ipcRenderer.on('electron-trpc-subscription-data', dataHandler);
    
    // Return unsubscribe function
    return () => {
      ipcRenderer.send('electron-trpc-subscription', {
        type: 'stop',
        subscriptionId,
      });
      ipcRenderer.removeListener('electron-trpc-subscription-data', dataHandler);
    };
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