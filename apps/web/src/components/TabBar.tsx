import { useEffect } from 'react';
import { useDocumentStore } from '@/stores/document-store';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { X, Plus, Loader2 } from 'lucide-react';

export function TabBar() {
  const {
    tabs,
    activeTabId,
    vaults,
    isLoadingVaults,
    createTab,
    switchTab,
    closeTab,
    loadVaults,
  } = useDocumentStore();

  // Load vaults on mount
  useEffect(() => {
    loadVaults();
  }, [loadVaults]);

  // Don't show tab bar if no vaults available
  if (!vaults || vaults.length === 0) {
    if (isLoadingVaults) {
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-2 py-1">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading vaults...
        </div>
      );
    }
    return null;
  }

  // If single vault and no tabs, hide tab bar
  if (vaults.length === 1 && tabs.length <= 1) {
    return null;
  }

  const handleNewTab = () => {
    // Find first ready vault that doesn't have a tab open
    const openVaultIds = new Set(tabs.map(t => t.vaultId));
    const availableVault = vaults.find(v => 
      v.status === 'ready' && !openVaultIds.has(v.id)
    ) || vaults.find(v => v.status === 'ready');
    
    if (availableVault) {
      createTab(availableVault.id);
    }
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent tab switch when closing
    
    // Don't close if it's the only tab
    if (tabs.length > 1) {
      closeTab(tabId);
    }
  };

  return (
    <div className="flex items-center gap-1 border-b px-2 py-1 bg-background">
      {/* Tab list */}
      <div className="flex items-center gap-1 flex-1 overflow-x-auto">
        {tabs.map((tab) => {
          const vault = vaults.find(v => v.id === tab.vaultId);
          const isActive = tab.tabId === activeTabId;
          
          return (
            <div
              key={tab.tabId}
              className={cn(
                "group flex items-center gap-2 px-3 py-1.5 rounded-t-md cursor-pointer transition-colors",
                "border border-b-0 min-w-[120px] max-w-[200px]",
                isActive 
                  ? "bg-background border-border" 
                  : "bg-muted/30 border-transparent hover:bg-muted/50"
              )}
              onClick={() => switchTab(tab.tabId)}
            >
              {/* Tab content */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {vault?.status === 'initializing' && (
                  <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                )}
                <span className={cn(
                  "text-sm truncate",
                  isActive ? "font-medium" : ""
                )}>
                  {tab.tabName}
                </span>
                {vault?.status === 'error' && (
                  <span className="text-xs text-destructive">(Error)</span>
                )}
              </div>
              
              {/* Close button - only show if more than one tab */}
              {tabs.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                    isActive && "opacity-50 hover:opacity-100"
                  )}
                  onClick={(e) => handleCloseTab(tab.tabId, e)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Add new tab button - only show if there are vaults without tabs */}
      {vaults.some(v => v.status === 'ready') && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleNewTab}
          title="Open new vault tab"
        >
          <Plus className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}