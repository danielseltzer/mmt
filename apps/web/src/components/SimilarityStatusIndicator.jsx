import { useEffect, useState } from 'react';
import { useDocumentStore, useCurrentTab } from '../stores/document-store';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SimilarityStatusIndicator() {
  const currentTab = useCurrentTab();
  const searchMode = currentTab?.searchMode || 'text';
  const vaultId = currentTab?.vaultId;
  
  const [status, setStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  
  // Only poll when in similarity mode
  useEffect(() => {
    if (searchMode !== 'similarity' || !vaultId) {
      setIsPolling(false);
      return;
    }
    
    setIsPolling(true);
    
    // Fetch status immediately
    fetchStatus();
    
    // Set up polling interval (every 5 seconds)
    const interval = setInterval(fetchStatus, 5000);
    
    return () => {
      clearInterval(interval);
      setIsPolling(false);
    };
  }, [searchMode, vaultId]);
  
  const fetchStatus = async () => {
    if (!vaultId) return;
    
    try {
      const response = await fetch(`/api/vaults/${vaultId}/similarity/status`);
      
      if (!response.ok) {
        if (response.status === 404 || response.status === 501) {
          setStatus({
            status: 'not_configured',
            totalDocuments: 0,
            indexedDocuments: 0,
            percentComplete: 0,
            estimatedTimeRemaining: null
          });
        } else {
          throw new Error(`Status check failed: ${response.status}`);
        }
        return;
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch similarity status:', error);
      setStatus({
        status: 'error',
        error: error.message,
        totalDocuments: 0,
        indexedDocuments: 0,
        percentComplete: 0,
        estimatedTimeRemaining: null
      });
    }
  };
  
  // Don't show anything if not in similarity mode
  if (searchMode !== 'similarity' || !status) {
    return null;
  }
  
  // Render based on status
  if (status.status === 'not_configured') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md">
        <AlertCircle className="h-4 w-4" />
        <span>Similarity search not configured</span>
      </div>
    );
  }
  
  if (status.status === 'error') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-destructive bg-destructive/10 rounded-md">
        <AlertTriangle className="h-4 w-4" />
        <span>Error: {status.error || 'Unknown error'}</span>
      </div>
    );
  }
  
  if (status.status === 'ready') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-md">
        <CheckCircle className="h-4 w-4" />
        <span>✓ Similarity search ready ({status.totalDocuments.toLocaleString()} documents indexed)</span>
      </div>
    );
  }
  
  if (status.status === 'indexing') {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-md">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-pulse" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Building similarity index...
              </span>
              <span className="text-muted-foreground">
                {status.percentComplete}%
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Progress 
                value={status.percentComplete} 
                className="h-2"
              />
            </div>
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {status.indexedDocuments.toLocaleString()}/{status.totalDocuments.toLocaleString()} documents
              </span>
              {status.estimatedTimeRemaining && (
                <span>
                  ~{status.estimatedTimeRemaining} remaining
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return null;
}

// Component to show warning below search box when indexing
export function SimilarityIndexingWarning() {
  const currentTab = useCurrentTab();
  const searchMode = currentTab?.searchMode || 'text';
  const vaultId = currentTab?.vaultId;
  
  const [status, setStatus] = useState(null);
  
  useEffect(() => {
    if (searchMode !== 'similarity' || !vaultId) {
      setStatus(null);
      return;
    }
    
    // Fetch status immediately
    fetchStatus();
    
    // Set up polling interval (every 5 seconds)
    const interval = setInterval(fetchStatus, 5000);
    
    return () => clearInterval(interval);
  }, [searchMode, vaultId]);
  
  const fetchStatus = async () => {
    if (!vaultId) return;
    
    try {
      const response = await fetch(`/api/vaults/${vaultId}/similarity/status`);
      
      if (!response.ok) {
        setStatus(null);
        return;
      }
      
      const data = await response.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch similarity status:', error);
      setStatus(null);
    }
  };
  
  // Only show warning if in similarity mode and indexing
  if (searchMode !== 'similarity' || !status || status.status !== 'indexing') {
    return null;
  }
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 rounded-md">
      <AlertTriangle className="h-3 w-3" />
      <span>
        ⚠️ Index building in progress - results may be incomplete ({status.percentComplete}% indexed)
      </span>
    </div>
  );
}