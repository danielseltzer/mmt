import { useState, useEffect } from 'react';

export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // TODO: Monitor tRPC connection status
    // For now, always return connected
    setIsConnected(true);
  }, []);

  return isConnected;
}