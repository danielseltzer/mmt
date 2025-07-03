import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
import type { AppRouter } from '@mmt/electron-main';

// Create tRPC client
export const api = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
});

// Export for use in components
export default api;