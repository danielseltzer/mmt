import { createTRPCReact } from '@trpc/react-query';
import type { AnyRouter } from '@trpc/server';

// TODO: Fix type import from @mmt/electron-main
// import type { AppRouter } from '@mmt/electron-main';

// Create tRPC React instance with AnyRouter type for now
// This will be replaced once we can import from @mmt/electron-main
export const trpcReact = createTRPCReact<AnyRouter>();

// Export for use in components
export default trpcReact;