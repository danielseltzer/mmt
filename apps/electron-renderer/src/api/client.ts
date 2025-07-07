import { createTRPCProxyClient } from '@trpc/client';
import { createIPCLink } from './ipc-link';

// TODO: Fix type import from @mmt/electron-main
// import type { AppRouter } from '@mmt/electron-main';

// Create tRPC proxy client for use outside of React components (e.g., in Zustand stores)
export const api: any = createTRPCProxyClient<any>({
  links: [createIPCLink()],
});

// Export for use in stores and non-React contexts
export default api;