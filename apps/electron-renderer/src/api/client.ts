import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';

// TODO: Fix type import from @mmt/electron-main
// import type { AppRouter } from '@mmt/electron-main';

// Create tRPC client
export const api: any = createTRPCProxyClient<any>({
  links: [ipcLink()],
});

// Export for use in components
export default api;