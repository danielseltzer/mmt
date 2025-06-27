import { createTRPCProxyClient } from '@trpc/client';
import { ipcLink } from 'electron-trpc/renderer';
// TODO: Export AppRouter type from @mmt/electron-main package.json
// For now, we'll use any
type AppRouter = any;

// Create tRPC client
export const api = createTRPCProxyClient<AppRouter>({
  links: [ipcLink()],
});

// Export for use in components
export default api;