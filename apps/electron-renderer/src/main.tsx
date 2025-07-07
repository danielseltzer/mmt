import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createIPCLink } from './api/ipc-link';
import { trpcReact } from './api/trpc';
import { App } from './App';
import './index.css';
import './api/window'; // Set up window.api for tests

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

// Wrap the app with providers
function AppWithProviders() {
  // Create tRPC client inside React component to avoid hooks error
  const trpcClient = useMemo(
    () => (trpcReact as any).createClient({
      links: [createIPCLink()],
    }),
    []
  );

  const TRPCProvider = (trpcReact as any).Provider;

  return (
    <TRPCProvider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </TRPCProvider>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <AppWithProviders />
  </React.StrictMode>
);