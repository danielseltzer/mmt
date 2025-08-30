import { useEffect, useState, useCallback } from 'react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Database,
  FileSearch,
  Wifi,
  WifiOff
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loggers } from '@mmt/logger';

const logger = Loggers.web();

interface VaultIndexStatus {
  status: 'ready' | 'indexing' | 'not_indexed' | 'error' | 'initializing';
  documentCount: number;
  totalDocuments?: number;
  lastIndexed?: string;
  indexProgress?: number;
  error?: string;
  similarityStatus?: {
    available: boolean;
    status: string;
    ollamaConnected?: boolean;
  };
}

interface VaultStatusIndicatorProps {
  vaultId: string;
  vaultName?: string;
  className?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function VaultStatusIndicator({
  vaultId,
  vaultName,
  className,
  showDetails = true,
  compact = false
}: VaultStatusIndicatorProps) {
  const [status, setStatus] = useState<VaultIndexStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Fetch initial status
  const fetchStatus = useCallback(async () => {
    if (!vaultId) return;
    
    try {
      const response = await fetch(`/api/vaults/${vaultId}/index/status`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Try basic vault status endpoint
          const vaultResponse = await fetch(`/api/vaults/${vaultId}/status`);
          if (vaultResponse.ok) {
            const vaultData = await vaultResponse.json();
            setStatus({
              status: vaultData.status === 'ready' ? 'ready' : 
                      vaultData.status === 'error' ? 'error' : 'initializing',
              documentCount: 0,
              lastIndexed: vaultData.timestamp,
              error: vaultData.error
            });
          } else {
            const errorText = await vaultResponse.text();
            console.error(`Failed to fetch vault status for '${vaultId}':`, errorText);
            throw new Error(`Vault status check failed: ${vaultResponse.status}`);
          }
        } else {
          const errorText = await response.text();
          console.error(`Failed to fetch index status for '${vaultId}':`, errorText);
          throw new Error(`Index status check failed: ${response.status}`);
        }
        return;
      }
      
      const data = await response.json();
      // Ensure we have valid status data before setting
      if (data && typeof data.status === 'string') {
        setStatus(data);
      } else {
        console.error(`Invalid status data received for vault '${vaultId}':`, data);
        // Set a default status to prevent infinite loading
        setStatus({
          status: 'initializing',
          documentCount: 0,
          error: 'Invalid status response from server'
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Failed to fetch vault status for '${vaultId}':`, error);
      logger.error('Failed to fetch vault status:', error);
      setStatus({
        status: 'error',
        documentCount: 0,
        error: errorMsg
      });
    }
  }, [vaultId]);

  // Set up SSE for real-time updates
  useEffect(() => {
    if (!vaultId) return;

    // Initial fetch with timeout to prevent hanging
    const timeoutId = setTimeout(() => {
      if (!status) {
        console.warn(`Status fetch timeout for vault '${vaultId}', setting error state`);
        setStatus({
          status: 'error',
          documentCount: 0,
          error: 'Status fetch timeout'
        });
      }
    }, 5000); // 5 second timeout
    
    fetchStatus().finally(() => {
      clearTimeout(timeoutId);
    });

    // Set up SSE connection for real-time updates
    const setupSSE = () => {
      try {
        const es = new EventSource(`/api/vaults/${vaultId}/index/events`);
        
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'status-changed' || data.event === 'index-update') {
              // Validate data before setting
              if (data.data && typeof data.data.status === 'string') {
                setStatus(data.data);
              }
            }
          } catch (err) {
            logger.error('Failed to parse SSE message:', err);
          }
        };

        es.onerror = (err) => {
          console.warn(`SSE connection error for vault '${vaultId}', will retry in 5 seconds`);
          logger.error('SSE connection error:', err);
          es.close();
          // Retry after 5 seconds
          setTimeout(setupSSE, 5000);
        };

        setEventSource(es);
      } catch (err) {
        logger.error('Failed to set up SSE:', err);
      }
    };

    // Only set up SSE if endpoint exists (may not be available yet)
    let cleanupInterval: NodeJS.Timeout | undefined;
    fetch(`/api/vaults/${vaultId}/index/events`, { method: 'HEAD' })
      .then(res => {
        if (res.ok || res.status === 405) { // 405 means endpoint exists but HEAD not allowed
          setupSSE();
        }
      })
      .catch((err) => {
        // SSE not available, fall back to polling
        console.log(`SSE not available for vault '${vaultId}', falling back to polling`);
        cleanupInterval = setInterval(fetchStatus, 10000); // Poll every 10 seconds
      });

    return () => {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      if (cleanupInterval) {
        clearInterval(cleanupInterval);
      }
    };
  }, [vaultId, fetchStatus]);

  const handleReindex = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/vaults/${vaultId}/index/refresh`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to trigger re-index for vault '${vaultId}':`, errorText);
        throw new Error(`Failed to trigger re-index: ${errorText}`);
      }
      
      // Refresh status
      await fetchStatus();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to re-index vault:', error);
      logger.error('Failed to re-index vault:', error);
      alert(`Failed to re-index vault: ${errorMsg}`);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  if (!status) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading status...</span>
      </div>
    );
  }

  // Compact mode for tab bar
  if (compact) {
    const getCompactStatus = () => {
      switch (status.status) {
        case 'ready':
          return (
            <>
              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span className="text-xs text-muted-foreground">
                {status.documentCount.toLocaleString()}
              </span>
            </>
          );
        case 'indexing':
          return (
            <>
              <Loader2 className="h-3 w-3 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-xs text-muted-foreground">
                {status.indexProgress}%
              </span>
            </>
          );
        case 'not_indexed':
          return <AlertCircle className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />;
        case 'error':
          return <AlertTriangle className="h-3 w-3 text-destructive" />;
        default:
          return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
      }
    };

    return (
      <div className={cn("flex items-center gap-1", className)}>
        {getCompactStatus()}
      </div>
    );
  }

  // Full status display
  const getStatusIcon = () => {
    switch (status.status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'indexing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />;
      case 'not_indexed':
        return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'initializing':
        return <Clock className="h-4 w-4 text-muted-foreground animate-pulse" />;
      default:
        return <Database className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusMessage = () => {
    switch (status.status) {
      case 'ready':
        return `Indexed (${status.documentCount.toLocaleString()} documents)`;
      case 'indexing':
        return `Indexing... ${status.indexProgress || 0}%`;
      case 'not_indexed':
        return 'Not indexed';
      case 'error':
        return status.error || 'Unknown error';
      case 'initializing':
        return 'Initializing...';
      default:
        return 'Unknown status';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'ready':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30';
      case 'indexing':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30';
      case 'not_indexed':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30';
      case 'error':
        return 'text-destructive bg-destructive/10';
      case 'initializing':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <div className={cn("space-y-2", className)} data-testid="vault-status-container">
      {/* Main status */}
      <div className={cn(
        "flex items-center justify-between gap-2 px-3 py-2 rounded-md",
        getStatusColor()
      )}>
        <div className="flex items-center gap-2 flex-1">
          <span data-testid="vault-status-icon">
            {getStatusIcon()}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" data-testid="vault-status-text">
                {vaultName || vaultId}
              </span>
              {status.lastIndexed && (
                <span className="text-xs text-muted-foreground">
                  Updated {formatTimeAgo(status.lastIndexed)}
                </span>
              )}
            </div>
            <span className="text-xs">
              {getStatusMessage()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Similarity status badge */}
          {status.similarityStatus && (
            <Badge 
              variant={status.similarityStatus.available ? "default" : "secondary"}
              className="text-xs"
            >
              <FileSearch className="h-3 w-3 mr-1" />
              {status.similarityStatus.available ? 'AI' : 'No AI'}
            </Badge>
          )}

          {/* Ollama connection indicator */}
          {status.similarityStatus?.ollamaConnected !== undefined && (
            <div 
              className={cn(
                "p-1",
                status.similarityStatus.ollamaConnected 
                  ? "text-green-600 dark:text-green-400" 
                  : "text-muted-foreground"
              )}
              title={status.similarityStatus.ollamaConnected ? "Ollama connected" : "Ollama offline"}
            >
              {status.similarityStatus.ollamaConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
            </div>
          )}

          {/* Re-index button */}
          {status.status === 'ready' || status.status === 'not_indexed' || status.status === 'error' ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={handleReindex}
              disabled={isRefreshing}
              title="Re-index vault"
              data-testid="vault-reindex-button"
            >
              {isRefreshing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
            </Button>
          ) : null}
        </div>
      </div>

      {/* Progress bar for indexing */}
      {status.status === 'indexing' && status.indexProgress !== undefined && (
        <div className="px-3 space-y-1">
          <Progress value={status.indexProgress} className="h-2" />
          {status.totalDocuments && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {Math.floor((status.indexProgress / 100) * status.totalDocuments).toLocaleString()}/{status.totalDocuments.toLocaleString()} documents
              </span>
              <span>{status.indexProgress}%</span>
            </div>
          )}
        </div>
      )}

      {/* Detailed info (if enabled) */}
      {showDetails && status.status === 'ready' && (
        <div className="px-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            <span>{status.documentCount.toLocaleString()} documents</span>
          </div>
          {status.lastIndexed && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Updated {formatTimeAgo(status.lastIndexed)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}