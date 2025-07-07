import { TRPCLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import { observable } from '@trpc/server/observable';

// Custom IPC link that safely handles window.electronTRPC availability
export function createIPCLink(): TRPCLink<AnyRouter> {
  return () => {
    return ({ op }) => {
      return observable((observer: any) => {
        // Check if electronTRPC is available
        if (typeof window === 'undefined' || !(window as any).electronTRPC) {
          observer.error(new Error('electronTRPC is not available on window'));
          return;
        }

        const electronTRPC = (window as any).electronTRPC;
        
        // Generate a unique request ID
        const id = Math.random().toString(36).substring(2);

        // Set up the response handler
        const handleMessage = (message: any) => {
          if (message.id === id) {
            if (message.error) {
              observer.error(message.error);
            } else {
              observer.next({
                result: {
                  type: 'data',
                  data: message.result,
                },
              });
              observer.complete();
            }
          }
        };

        // Listen for the response
        electronTRPC.onMessage(handleMessage);

        // Send the request
        electronTRPC.sendMessage({
          id,
          type: op.type,
          input: op.input,
          path: op.path,
        });

        // Return unsubscribe function
        return () => {
          // Clean up if needed
        };
      });
    };
  };
}